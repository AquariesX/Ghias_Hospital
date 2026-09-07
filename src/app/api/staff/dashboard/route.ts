import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staff-auth";

export async function GET(request: NextRequest) {
  try {
    const { staff } = await requireStaffAuth(request);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const isEmergency = staff.nurseDepartment === "EMERGENCY";

    if (isEmergency) {
      // Emergency Dashboard Metrics
      const [
        totalEmergencyAppointments,
        totalTriageToday,
        criticalCount,
        highCount,
        urgentCount,
        normalCount,
        recentEmergencyQueue,
      ] = await Promise.all([
        prisma.appointment.count({
          where: {
            appointmentDate: { gte: todayStart, lte: todayEnd },
            isEmergency: true,
          },
        }),
        prisma.emergencyTriage.count({
          where: {
            triagedAt: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.emergencyTriage.count({
          where: {
            triagedAt: { gte: todayStart, lte: todayEnd },
            priority: "CRITICAL",
          },
        }),
        prisma.emergencyTriage.count({
          where: {
            triagedAt: { gte: todayStart, lte: todayEnd },
            priority: "HIGH",
          },
        }),
        prisma.emergencyTriage.count({
          where: {
            triagedAt: { gte: todayStart, lte: todayEnd },
            priority: "URGENT",
          },
        }),
        prisma.emergencyTriage.count({
          where: {
            triagedAt: { gte: todayStart, lte: todayEnd },
            priority: "NORMAL",
          },
        }),
        prisma.emergencyTriage.findMany({
          where: {
            triagedAt: { gte: todayStart, lte: todayEnd },
          },
          orderBy: { triagedAt: "desc" },
          take: 8,
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
              },
            },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        department: "EMERGENCY",
        metrics: {
          totalCases: Math.max(totalEmergencyAppointments, totalTriageToday),
          critical: criticalCount,
          high: highCount,
          urgent: urgentCount,
          normal: normalCount,
        },
        queue: recentEmergencyQueue,
      });
    } else {
      // OPD Dashboard Metrics (Default for OPD Nurse or general)
      const [
        totalOpdPatients,
        waitingCount,
        inConsultationCount,
        completedCount,
        recentQueue,
      ] = await Promise.all([
        prisma.appointment.count({
          where: {
            appointmentDate: { gte: todayStart, lte: todayEnd },
            isEmergency: false,
          },
        }),
        prisma.appointment.count({
          where: {
            appointmentDate: { gte: todayStart, lte: todayEnd },
            status: "WAITING",
            isEmergency: false,
          },
        }),
        prisma.appointment.count({
          where: {
            appointmentDate: { gte: todayStart, lte: todayEnd },
            status: "IN_CONSULTATION",
            isEmergency: false,
          },
        }),
        prisma.appointment.count({
          where: {
            appointmentDate: { gte: todayStart, lte: todayEnd },
            status: "COMPLETED",
            isEmergency: false,
          },
        }),
        prisma.appointment.findMany({
          where: {
            appointmentDate: { gte: todayStart, lte: todayEnd },
            isEmergency: false,
          },
          orderBy: [{ appointmentTime: "asc" }, { createdAt: "asc" }],
          take: 8,
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
        }),
      ]);

      return NextResponse.json({
        success: true,
        department: "OPD",
        metrics: {
          totalPatients: totalOpdPatients,
          waiting: waitingCount,
          inConsultation: inConsultationCount,
          completed: completedCount,
        },
        queue: recentQueue,
      });
    }
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in GET /api/staff/dashboard:", error);
    return NextResponse.json(
      { error: "Failed to retrieve nursing dashboard metrics" },
      { status: 500 }
    );
  }
}
