import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";

const createRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room Number is required").max(50),
  name: z.string().max(100).optional().nullable(),
  department: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { roomNumber: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    if (department) {
      where.department = department;
    }
    if (status === "ACTIVE") {
      where.isActive = true;
    } else if (status === "INACTIVE") {
      where.isActive = false;
    }

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { roomNumber: "asc" },
      include: {
        beds: {
          orderBy: { bedNumber: "asc" },
          include: {
            admissions: {
              where: {
                status: {
                  in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"],
                },
              },
              select: {
                id: true,
                admissionNumber: true,
                patient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    mrNumber: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("GET /api/admin/rooms error:", error);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid room data" },
        { status: 400 }
      );
    }

    const { roomNumber, name, department, isActive } = parsed.data;

    const existing = await prisma.room.findUnique({
      where: { roomNumber: roomNumber.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Room "${roomNumber.trim()}" already exists` },
        { status: 409 }
      );
    }

    const room = await prisma.room.create({
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
      action: "CREATE_ROOM",
      entity: "Room",
      entityId: room.id,
      newValue: JSON.stringify({ roomNumber: room.roomNumber, name: room.name }),
    });

    return NextResponse.json(
      { success: true, message: "Room created successfully", room },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("POST /api/admin/rooms error:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
