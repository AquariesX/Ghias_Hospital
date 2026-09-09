import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
      },
      orderBy: { roomNumber: "asc" },
      include: {
        beds: {
          where: {
            isActive: true,
          },
          orderBy: { bedNumber: "asc" },
          select: {
            id: true,
            bedNumber: true,
            status: true,
            isActive: true,
            notes: true,
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

    // Format response with quick stats
    const formattedRooms = rooms.map((r) => {
      const totalBeds = r.beds.length;
      const freeBeds = r.beds.filter((b) => b.status === "FREE").length;
      const scheduledBeds = r.beds.filter((b) => b.status === "SCHEDULED").length;
      const occupiedBeds = r.beds.filter((b) => b.status === "OCCUPIED").length;

      return {
        id: r.id,
        roomNumber: r.roomNumber,
        name: r.name,
        department: r.department,
        totalBeds,
        freeBeds,
        scheduledBeds,
        occupiedBeds,
        beds: r.beds.map((b) => ({
          id: b.id,
          bedNumber: b.bedNumber,
          status: b.status,
          isAvailable: b.status === "FREE",
          notes: b.notes,
          currentPatient: b.admissions[0]
            ? `${b.admissions[0].patient.firstName} ${b.admissions[0].patient.lastName}`
            : null,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      rooms: formattedRooms,
    });
  } catch (error) {
    console.error("GET /api/rooms/available error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available rooms and beds" },
      { status: 500 }
    );
  }
}
