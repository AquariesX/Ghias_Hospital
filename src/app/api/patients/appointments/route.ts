import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePatientAccess } from "@/lib/patient-auth";
import { AppointmentStatus, AppointmentType, AdmissionStatus } from "@prisma/client";

const ACTIVE_ADMISSION_STATUSES: AdmissionStatus[] = [
  AdmissionStatus.ADMITTED,
  AdmissionStatus.UNDER_TREATMENT,
  AdmissionStatus.DISCHARGE_PENDING,
];

export async function GET(request: NextRequest) {
  try {
    await requirePatientAccess(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const departmentId = searchParams.get("departmentId") || "";
    const doctorId = searchParams.get("doctorId") || "";
    const appointmentType = searchParams.get("appointmentType") || "";
    const status = searchParams.get("status") || "";
    const date = searchParams.get("date") || "";

    // Base condition: exclude patients who currently have an active inpatient admission
    const where: Record<string, unknown> = {
      patient: {
        admissions: {
          none: {
            status: { in: ACTIVE_ADMISSION_STATUSES },
          },
        },
      },
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (appointmentType && Object.values(AppointmentType).includes(appointmentType as AppointmentType)) {
      where.appointmentType = appointmentType as AppointmentType;
    }

    if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
      where.status = status as AppointmentStatus;
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      where.appointmentDate = new Date(`${date}T00:00:00.000Z`);
    }

    if (search) {
      where.OR = [
        { appointmentNumber: { contains: search, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { mrNumber: { contains: search, mode: "insensitive" } },
              { patientNumber: { contains: search, mode: "insensitive" } },
              { cnic: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          doctor: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "asc" }, { createdAt: "desc" }],
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
              cnic: true,
              status: true,
            },
          },
          doctor: {
            select: {
              id: true,
              doctorNumber: true,
              firstName: true,
              lastName: true,
              specialization: true,
              department: {
                select: { id: true, name: true, code: true },
              },
            },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          consultation: {
            select: {
              id: true,
              consultationNumber: true,
              status: true,
              provisionalDiagnosis: true,
              finalDiagnosis: true,
              treatmentPlan: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      appointments: appointments.map((apt) => ({
        id: apt.id,
        appointmentNumber: apt.appointmentNumber,
        appointmentDate: apt.appointmentDate.toISOString().split("T")[0],
        appointmentTime: apt.appointmentTime,
        appointmentType: apt.appointmentType,
        status: apt.status,
        reason: apt.reason,
        tokenNumber: apt.tokenNumber,
        isEmergency: apt.isEmergency,
        patient: apt.patient,
        doctor: apt.doctor,
        department: apt.department,
        consultation: apt.consultation,
        hasConsultation: !!apt.consultation,
        isConsultationCompleted: apt.consultation?.status === "COMPLETED",
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/patients/appointments error:", error);
    return NextResponse.json(
      { error: "Internal server error retrieving appointment patients" },
      { status: 500 }
    );
  }
}
