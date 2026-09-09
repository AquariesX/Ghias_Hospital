import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";
import { BedStatus } from "@prisma/client";

const createBedSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  bedNumber: z.string().min(1, "Bed Number is required").max(50),
  notes: z.string().max(200).optional().nullable(),
  isActive: z.boolean().default(true),
  status: z.nativeEnum(BedStatus).default(BedStatus.FREE),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const parsed = createBedSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid bed data" },
        { status: 400 }
      );
    }

    const { roomId, bedNumber, notes, isActive, status } = parsed.data;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check duplicate bed in the same room
    const existing = await prisma.bed.findFirst({
      where: {
        roomId,
        bedNumber: bedNumber.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Bed "${bedNumber.trim()}" already exists in Room ${room.roomNumber}` },
        { status: 409 }
      );
    }

    const bed = await prisma.bed.create({
      data: {
        roomId,
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
      action: "CREATE_BED",
      entity: "Bed",
      entityId: bed.id,
      newValue: JSON.stringify({
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
        status: bed.status,
      }),
    });

    return NextResponse.json(
      { success: true, message: "Bed created successfully", bed },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("POST /api/admin/beds error:", error);
    return NextResponse.json({ error: "Failed to create bed" }, { status: 500 });
  }
}
