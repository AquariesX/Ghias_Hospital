import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDoctorAuth } from "@/lib/doctor-auth";
import { AppointmentStatus, Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { doctor } = await requireDoctorAuth(request);
    const { searchParams } = request.nextUrl;

    const tab = searchParams.get("tab") || "today";
    const search = searchParams.get("search")?.trim() || "";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const where: Prisma.AppointmentWhereInput = {
      doctorId: doctor.id,
    };

    switch (tab) {
      case "today":
        where.appointmentDate = {
          gte: todayStart,
          lte: todayEnd,
        };
        break;
      case "upcoming":
        where.appointmentDate = {
          gte: todayStart,
        };
        where.status = {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.WAITING],
        };
        break;
      case "completed":
        where.status = AppointmentStatus.COMPLETED;
        break;
      case "cancelled":
        where.status = AppointmentStatus.CANCELLED;
        break;
      case "no_show":
        where.status = AppointmentStatus.NO_SHOW;
        break;
      case "all":
      default:
        // No additional filter
        break;
    }

    if (search) {
      where.OR = [
        { appointmentNumber: { contains: search, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { patientNumber: { contains: search, mode: "insensitive" } },
              { mrNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "asc" }],
      take: 100,
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            mrNumber: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            bloodGroup: true,
            phone: true,
            allergies: true,
          },
        },
        consultation: {
          select: {
            id: true,
            consultationNumber: true,
            status: true,
            consultationDate: true,
          },
        },
      },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error loading doctor appointments:", error);
    return NextResponse.json(
      { error: "Internal Server Error loading appointments" },
      { status: 500 }
    );
  }
}
