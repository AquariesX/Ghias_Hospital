import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients } from "@/lib/rbac";
import { AdmissionStatus, AppointmentStatus, PatientStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "DOCTOR" && user.role !== "RECEPTIONIST" && user.role !== "STAFF") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "patients";
    const dateRange = searchParams.get("dateRange") || "all";
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");
    const doctorId = searchParams.get("doctorId");
    const departmentId = searchParams.get("departmentId");

    // Calculate Date filters
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const now = new Date();
    if (dateRange === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRange === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      startDate = weekStart;
      endDate = now;
    } else if (dateRange === "month") {
      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 30);
      startDate = monthStart;
      endDate = now;
    } else if (dateRange === "custom" && dateFromParam) {
      startDate = new Date(dateFromParam);
      endDate = dateToParam ? new Date(dateToParam + "T23:59:59.999Z") : now;
    }

    // 1. PATIENT REPORT
    if (type === "patients") {
      const where: Record<string, unknown> = {};
      if (startDate) {
        where.createdAt = { gte: startDate, ...(endDate ? { lte: endDate } : {}) };
      }

      const [
        totalPatients,
        activePatients,
        criticalPatients,
        dischargedPatients,
        genderGroups,
        bloodGroups,
        recentPatients,
      ] = await Promise.all([
        prisma.patient.count({ where }),
        prisma.patient.count({ where: { ...where, status: PatientStatus.ACTIVE } }),
        prisma.patient.count({ where: { ...where, status: PatientStatus.CRITICAL } }),
        prisma.patient.count({ where: { ...where, status: PatientStatus.DISCHARGED } }),
        prisma.patient.groupBy({
          by: ["gender"],
          _count: { id: true },
          where,
        }),
        prisma.patient.groupBy({
          by: ["bloodGroup"],
          _count: { id: true },
          where,
        }),
        prisma.patient.findMany({
          where,
          take: 20,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            mrNumber: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            bloodGroup: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        type: "patients",
        summary: {
          total: totalPatients,
          active: activePatients,
          critical: criticalPatients,
          discharged: dischargedPatients,
          byGender: genderGroups.map((g) => ({ label: g.gender, count: g._count.id })),
          byBloodGroup: bloodGroups.map((b) => ({ label: b.bloodGroup.replace("_", " "), count: b._count.id })),
        },
        data: recentPatients,
      });
    }

    // 2. ADMISSION REPORT
    if (type === "admissions") {
      const where: Record<string, unknown> = {};
      if (startDate) {
        where.admissionDate = { gte: startDate, ...(endDate ? { lte: endDate } : {}) };
      }
      if (doctorId) where.doctorId = doctorId;

      const [
        totalAdmissions,
        admittedCount,
        underTreatmentCount,
        dischargePendingCount,
        dischargedCount,
        sourceGroups,
        recentAdmissions,
      ] = await Promise.all([
        prisma.admission.count({ where }),
        prisma.admission.count({ where: { ...where, status: AdmissionStatus.ADMITTED } }),
        prisma.admission.count({ where: { ...where, status: AdmissionStatus.UNDER_TREATMENT } }),
        prisma.admission.count({ where: { ...where, status: AdmissionStatus.DISCHARGE_PENDING } }),
        prisma.admission.count({ where: { ...where, status: AdmissionStatus.DISCHARGED } }),
        prisma.admission.groupBy({
          by: ["admissionSource"],
          _count: { id: true },
          where,
        }),
        prisma.admission.findMany({
          where,
          take: 20,
          orderBy: { admissionDate: "desc" },
          include: {
            patient: { select: { firstName: true, lastName: true, mrNumber: true, gender: true } },
            doctor: { select: { firstName: true, lastName: true, specialization: true } },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        type: "admissions",
        summary: {
          total: totalAdmissions,
          admitted: admittedCount,
          underTreatment: underTreatmentCount,
          dischargePending: dischargePendingCount,
          discharged: dischargedCount,
          bySource: sourceGroups.map((s) => ({ label: s.admissionSource, count: s._count.id })),
        },
        data: recentAdmissions,
      });
    }

    // 3. DISCHARGE REPORT
    if (type === "discharges") {
      const where: Record<string, unknown> = {
        status: AdmissionStatus.DISCHARGED,
      };
      if (startDate) {
        where.dischargeDate = { gte: startDate, ...(endDate ? { lte: endDate } : {}) };
      }
      if (doctorId) where.doctorId = doctorId;

      const [totalDischarged, dischargedAdmissions] = await Promise.all([
        prisma.admission.count({ where }),
        prisma.admission.findMany({
          where,
          take: 30,
          orderBy: { dischargeDate: "desc" },
          include: {
            patient: { select: { firstName: true, lastName: true, mrNumber: true, gender: true } },
            doctor: { select: { firstName: true, lastName: true, specialization: true } },
          },
        }),
      ]);

      // Calculate average length of stay (days)
      let totalStayDays = 0;
      let countWithDates = 0;
      for (const adm of dischargedAdmissions) {
        if (adm.dischargeDate && adm.admissionDate) {
          const stay = Math.max(
            1,
            Math.ceil((new Date(adm.dischargeDate).getTime() - new Date(adm.admissionDate).getTime()) / (1000 * 60 * 60 * 24))
          );
          totalStayDays += stay;
          countWithDates++;
        }
      }
      const avgStayDays = countWithDates > 0 ? (totalStayDays / countWithDates).toFixed(1) : "0";

      return NextResponse.json({
        success: true,
        type: "discharges",
        summary: {
          total: totalDischarged,
          averageStayDays: avgStayDays,
        },
        data: dischargedAdmissions.map((adm) => {
          const stay = adm.dischargeDate && adm.admissionDate
            ? Math.max(1, Math.ceil((new Date(adm.dischargeDate).getTime() - new Date(adm.admissionDate).getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          return {
            id: adm.id,
            admissionNumber: adm.admissionNumber,
            patientName: `${adm.patient.firstName} ${adm.patient.lastName}`,
            mrNumber: adm.patient.mrNumber,
            doctorName: adm.doctor ? `Dr. ${adm.doctor.firstName} ${adm.doctor.lastName}` : "On-Call",
            admissionDate: adm.admissionDate,
            dischargeDate: adm.dischargeDate,
            stayDays: stay,
            finalDiagnosis: adm.finalDiagnosis || "—",
            condition: adm.generalExamination || "Stable",
          };
        }),
      });
    }

    // 4. APPOINTMENT REPORT
    if (type === "appointments") {
      const where: Record<string, unknown> = {};
      if (startDate) {
        where.appointmentDate = { gte: startDate, ...(endDate ? { lte: endDate } : {}) };
      }
      if (doctorId) where.doctorId = doctorId;
      if (departmentId) where.departmentId = departmentId;

      const [
        totalAppointments,
        completedCount,
        waitingCount,
        scheduledCount,
        noShowCount,
        typeGroups,
        recentAppointments,
      ] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.count({ where: { ...where, status: AppointmentStatus.COMPLETED } }),
        prisma.appointment.count({ where: { ...where, status: AppointmentStatus.WAITING } }),
        prisma.appointment.count({ where: { ...where, status: AppointmentStatus.SCHEDULED } }),
        prisma.appointment.count({ where: { ...where, status: AppointmentStatus.NO_SHOW } }),
        prisma.appointment.groupBy({
          by: ["appointmentType"],
          _count: { id: true },
          where,
        }),
        prisma.appointment.findMany({
          where,
          take: 20,
          orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
          include: {
            patient: { select: { firstName: true, lastName: true, mrNumber: true } },
            doctor: { select: { firstName: true, lastName: true } },
            department: { select: { name: true } },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        type: "appointments",
        summary: {
          total: totalAppointments,
          completed: completedCount,
          waiting: waitingCount,
          scheduled: scheduledCount,
          noShow: noShowCount,
          byType: typeGroups.map((t) => ({ label: t.appointmentType, count: t._count.id })),
        },
        data: recentAppointments,
      });
    }

    // 5. CLINICAL ACTIVITY REPORT
    if (type === "clinical") {
      const dateFilter: Record<string, unknown> = {};
      if (startDate) {
        dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;
      }

      const [
        totalConsultations,
        totalVitals,
        totalNursingNotes,
        totalMAR,
        totalPrescriptions,
      ] = await Promise.all([
        prisma.consultation.count({
          where: startDate ? { consultationDate: dateFilter } : {},
        }),
        prisma.vitalSign.count({
          where: startDate ? { recordedAt: dateFilter } : {},
        }),
        prisma.nursingNote.count({
          where: startDate ? { recordedAt: dateFilter } : {},
        }),
        prisma.medicationAdministration.count({
          where: startDate ? { administeredAt: dateFilter } : {},
        }),
        prisma.prescription.count({
          where: startDate ? { createdAt: dateFilter } : {},
        }),
      ]);

      const recentConsultations = await prisma.consultation.findMany({
        take: 20,
        orderBy: { consultationDate: "desc" },
        include: {
          patient: { select: { firstName: true, lastName: true, mrNumber: true } },
          doctor: { select: { firstName: true, lastName: true } },
        },
      });

      return NextResponse.json({
        success: true,
        type: "clinical",
        summary: {
          consultations: totalConsultations,
          vitalsRecorded: totalVitals,
          nursingNotes: totalNursingNotes,
          medicationsAdministered: totalMAR,
          prescriptions: totalPrescriptions,
        },
        data: recentConsultations,
      });
    }

    // 6. AUDIT REPORT
    if (type === "audit") {
      const where: Record<string, unknown> = {};
      if (startDate) {
        where.timestamp = { gte: startDate, ...(endDate ? { lte: endDate } : {}) };
      }

      const [totalLogs, actionGroups, recentLogs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.groupBy({
          by: ["action"],
          _count: { id: true },
          where,
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        prisma.auditLog.findMany({
          where,
          take: 30,
          orderBy: { timestamp: "desc" },
          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            userName: true,
            userRole: true,
            timestamp: true,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        type: "audit",
        summary: {
          total: totalLogs,
          topActions: actionGroups.map((a) => ({ label: a.action, count: a._count.id })),
        },
        data: recentLogs,
      });
    }

    return NextResponse.json({ error: "Invalid report type specified" }, { status: 400 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
