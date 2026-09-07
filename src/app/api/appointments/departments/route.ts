import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAppointmentAccess } from "@/lib/appointment-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAppointmentAccess(request);

    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        doctors: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            doctorNumber: true,
            firstName: true,
            lastName: true,
            specialization: true,
            roomNumber: true,
            consultationFee: true,
            availability: true,
            status: true,
          },
          orderBy: { firstName: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ departments });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error fetching appointment departments:", err);
    return NextResponse.json(
      { error: "Failed to load clinical departments" },
      { status: 500 }
    );
  }
}
