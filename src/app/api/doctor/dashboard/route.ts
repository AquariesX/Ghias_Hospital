import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDoctorAuth } from "@/lib/doctor-auth";
import { AppointmentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { doctor } = await requireDoctorAuth(request);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const doctorTodayFilter = {
      doctorId: doctor.id,
      appointmentDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    };

    const [
      totalToday,
      waitingCount,
      inConsultationCount,
      completedCount,
      noShowCount,
      activeQueue,
    ] = await Promise.all([
      prisma.appointment.count({
        where: doctorTodayFilter,
      }),
      prisma.appointment.count({
        where: {
          ...doctorTodayFilter,
          status: { in: [AppointmentStatus.WAITING, AppointmentStatus.SCHEDULED] },
        },
      }),
      prisma.appointment.count({
        where: {
          ...doctorTodayFilter,
          status: AppointmentStatus.IN_CONSULTATION,
        },
      }),
      prisma.appointment.count({
        where: {
          ...doctorTodayFilter,
          status: AppointmentStatus.COMPLETED,
        },
      }),
      prisma.appointment.count({
        where: {
          ...doctorTodayFilter,
          status: AppointmentStatus.NO_SHOW,
        },
      }),
      prisma.appointment.findMany({
        where: doctorTodayFilter,
        orderBy: [{ isEmergency: "desc" }, { appointmentTime: "asc" }],
        take: 10,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              patientNumber: true,
              mrNumber: true,
              gender: true,
              phone: true,
              bloodGroup: true,
              allergies: true,
            },
          },
          consultation: {
            select: {
              id: true,
              consultationNumber: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      doctor: {
        id: doctor.id,
        doctorNumber: doctor.doctorNumber,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        specialization: doctor.specialization,
        roomNumber: doctor.roomNumber,
        consultationFee: doctor.consultationFee,
        department: doctor.department,
      },
      stats: {
        totalToday,
        waitingCount,
        inConsultationCount,
        completedCount,
        noShowCount,
      },
      activeQueue,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error loading doctor dashboard:", error);
    return NextResponse.json(
      { error: "Internal Server Error loading doctor clinical data" },
      { status: 500 }
    );
  }
}
