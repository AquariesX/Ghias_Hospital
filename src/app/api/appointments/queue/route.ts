import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAppointmentAccess } from "@/lib/appointment-auth";
import { AppointmentStatus } from "@prisma/client";

// Emergency priority sorting rank: Lower number = higher priority
const EMERGENCY_RANK: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  URGENT: 3,
  NORMAL: 4,
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAppointmentAccess(request);
    const { searchParams } = request.nextUrl;

    let doctorId = searchParams.get("doctorId");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD or today

    // If caller is DOCTOR and did not supply doctorId, default to their own doctor profile
    if (!doctorId && user.role === "DOCTOR" && user.doctorProfile) {
      doctorId = user.doctorProfile.id;
    }

    // Determine target date
    let targetDate = new Date();
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    } else {
      targetDate.setHours(0, 0, 0, 0);
    }

    const where: Record<string, unknown> = {
      appointmentDate: targetDate,
    };

    if (doctorId) {
      where.doctorId = doctorId;
    }

    const [appointments, doctor, allDoctors] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              mrNumber: true,
              firstName: true,
              lastName: true,
              cnic: true,
              phone: true,
              gender: true,
              dateOfBirth: true,
              bloodGroup: true,
              allergies: true,
            },
          },
          doctor: {
            select: {
              id: true,
              doctorNumber: true,
              firstName: true,
              lastName: true,
              specialization: true,
              roomNumber: true,
              consultationFee: true,
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
      }),
      doctorId
        ? prisma.doctor.findUnique({
            where: { id: doctorId },
            include: { department: true },
          })
        : null,
      prisma.doctor.findMany({
        where: { status: "ACTIVE" },
        include: { department: true },
        orderBy: { firstName: "asc" },
      }),
    ]);

    // Group into categories
    const inConsultation = appointments.filter(
      (apt) => apt.status === AppointmentStatus.IN_CONSULTATION
    );

    const waitingRaw = appointments.filter(
      (apt) =>
        apt.status === AppointmentStatus.WAITING ||
        apt.status === AppointmentStatus.SCHEDULED ||
        apt.status === AppointmentStatus.CONFIRMED
    );

    const completed = appointments.filter(
      (apt) =>
        apt.status === AppointmentStatus.COMPLETED ||
        apt.status === AppointmentStatus.CANCELLED ||
        apt.status === AppointmentStatus.NO_SHOW
    );

    // Sort waiting queue according to clinical workflow:
    // 1. Emergency appointments prioritized at top (by EmergencyPriority rank, then createdAt asc)
    // 2. Regular and Follow-up appointments sorted by appointmentTime asc, then createdAt asc
    const sortedWaiting = [...waitingRaw].sort((a, b) => {
      // If one is emergency and one is not
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;

      // Both are emergency: sort by emergency priority rank
      if (a.isEmergency && b.isEmergency) {
        const rankA = a.emergencyPriority ? EMERGENCY_RANK[a.emergencyPriority] || 99 : 99;
        const rankB = b.emergencyPriority ? EMERGENCY_RANK[b.emergencyPriority] || 99 : 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.createdAt.getTime() - b.createdAt.getTime();
      }

      // Both are regular/follow-up: sort by appointmentTime, then createdAt
      if (a.appointmentTime < b.appointmentTime) return -1;
      if (a.appointmentTime > b.appointmentTime) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Assign calculated dynamic queue position (1, 2, 3...)
    const queueWithPositions = sortedWaiting.map((apt, index) => ({
      ...apt,
      queuePosition: index + 1,
    }));

    const stats = {
      totalToday: appointments.length,
      waitingCount: waitingRaw.length,
      inConsultationCount: inConsultation.length,
      completedCount: completed.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
      emergencyCount: appointments.filter((a) => a.isEmergency).length,
    };

    return NextResponse.json({
      selectedDoctor: doctor,
      doctorsList: allDoctors,
      date: targetDate.toISOString().split("T")[0],
      stats,
      inConsultation,
      waitingQueue: queueWithPositions,
      completedAppointments: completed,
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error fetching doctor queue:", err);
    return NextResponse.json(
      { error: "Failed to load doctor queue" },
      { status: 500 }
    );
  }
}
