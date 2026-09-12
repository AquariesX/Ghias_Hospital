import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/billing-auth";
import { createAuditLog } from "@/lib/audit";
import { Gender, PatientStatus, AdmissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminAccess(request);

    const { searchParams } = request.nextUrl;
    const dateFrom = searchParams.get("dateFrom")?.trim() || "";
    const dateTo = searchParams.get("dateTo")?.trim() || "";
    const departmentId = searchParams.get("departmentId")?.trim() || "";
    const doctorId = searchParams.get("doctorId")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const gender = searchParams.get("gender")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    const where: Record<string, unknown> = {};

    // Date range of patient registration or activity
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    if (status && Object.values(PatientStatus).includes(status as any)) {
      where.status = status as PatientStatus;
    }

    if (gender && Object.values(Gender).includes(gender as any)) {
      where.gender = gender as Gender;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { mrNumber: { contains: search, mode: "insensitive" } },
        { patientNumber: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { cnic: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    if (doctorId) {
      where.OR = [
        ...(where.OR as any[] || []),
        { appointments: { some: { doctorId } } },
        { admissions: { some: { doctorId } } },
      ];
    }

    if (departmentId) {
      where.appointments = { some: { departmentId } };
    }

    const [totalPatients, activePatients, admittedPatientsCount, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.count({ where: { ...where, status: PatientStatus.ACTIVE } }),
      prisma.admission.count({
        where: {
          status: { in: [AdmissionStatus.ADMITTED, AdmissionStatus.UNDER_TREATMENT] },
        },
      }),
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              appointments: true,
              admissions: true,
              consultations: true,
              prescriptions: true,
            },
          },
          appointments: {
            orderBy: { appointmentDate: "desc" },
            take: 1,
            select: {
              appointmentNumber: true,
              appointmentDate: true,
              appointmentType: true,
              doctor: { select: { firstName: true, lastName: true } },
              department: { select: { name: true } },
            },
          },
          admissions: {
            where: { status: { in: [AdmissionStatus.ADMITTED, AdmissionStatus.UNDER_TREATMENT] } },
            orderBy: { admissionDate: "desc" },
            take: 1,
            select: {
              admissionNumber: true,
              admissionDate: true,
              roomBedNo: true,
              doctor: { select: { firstName: true, lastName: true } },
              bed: { select: { bedNumber: true, room: { select: { roomNumber: true } } } },
            },
          },
        },
      }),
    ]);

    // Format patient records
    const formattedPatients = patients.map((p) => {
      // Calculate age
      let age: number | string = "—";
      if (p.dateOfBirth) {
        const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
        const calculatedAge = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        if (!isNaN(calculatedAge) && calculatedAge >= 0) age = calculatedAge;
      }

      const activeAdmission = p.admissions[0];
      const lastApt = p.appointments[0];

      return {
        id: p.id,
        patientNumber: p.patientNumber,
        mrNumber: p.mrNumber || p.patientNumber,
        fullName: `${p.firstName} ${p.lastName}`,
        gender: p.gender,
        age,
        phone: p.phone,
        address: p.address || "—",
        relationType: p.relationType || "S/O",
        relatedPersonName: p.relatedPersonName || "—",
        status: p.status,
        totalAppointments: p._count.appointments,
        totalAdmissions: p._count.admissions,
        totalConsultations: p._count.consultations,
        totalPrescriptions: p._count.prescriptions,
        lastAppointment: lastApt
          ? {
              number: lastApt.appointmentNumber,
              date: lastApt.appointmentDate.toISOString().split("T")[0],
              doctor: `Dr. ${lastApt.doctor.firstName} ${lastApt.doctor.lastName}`,
              department: lastApt.department.name,
            }
          : null,
        currentAdmission: activeAdmission
          ? {
              admissionNumber: activeAdmission.admissionNumber,
              date: activeAdmission.admissionDate.toISOString().split("T")[0],
              doctor: activeAdmission.doctor ? `Dr. ${activeAdmission.doctor.firstName} ${activeAdmission.doctor.lastName}` : "—",
              bedRoom: activeAdmission.bed
                ? `Room ${activeAdmission.bed.room.roomNumber} - Bed ${activeAdmission.bed.bedNumber}`
                : activeAdmission.roomBedNo || "Inpatient Ward",
            }
          : null,
        registeredAt: p.createdAt.toISOString().split("T")[0],
      };
    });

    // Audit Log
    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "GENERATE_PATIENT_REPORT",
      entity: "PATIENT",
      newValue: JSON.stringify({
        dateFrom,
        dateTo,
        status,
        gender,
        totalPatients,
      }),
    });

    return NextResponse.json({
      summary: {
        totalPatients,
        activePatients,
        admittedPatients: admittedPatientsCount,
      },
      patients: formattedPatients,
      pagination: {
        page,
        pageSize,
        totalRecords: totalPatients,
        totalPages: Math.ceil(totalPatients / pageSize),
      },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Patient Report API error:", err);
    return NextResponse.json({ error: "Failed to generate Patient Report" }, { status: 500 });
  }
}
