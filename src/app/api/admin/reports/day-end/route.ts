import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/billing-auth";
import { createAuditLog } from "@/lib/audit";
import { AppointmentStatus, AdmissionStatus, AdmissionSource } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminAccess(request);

    const { searchParams } = request.nextUrl;
    const dateStr = searchParams.get("date")?.trim() || new Date().toISOString().split("T")[0];
    const departmentId = searchParams.get("departmentId")?.trim() || "";
    const doctorId = searchParams.get("doctorId")?.trim() || "";
    const admissionSource = searchParams.get("admissionSource")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const nextDay = new Date(`${dateStr}T23:59:59.999Z`);

    // Appointment filters for the selected day
    const aptWhere: Record<string, unknown> = {
      appointmentDate: targetDate,
    };
    if (status) {
      aptWhere.status = status as AppointmentStatus;
    } else {
      aptWhere.status = { not: AppointmentStatus.CANCELLED };
    }
    if (departmentId) aptWhere.departmentId = departmentId;
    if (doctorId) aptWhere.doctorId = doctorId;

    // Admission filters for the selected day
    const admWhere: Record<string, unknown> = {
      admissionDate: targetDate,
    };
    if (status) {
      admWhere.status = status as AdmissionStatus;
    } else {
      admWhere.status = { not: AdmissionStatus.CANCELLED };
    }
    if (doctorId) admWhere.doctorId = doctorId;
    if (admissionSource && Object.values(AdmissionSource).includes(admissionSource as any)) {
      admWhere.admissionSource = admissionSource as AdmissionSource;
    }

    // Discharge filter: admissions discharged on this date
    const dischWhere: Record<string, unknown> = {
      dischargeDate: targetDate,
    };
    if (doctorId) dischWhere.doctorId = doctorId;

    // Expense filters for the selected day
    const expWhere: Record<string, unknown> = {
      date: targetDate,
    };

    // Parallel database aggregations
    const [
      appointments,
      admissions,
      discharges,
      expenses,
      aptRevenueAgg,
      admRevenueAgg,
      expenseAgg,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: aptWhere,
        orderBy: [{ tokenNumber: "asc" }, { createdAt: "asc" }],
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrNumber: true, patientNumber: true, phone: true, gender: true },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true, specialization: true },
          },
          department: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.admission.findMany({
        where: admWhere,
        orderBy: { createdAt: "asc" },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrNumber: true, patientNumber: true, phone: true, gender: true },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true, specialization: true },
          },
          bed: {
            select: { id: true, bedNumber: true, room: { select: { roomNumber: true, name: true } } },
          },
        },
      }),
      prisma.admission.findMany({
        where: dischWhere,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrNumber: true, patientNumber: true },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.expense.findMany({
        where: expWhere,
        orderBy: { createdAt: "asc" },
        include: {
          addedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.appointment.aggregate({
        where: aptWhere,
        _sum: { consultationFee: true },
        _count: { id: true },
      }),
      prisma.admission.aggregate({
        where: { ...admWhere, admissionFee: { not: null } },
        _sum: { admissionFee: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: expWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Calculate unique patients seen on the day
    const uniquePatientIds = new Set<string>();
    appointments.forEach((a) => uniquePatientIds.add(a.patientId));
    admissions.forEach((a) => uniquePatientIds.add(a.patientId));
    discharges.forEach((d) => uniquePatientIds.add(d.patientId));

    const totalRevenue = Number(aptRevenueAgg._sum.consultationFee || 0) + Number(admRevenueAgg._sum.admissionFee || 0);
    const totalExpenses = Number(expenseAgg._sum.amount || 0);
    const netTotal = totalRevenue - totalExpenses;

    // Doctor revenue & patient breakdown
    const doctorMap = new Map<string, { doctorName: string; specialization: string; appointmentCount: number; admissionCount: number; revenue: number }>();
    for (const apt of appointments) {
      const docKey = apt.doctor.id;
      const existing = doctorMap.get(docKey) || {
        doctorName: `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`,
        specialization: apt.doctor.specialization,
        appointmentCount: 0,
        admissionCount: 0,
        revenue: 0,
      };
      existing.appointmentCount += 1;
      existing.revenue += Number(apt.consultationFee || 0);
      doctorMap.set(docKey, existing);
    }
    for (const adm of admissions) {
      if (adm.doctor) {
        const docKey = adm.doctor.id;
        const existing = doctorMap.get(docKey) || {
          doctorName: `Dr. ${adm.doctor.firstName} ${adm.doctor.lastName}`,
          specialization: adm.doctor.specialization,
          appointmentCount: 0,
          admissionCount: 0,
          revenue: 0,
        };
        existing.admissionCount += 1;
        existing.revenue += Number(adm.admissionFee || 0);
        doctorMap.set(docKey, existing);
      }
    }
    const doctorBreakdown = Array.from(doctorMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Department revenue & count breakdown
    const departmentMap = new Map<string, { departmentName: string; visitCount: number; revenue: number }>();
    for (const apt of appointments) {
      const deptKey = apt.department.id;
      const existing = departmentMap.get(deptKey) || {
        departmentName: apt.department.name,
        visitCount: 0,
        revenue: 0,
      };
      existing.visitCount += 1;
      existing.revenue += Number(apt.consultationFee || 0);
      departmentMap.set(deptKey, existing);
    }
    const departmentBreakdown = Array.from(departmentMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Expenses breakdown by category
    const expenseCategoryMap = new Map<string, { category: string; count: number; totalAmount: number }>();
    for (const exp of expenses) {
      const cat = exp.category;
      const existing = expenseCategoryMap.get(cat) || { category: cat, count: 0, totalAmount: 0 };
      existing.count += 1;
      existing.totalAmount += Number(exp.amount || 0);
      expenseCategoryMap.set(cat, existing);
    }
    const expenseCategoryBreakdown = Array.from(expenseCategoryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

    // Audit Log
    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "GENERATE_DAY_END_REPORT",
      entity: "REPORT",
      newValue: JSON.stringify({
        reportDate: dateStr,
        totalPatients: uniquePatientIds.size,
        totalRevenue,
        totalExpenses,
        netTotal,
      }),
    });

    return NextResponse.json({
      reportHeader: {
        hospitalNameUrdu: "غیاث ہسپتال",
        hospitalNameEnglish: "GIAS HOSPITAL PHALIA",
        registrationNumber: "REG NO. R-59488",
        reportTitle: "DAY END REPORT",
        reportDate: dateStr,
        generatedAt: new Date().toISOString(),
        generatedByName: `${admin.firstName} ${admin.lastName}`,
        filtersApplied: {
          departmentId: departmentId || "ALL",
          doctorId: doctorId || "ALL",
          admissionSource: admissionSource || "ALL",
          status: status || "ALL",
        },
      },
      patientSummary: {
        totalUniquePatients: uniquePatientIds.size,
        totalAppointments: appointments.length,
        totalAdmissions: admissions.length,
        totalDischarges: discharges.length,
      },
      financialSummary: {
        totalFees: totalRevenue,
        appointmentFees: Number(aptRevenueAgg._sum.consultationFee || 0),
        admissionFees: Number(admRevenueAgg._sum.admissionFee || 0),
        totalExpenses,
        netTotal,
      },
      doctorBreakdown,
      departmentBreakdown,
      expenseCategoryBreakdown,
      itemizedLedger: {
        appointments: appointments.map((a) => ({
          id: a.id,
          tokenNumber: a.tokenNumber,
          appointmentNumber: a.appointmentNumber,
          time: a.appointmentTime,
          patientName: `${a.patient.firstName} ${a.patient.lastName}`,
          mrNumber: a.mrNumber || a.patient.mrNumber || a.patient.patientNumber,
          doctorName: `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`,
          departmentName: a.department.name,
          type: a.appointmentType,
          status: a.status,
          fee: Number(a.consultationFee),
        })),
        admissions: admissions.map((adm) => ({
          id: adm.id,
          admissionNumber: adm.admissionNumber,
          time: adm.admissionTime,
          patientName: `${adm.patient.firstName} ${adm.patient.lastName}`,
          mrNumber: adm.referenceNumber || adm.patient.mrNumber || adm.patient.patientNumber,
          doctorName: adm.doctor ? `Dr. ${adm.doctor.firstName} ${adm.doctor.lastName}` : (adm.doctorName || "—"),
          roomBed: adm.bed ? `${adm.bed.room.roomNumber} - ${adm.bed.bedNumber}` : (adm.roomBedNo || "—"),
          source: adm.admissionSource,
          status: adm.status,
          fee: Number(adm.admissionFee || 0),
        })),
        discharges: discharges.map((d) => ({
          id: d.id,
          admissionNumber: d.admissionNumber,
          patientName: `${d.patient.firstName} ${d.patient.lastName}`,
          mrNumber: d.referenceNumber || d.patient.mrNumber || d.patient.patientNumber,
          doctorName: d.doctor ? `Dr. ${d.doctor.firstName} ${d.doctor.lastName}` : "—",
          condition: d.dischargeCondition,
          outcome: d.outcome,
        })),
        expenses: expenses.map((e) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          amount: Number(e.amount),
          addedBy: e.addedBy ? `${e.addedBy.firstName} ${e.addedBy.lastName}` : "Admin",
        })),
      },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Day End Report API error:", err);
    return NextResponse.json({ error: "Failed to generate Day End Report" }, { status: 500 });
  }
}
