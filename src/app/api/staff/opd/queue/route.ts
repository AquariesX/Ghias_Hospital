import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staff-auth";
import { AppointmentStatus, AdmissionStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Strictly require OPD department access and nurse role
    await requireStaffAuth(request, {
      requiredDepartment: "OPD",
      requireNurse: true,
    });

    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search")?.trim() || "";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Query Active Inpatient Admissions Admitted Through OPD (admissionSource = OPD)
    const admissionWhere: Record<string, unknown> = {
      admissionSource: "OPD",
      status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] as AdmissionStatus[] },
    };

    if (searchParam) {
      admissionWhere.OR = [
        { admissionNumber: { contains: searchParam, mode: "insensitive" } },
        { roomBedNo: { contains: searchParam, mode: "insensitive" } },
        { provisionalDiagnosis: { contains: searchParam, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { firstName: { contains: searchParam, mode: "insensitive" } },
              { lastName: { contains: searchParam, mode: "insensitive" } },
              { mrNumber: { contains: searchParam, mode: "insensitive" } },
              { patientNumber: { contains: searchParam, mode: "insensitive" } },
              { phone: { contains: searchParam } },
            ],
          },
        },
      ];
    }

    // 2. Query OPD Clinic Appointments for Today
    const appointmentWhere: Record<string, unknown> = {
      appointmentDate: { gte: todayStart, lte: todayEnd },
      isEmergency: false,
    };

    if (statusParam && Object.values(AppointmentStatus).includes(statusParam as AppointmentStatus)) {
      appointmentWhere.status = statusParam;
    }

    if (searchParam) {
      appointmentWhere.OR = [
        { patient: { firstName: { contains: searchParam, mode: "insensitive" } } },
        { patient: { lastName: { contains: searchParam, mode: "insensitive" } } },
        { patient: { mrNumber: { contains: searchParam, mode: "insensitive" } } },
        { patient: { patientNumber: { contains: searchParam, mode: "insensitive" } } },
        { appointmentNumber: { contains: searchParam, mode: "insensitive" } },
      ];
    }

    const [admissions, appointments] = await Promise.all([
      prisma.admission.findMany({
        where: admissionWhere,
        orderBy: [{ admissionDate: "desc" }, { createdAt: "desc" }],
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
        },
      }),
      statusParam && !["ALL", "WAITING", "IN_CONSULTATION", "COMPLETED"].includes(statusParam)
        ? []
        : prisma.appointment.findMany({
            where: appointmentWhere,
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
          }),
    ]);

    // Format Admissions into the queue format
    const formattedAdmissions = admissions.map((adm) => ({
      id: adm.id,
      isAdmission: true,
      admissionId: adm.id,
      admissionNumber: adm.admissionNumber,
      appointmentNumber: adm.admissionNumber,
      appointmentTime: adm.admissionTime || "Inpatient Admission",
      status: adm.status, // "ADMITTED", "UNDER_TREATMENT", etc.
      reason: adm.provisionalDiagnosis || "Inpatient Care",
      roomBedNo: adm.roomBedNo,
      patient: {
        ...adm.patient,
        dateOfBirth: adm.patient.dateOfBirth.toISOString(),
        vitalSigns: adm.patient.vitalSigns.map((v) => ({
          systolicBP: v.systolicBP,
          diastolicBP: v.diastolicBP,
          pulse: v.pulse,
          temperature: v.temperature ? Number(v.temperature) : null,
          oxygenSaturation: v.oxygenSaturation,
          weight: v.weight ? Number(v.weight) : null,
          height: v.height ? Number(v.height) : null,
          bmi: v.bmi ? Number(v.bmi) : null,
          recordedAt: v.recordedAt.toISOString(),
        })),
      },
      doctor: adm.doctor || {
        id: "",
        firstName: adm.doctorName || "Assigned",
        lastName: "Physician",
        specialization: "Attending Doctor",
        roomNumber: adm.roomBedNo,
      },
      department: {
        id: "opd-ward",
        name: "OPD Inpatient Ward",
        code: "OPD",
      },
    }));

    // Format Appointments into the queue format
    const formattedAppointments = appointments.map((apt) => ({
      id: apt.id,
      isAdmission: false,
      appointmentNumber: apt.appointmentNumber,
      appointmentTime: apt.appointmentTime,
      status: apt.status,
      reason: apt.reason,
      roomBedNo: null,
      patient: {
        ...apt.patient,
        dateOfBirth: apt.patient.dateOfBirth.toISOString(),
        vitalSigns: apt.patient.vitalSigns.map((v) => ({
          systolicBP: v.systolicBP,
          diastolicBP: v.diastolicBP,
          pulse: v.pulse,
          temperature: v.temperature ? Number(v.temperature) : null,
          oxygenSaturation: v.oxygenSaturation,
          weight: v.weight ? Number(v.weight) : null,
          height: v.height ? Number(v.height) : null,
          bmi: v.bmi ? Number(v.bmi) : null,
          recordedAt: v.recordedAt.toISOString(),
        })),
      },
      doctor: apt.doctor,
      department: apt.department,
    }));

    // If filter specifically requests ADMITTED, return admissions only
    if (statusParam === "ADMITTED" || statusParam === "INPATIENT") {
      return NextResponse.json({
        success: true,
        data: formattedAdmissions,
        admissionsCount: formattedAdmissions.length,
        appointmentsCount: 0,
      });
    }

    // Combine both: Admitted patients first, then appointments
    const combinedQueue = [...formattedAdmissions, ...formattedAppointments];

    return NextResponse.json({
      success: true,
      data: combinedQueue,
      admissionsCount: formattedAdmissions.length,
      appointmentsCount: formattedAppointments.length,
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
