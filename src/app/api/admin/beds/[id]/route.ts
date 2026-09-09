import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";
import { BedStatus } from "@prisma/client";

const updateBedSchema = z.object({
  bedNumber: z.string().min(1, "Bed Number is required").max(50),
  notes: z.string().max(200).optional().nullable(),
  isActive: z.boolean(),
  status: z.nativeEnum(BedStatus),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateBedSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid bed data" },
        { status: 400 }
      );
    }

    const { bedNumber, notes, isActive, status } = parsed.data;

    const existing = await prisma.bed.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Bed not found" }, { status: 404 });
    }

    // Check duplicate bed in the same room
    if (bedNumber.trim() !== existing.bedNumber) {
      const conflict = await prisma.bed.findFirst({
        where: {
          roomId: existing.roomId,
          bedNumber: bedNumber.trim(),
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Bed "${bedNumber.trim()}" already exists in Room ${existing.room.roomNumber}` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.bed.update({
      where: { id },
      data: {
        bedNumber: bedNumber.trim(),
        notes: notes?.trim() || null,
        isActive,
        status,
      },
      include: {
        room: true,
      },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "UPDATE_BED",
      entity: "Bed",
      entityId: updated.id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return NextResponse.json({
      success: true,
      message: "Bed updated successfully",
      bed: updated,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("PUT /api/admin/beds/[id] error:", error);
    return NextResponse.json({ error: "Failed to update bed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    const bed = await prisma.bed.findUnique({
      where: { id },
      include: {
        admissions: {
          where: {
            status: {
              in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"],
            },
          },
        },
        room: true,
      },
    });

    if (!bed) {
      return NextResponse.json({ error: "Bed not found" }, { status: 404 });
    }

    if (bed.admissions.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete bed because it currently has an active patient admission." },
        { status: 400 }
      );
    }

    await prisma.bed.delete({
      where: { id },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "DELETE_BED",
      entity: "Bed",
      entityId: id,
      oldValue: JSON.stringify({
        roomNumber: bed.room.roomNumber,
        bedNumber: bed.bedNumber,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Bed deleted successfully",
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("DELETE /api/admin/beds/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete bed" }, { status: 500 });
  }
}
