import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";

const updateRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room Number is required").max(50),
  name: z.string().max(100).optional().nullable(),
  department: z.string().max(50).optional().nullable(),
  isActive: z.boolean(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid room data" },
        { status: 400 }
      );
    }

    const { roomNumber, name, department, isActive } = parsed.data;

    const existing = await prisma.room.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check unique roomNumber conflict
    if (roomNumber.trim() !== existing.roomNumber) {
      const conflict = await prisma.room.findUnique({
        where: { roomNumber: roomNumber.trim() },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Room "${roomNumber.trim()}" already exists` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.room.update({
      where: { id },
      data: {
        roomNumber: roomNumber.trim(),
        name: name?.trim() || null,
        department: department?.trim() || null,
        isActive,
      },
      include: {
        beds: true,
      },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "UPDATE_ROOM",
      entity: "Room",
      entityId: updated.id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return NextResponse.json({
      success: true,
      message: "Room updated successfully",
      room: updated,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("PUT /api/admin/rooms/[id] error:", error);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        beds: {
          include: {
            admissions: {
              where: {
                status: {
                  in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"],
                },
              },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const hasActivePatients = room.beds.some((b) => b.admissions.length > 0);
    if (hasActivePatients) {
      return NextResponse.json(
        { error: "Cannot delete room because it has beds with currently active patients." },
        { status: 400 }
      );
    }

    await prisma.room.delete({
      where: { id },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "DELETE_ROOM",
      entity: "Room",
      entityId: id,
      oldValue: JSON.stringify({ roomNumber: room.roomNumber, name: room.name }),
    });

    return NextResponse.json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("DELETE /api/admin/rooms/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}
