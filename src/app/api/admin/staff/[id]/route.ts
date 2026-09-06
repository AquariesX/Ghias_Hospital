import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";

const updateStaffSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum([
    "HEAD_NURSE", "STAFF_NURSE", "RECEPTIONIST", "LAB_TECHNICIAN",
    "RADIOLOGY_TECHNICIAN", "PHARMACIST", "SUPPORT_STAFF", "ACCOUNTANT", "ADMINISTRATOR",
  ]).optional(),
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  qualification: z.string().optional().nullable(),
  shift: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SHIFT_OFF", "INACTIVE"]).optional(),
  nurseDepartment: z.enum(["OPD", "EMERGENCY"]).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        department: true,
        user: { select: { id: true, email: true, username: true } },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ data: staff });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (parsed.data.email && parsed.data.email !== existing.email) {
      const conflict = await prisma.staff.findUnique({ where: { email: parsed.data.email } });
      if (conflict) {
        return NextResponse.json({ error: "A staff member with this email already exists" }, { status: 409 });
      }
    }

    const isNurse =
      (parsed.data.role ?? existing.role) === "HEAD_NURSE" ||
      (parsed.data.role ?? existing.role) === "STAFF_NURSE";

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...parsed.data,
        nurseDepartment: isNurse ? (parsed.data.nurseDepartment ?? existing.nurseDepartment) : null,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "UPDATE_STAFF",
      entity: "Staff",
      entityId: id,
      oldValue: JSON.stringify({ name: `${existing.firstName} ${existing.lastName}`, status: existing.status }),
      newValue: JSON.stringify({ name: `${updated.firstName} ${updated.lastName}`, status: updated.status }),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("PUT /api/admin/staff/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
