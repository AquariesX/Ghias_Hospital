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
      // IPD Dashboard Metrics (Default for IPD Nurse or Inpatient Ward Staff)
      const [
        totalIpdAdmissions,
        admittedTodayCount,
        underTreatmentCount,
        dischargePendingCount,
        availableBedsCount,
        activeIpdQueue,
      ] = await Promise.all([
        prisma.admission.count({
          where: {
            admissionSource: "IPD",
            status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
          },
        }),
        prisma.admission.count({
          where: {
            admissionSource: "IPD",
            admissionDate: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.admission.count({
          where: {
            admissionSource: "IPD",
            status: "UNDER_TREATMENT",
          },
        }),
        prisma.admission.count({
          where: {
            admissionSource: "IPD",
            status: "DISCHARGE_PENDING",
          },
        }),
        prisma.bed.count({
          where: { status: "FREE", isActive: true },
        }),
        prisma.admission.findMany({
          where: {
            admissionSource: "IPD",
            status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
          },
          orderBy: { admissionDate: "desc" },
          take: 12,
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
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        department: "IPD",
        metrics: {
          totalInpatients: totalIpdAdmissions,
          admittedToday: admittedTodayCount,
          underTreatment: underTreatmentCount,
          dischargePending: dischargePendingCount,
          availableBeds: availableBedsCount,
        },
        queue: activeIpdQueue.map((adm) => ({
          id: adm.id,
          admissionId: adm.id,
          isAdmission: true,
          roomBedNo: adm.roomBedNo,
          patient: adm.patient,
          doctor: adm.doctor,
          chiefComplaint: adm.provisionalDiagnosis,
          status: adm.status,
          admissionDate: adm.admissionDate,
          admissionTime: adm.admissionTime,
        })),
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
