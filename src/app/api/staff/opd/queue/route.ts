import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staff-auth";
import { AppointmentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Strictly require OPD department access and nurse role
    await requireStaffAuth(request, {
      requiredDepartment: "OPD",
      requireNurse: true,
    });

    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search") || "";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      appointmentDate: { gte: todayStart, lte: todayEnd },
      isEmergency: false,
    };

    if (statusParam && Object.values(AppointmentStatus).includes(statusParam as AppointmentStatus)) {
      where.status = statusParam;
    }

    if (searchParam) {
      where.OR = [
        { patient: { firstName: { contains: searchParam, mode: "insensitive" } } },
        { patient: { lastName: { contains: searchParam, mode: "insensitive" } } },
        { patient: { mrNumber: { contains: searchParam, mode: "insensitive" } } },
        { patient: { patientNumber: { contains: searchParam, mode: "insensitive" } } },
        { appointmentNumber: { contains: searchParam, mode: "insensitive" } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ status: "asc" }, { appointmentTime: "asc" }],
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
            phone: true,
            bloodGroup: true,
            allergies: true,
            chronicConditions: true,
            vitalSigns: {
              orderBy: { recordedAt: "desc" },
              take: 1,
            },
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
            roomNumber: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in GET /api/staff/opd/queue:", error);
    return NextResponse.json(
      { error: "Failed to retrieve OPD nursing queue" },
      { status: 500 }
    );
  }
}
