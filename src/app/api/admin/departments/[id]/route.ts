import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";

const updateDepartmentSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9_]+$/)
    .optional(),
  name: z.string().min(2).max(150).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { doctors: true, staffMembers: true } },
      },
    });

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json({ data: department });
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
    const parsed = updateDepartmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Uniqueness checks
    if (parsed.data.code && parsed.data.code !== existing.code) {
      const conflict = await prisma.department.findUnique({ where: { code: parsed.data.code } });
      if (conflict) return NextResponse.json({ error: "A department with this code already exists" }, { status: 409 });
    }
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const conflict = await prisma.department.findUnique({ where: { name: parsed.data.name } });
      if (conflict) return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "UPDATE_DEPARTMENT",
      entity: "Department",
      entityId: id,
      oldValue: JSON.stringify({ name: existing.name, status: existing.status }),
      newValue: JSON.stringify({ name: updated.name, status: updated.status }),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            doctors: true,
            appointments: true,
            staffMembers: true,
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    if (department._count.doctors > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department "${department.name}": ${department._count.doctors} doctor(s) are assigned to it. Please reassign or delete these doctors first.`,
        },
        { status: 400 }
      );
    }

    if (department._count.appointments > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department "${department.name}": ${department._count.appointments} appointment(s) are linked to it.`,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Unlink any staff assigned to this department
      await tx.staff.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      });

      // Delete department
      await tx.department.delete({
        where: { id },
      });

      await createAuditLog({
        userId: admin.id,
        userName: `${admin.firstName} ${admin.lastName}`,
        userRole: admin.role,
        action: "DELETE_DEPARTMENT",
        entity: "Department",
        entityId: id,
        oldValue: JSON.stringify({ name: department.name, code: department.code }),
      });
    });

    return NextResponse.json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("DELETE /api/admin/departments/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}

