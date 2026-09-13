import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/billing-auth";
import { createAuditLog } from "@/lib/audit";
import { AppointmentStatus, AdmissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminAccess(request);

    const { searchParams } = request.nextUrl;
    const dateFrom = searchParams.get("dateFrom")?.trim() || "";
    const dateTo = searchParams.get("dateTo")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const doctorId = searchParams.get("doctorId")?.trim() || "";
    const departmentId = searchParams.get("departmentId")?.trim() || "";
    const feeType = searchParams.get("feeType")?.trim() || "ALL"; // ALL, APPOINTMENT, ADMISSION
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10)));

    // Date range filters
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      startDate = new Date(`${dateFrom}T00:00:00.000Z`);
    }
    if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      endDate = new Date(`${dateTo}T23:59:59.999Z`);
    }

    // 1. Appointment Fee Query Conditions
    const appointmentWhere: Record<string, unknown> = {
      status: { not: AppointmentStatus.CANCELLED },
    };

    if (feeType === "OPD") {
      appointmentWhere.NOT = [
        { reason: { startsWith: "Ultrasound", mode: "insensitive" } },
        { reason: { startsWith: "X-Ray", mode: "insensitive" } },
        { reason: { startsWith: "Lab Test", mode: "insensitive" } },
      ];
    } else if (feeType === "ULTRASOUND") {
      appointmentWhere.reason = { startsWith: "Ultrasound", mode: "insensitive" };
    } else if (feeType === "XRAY") {
      appointmentWhere.reason = { startsWith: "X-Ray", mode: "insensitive" };
    } else if (feeType === "LAB_TEST") {
      appointmentWhere.reason = { startsWith: "Lab Test", mode: "insensitive" };
    }

    if (startDate || endDate) {
      appointmentWhere.appointmentDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    if (doctorId) appointmentWhere.doctorId = doctorId;
    if (departmentId) appointmentWhere.departmentId = departmentId;

    if (search) {
      appointmentWhere.OR = [
        { appointmentNumber: { contains: search, mode: "insensitive" } },
        { mrNumber: { contains: search, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { mrNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // 2. Admission Fee Query Conditions
    const admissionWhere: Record<string, unknown> = {
      status: { not: AdmissionStatus.CANCELLED },
      admissionFee: { not: null },
    };

    if (startDate || endDate) {
      admissionWhere.admissionDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    if (doctorId) admissionWhere.doctorId = doctorId;

    if (search) {
      admissionWhere.OR = [
        { admissionNumber: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { mrNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // 3. Expense Query Conditions for the same date range
    const expenseWhere: Record<string, unknown> = {};
    if (startDate || endDate) {
      expenseWhere.date = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    // Database Aggregations for Financial Summary
    const [
      appointmentRevAgg,
      admissionRevAgg,
      expenseAgg,
      totalPatientsRegistered,
      distinctAppointmentPatients,
      distinctAdmissionPatients,
    ] = await Promise.all([
      prisma.appointment.aggregate({
        where: appointmentWhere,
        _sum: { consultationFee: true },
        _count: { id: true },
      }),
      prisma.admission.aggregate({
        where: admissionWhere,
        _sum: { admissionFee: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.patient.count(),
      prisma.appointment.findMany({
        where: appointmentWhere,
        distinct: ["patientId"],
        select: { patientId: true },
      }),
      prisma.admission.findMany({
        where: admissionWhere,
        distinct: ["patientId"],
        select: { patientId: true },
      }),
    ]);

    const totalAptRevenue = Number(appointmentRevAgg._sum.consultationFee || 0);
    const totalAdmRevenue = Number(admissionRevAgg._sum.admissionFee || 0);

    // Service-level revenue aggregations
    const allFilteredApts = await prisma.appointment.findMany({
      where: {
        status: { not: AppointmentStatus.CANCELLED },
        ...(startDate || endDate ? { appointmentDate: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}),
        ...(doctorId ? { doctorId } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      select: { consultationFee: true, reason: true },
    });

    let opdRevenue = 0;
    let ultrasoundRevenue = 0;
    let xrayRevenue = 0;
    let labRevenue = 0;

    for (const a of allFilteredApts) {
      const fee = Number(a.consultationFee || 0);
      const r = (a.reason || "").toLowerCase();
      if (r.startsWith("ultrasound")) ultrasoundRevenue += fee;
      else if (r.startsWith("x-ray")) xrayRevenue += fee;
      else if (r.startsWith("lab test")) labRevenue += fee;
      else opdRevenue += fee;
    }

    let totalRevenue = 0;
    if (feeType === "OPD") {
      totalRevenue = opdRevenue;
    } else if (feeType === "ULTRASOUND") {
      totalRevenue = ultrasoundRevenue;
    } else if (feeType === "XRAY") {
      totalRevenue = xrayRevenue;
    } else if (feeType === "LAB_TEST") {
      totalRevenue = labRevenue;
    } else if (feeType === "APPOINTMENT") {
      totalRevenue = totalAptRevenue;
    } else if (feeType === "ADMISSION") {
      totalRevenue = totalAdmRevenue;
    } else {
      totalRevenue = totalAptRevenue + totalAdmRevenue;
    }

    const totalExpenses = Number(expenseAgg._sum.amount || 0);
    const netTotal = totalRevenue - totalExpenses;

    // Distinct patients in active financial filter
    const activePatientSet = new Set<string>();
    distinctAppointmentPatients.forEach((p) => activePatientSet.add(p.patientId));
    distinctAdmissionPatients.forEach((p) => activePatientSet.add(p.patientId));
    const totalPatientsFiltered = activePatientSet.size > 0 ? activePatientSet.size : (startDate || search ? 0 : totalPatientsRegistered);

    // 4. Fetch Paginated Transactions List
    interface BillingRecordItem {
      id: string;
      referenceId: string;
      recordNumber: string;
      type: "APPOINTMENT" | "ADMISSION";
      serviceCategory?: string;
      typeLabel: string;
      date: string;
      time?: string | null;
      patientId: string;
      patientName: string;
      patientPhone: string;
      mrNumber: string | null;
      doctorId?: string | null;
      doctorName?: string | null;
      departmentName?: string | null;
      amount: number;
      status: string;
      paymentMethod: string;
    }

    const records: BillingRecordItem[] = [];

    // Fetch Appointments if requested
    const shouldFetchAppointments =
      feeType === "ALL" ||
      feeType === "APPOINTMENT" ||
      feeType === "OPD" ||
      feeType === "ULTRASOUND" ||
      feeType === "XRAY" ||
      feeType === "LAB_TEST";

    if (shouldFetchAppointments) {
      const appointments = await prisma.appointment.findMany({
        where: appointmentWhere,
        orderBy: [{ appointmentDate: "desc" }, { createdAt: "desc" }],
        take: pageSize * 2, // Take enough for combined merge
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrNumber: true, patientNumber: true, phone: true },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true },
          },
          department: {
            select: { id: true, name: true },
          },
        },
      });

      for (const apt of appointments) {
        const r = (apt.reason || "").toLowerCase();
        let serviceCat = "OPD";
        let typeLabel = `OPD Token #${apt.tokenNumber || "—"} (${apt.appointmentType})`;
        if (r.startsWith("ultrasound")) {
          serviceCat = "ULTRASOUND";
          const sub = apt.reason.replace(/^ultrasound[:\s-]*/i, "").trim();
          typeLabel = `Ultrasound #${apt.tokenNumber || "—"} — ${sub || "Sonography"}`;
        } else if (r.startsWith("x-ray")) {
          serviceCat = "XRAY";
          const sub = apt.reason.replace(/^x-ray[:\s-]*/i, "").trim();
          typeLabel = `X-Ray #${apt.tokenNumber || "—"} — ${sub || "Radiology"}`;
        } else if (r.startsWith("lab test")) {
          serviceCat = "LAB_TEST";
          const sub = apt.reason.replace(/^lab test[:\s-]*/i, "").trim();
          typeLabel = `Lab Test #${apt.tokenNumber || "—"} — ${sub || "Pathology"}`;
        }

        records.push({
          id: `apt-${apt.id}`,
          referenceId: apt.id,
          recordNumber: apt.appointmentNumber,
          type: "APPOINTMENT",
          serviceCategory: serviceCat,
          typeLabel,
          date: apt.appointmentDate.toISOString().split("T")[0],
          time: apt.appointmentTime,
          patientId: apt.patient.id,
          patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
          patientPhone: apt.patient.phone,
          mrNumber: apt.mrNumber || apt.patient.mrNumber || apt.patient.patientNumber,
          doctorId: apt.doctor.id,
          doctorName: `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`,
          departmentName: serviceCat === "OPD" ? apt.department.name : (serviceCat === "LAB_TEST" ? "Pathology / Lab" : "Radiology & Imaging"),
          amount: Number(apt.consultationFee || 0),
          status: apt.status,
          paymentMethod: "Cash / Frontdesk",
        });
      }
    }

    // Fetch Admissions if requested
    if (feeType === "ALL" || feeType === "ADMISSION") {
      const admissions = await prisma.admission.findMany({
        where: admissionWhere,
        orderBy: [{ admissionDate: "desc" }, { createdAt: "desc" }],
        take: pageSize * 2,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrNumber: true, patientNumber: true, phone: true },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      for (const adm of admissions) {
        records.push({
          id: `adm-${adm.id}`,
          referenceId: adm.id,
          recordNumber: adm.admissionNumber,
          type: "ADMISSION",
          typeLabel: `Inpatient Admission (${adm.admissionSource})`,
          date: adm.admissionDate.toISOString().split("T")[0],
          time: adm.admissionTime,
          patientId: adm.patient.id,
          patientName: `${adm.patient.firstName} ${adm.patient.lastName}`,
          patientPhone: adm.patient.phone,
          mrNumber: adm.referenceNumber || adm.patient.mrNumber || adm.patient.patientNumber,
          doctorId: adm.doctor?.id,
          doctorName: adm.doctor ? `Dr. ${adm.doctor.firstName} ${adm.doctor.lastName}` : (adm.doctorName || "Attending Physician"),
          departmentName: adm.admissionSource === "EMERGENCY" ? "Emergency Ward" : "Inpatient Ward",
          amount: Number(adm.admissionFee || 0),
          status: adm.status,
          paymentMethod: "Cash / Billing Desk",
        });
      }
    }

    // Sort combined records descending by date
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalRecords = records.length;
    const paginatedRecords = records.slice((page - 1) * pageSize, page * pageSize);

    // Audit Log
    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "VIEW_BILLING",
      entity: "BILLING",
      newValue: JSON.stringify({
        dateFrom,
        dateTo,
        feeType,
        totalRevenue,
        totalExpenses,
        netTotal,
      }),
    });

    return NextResponse.json({
      financialSummary: {
        totalRevenue,
        totalExpenses,
        netTotal,
        totalPatients: totalPatientsFiltered,
        totalAppointmentsCount: appointmentRevAgg._count.id,
        totalAdmissionsCount: admissionRevAgg._count.id,
        totalExpensesCount: expenseAgg._count.id,
        serviceBreakdown: {
          opdRevenue,
          ultrasoundRevenue,
          xrayRevenue,
          labRevenue,
          admissionRevenue: totalAdmRevenue,
        },
      },
      records: paginatedRecords,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
      },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Billing API error:", err);
    return NextResponse.json({ error: "Failed to load billing and financial records" }, { status: 500 });
  }
}
