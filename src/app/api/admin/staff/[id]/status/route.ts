import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "ON_LEAVE", "SHIFT_OFF", "INACTIVE"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

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

    const updated = await prisma.staff.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "UPDATE_STAFF_STATUS",
      entity: "Staff",
      entityId: id,
      oldValue: JSON.stringify({ status: existing.status }),
      newValue: JSON.stringify({ status: updated.status }),
    });

    return NextResponse.json({ data: { id: updated.id, status: updated.status } });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
