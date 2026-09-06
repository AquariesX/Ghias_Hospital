import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePatientAccess } from "@/lib/patient-auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePatientAccess(request);
    const { id } = await context.params;

    // First ensure patient exists
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id }, { patientNumber: id }, { mrNumber: id }],
      },
      select: { id: true, patientNumber: true, mrNumber: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patientId = patient.id;

    // Fetch all clinical history streams concurrently
    const [
      appointments,
      consultations,
      prescriptions,
      admissions,
      vitalSigns,
      nursingNotes,
      timelineEvents,
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId },
        include: {
          doctor: {
            select: {
              id: true,
              doctorNumber: true,
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
      }),

      prisma.consultation.findMany({
        where: { patientId },
        include: {
          doctor: {
            select: {
              id: true,
              doctorNumber: true,
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
          appointment: {
            select: {
              id: true,
              appointmentNumber: true,
              department: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: { consultationDate: "desc" },
      }),

      prisma.prescription.findMany({
        where: { patientId },
        include: {
          doctor: {
            select: {
              id: true,
              doctorNumber: true,
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.admission.findMany({
        where: { patientId },
        include: {
          doctor: {
            select: {
              id: true,
              doctorNumber: true,
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
        },
        orderBy: { admissionDate: "desc" },
      }),

      prisma.vitalSign.findMany({
        where: { patientId },
        orderBy: { recordedAt: "desc" },
      }),

      prisma.nursingNote.findMany({
        where: { patientId },
        orderBy: { recordedAt: "desc" },
      }),

      prisma.timelineEvent.findMany({
        where: { patientId },
        orderBy: { timestamp: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        appointments,
        consultations,
        prescriptions,
        admissions,
        vitalSigns,
        nursingNotes,
        timelineEvents,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("GET /api/patients/[id]/history error:", error);
    return NextResponse.json({ error: "Failed to fetch patient history" }, { status: 500 });
  }
}
