import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateNextConsultationNumber } from "@/lib/consultation-number";

const doctorNoteSchema = z.object({
  doctorId: z.string().optional().nullable(),
  presentingComplaints: z.string().optional().nullable(),
  provisionalDiagnosis: z.string().optional().nullable(),
  finalDiagnosis: z.string().optional().nullable(),
  medicalHistory: z.string().optional().nullable(),
  medicationHistory: z.string().optional().nullable(),
  investigations: z.string().optional().nullable(),
  treatmentPlan: z.string().optional().nullable(),
  physicalExamination: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: patientId } = await params;

    const [consultations, admissions, emergencyTriages] = await Promise.all([
      prisma.consultation.findMany({
        where: { patientId },
        orderBy: { consultationDate: "desc" },
        include: {
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
        take: 30,
      }),
      prisma.admission.findMany({
        where: { patientId },
        orderBy: { admissionDate: "desc" },
        select: {
          id: true,
          admissionNumber: true,
          admissionDate: true,
          admissionTime: true,
          dischargeDate: true,
          dischargeTime: true,
          status: true,
          doctorName: true,
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
          presentingComplaints: true,
          provisionalDiagnosis: true,
          finalDiagnosis: true,
          investigations: true,
          treatmentPlan: true,
          operation: true,
          generalExamination: true,
          dischargeSummary: true,
          dischargeInstructions: true,
        },
        take: 15,
      }),
      prisma.emergencyTriage.findMany({
        where: { patientId },
        orderBy: { triagedAt: "desc" },
        select: {
          id: true,
          triagedAt: true,
          triagedByName: true,
          triageLevel: true,
          priority: true,
          chiefComplaint: true,
          provisionalDiagnosis: true,
          finalDiagnosis: true,
          observations: true,
          dischargeDateTime: true,
        },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        consultations,
        admissions,
        emergencyTriages,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/staff/patients/[id]/doctor-notes:", error);
    return NextResponse.json({ error: "Failed to fetch doctor notes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const allowedRoles = ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "STAFF"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Unauthorized access" }, { status: 403 });
    }

    const { id: patientId } = await params;
    const body = await request.json();
    const parseResult = doctorNoteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        admissions: {
          orderBy: { admissionDate: "desc" },
          take: 1,
        },
        emergencyTriages: {
          orderBy: { triagedAt: "desc" },
          take: 1,
        },
      },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const isDischarged =
      patient.status === "DISCHARGED" ||
      patient.status === "DECEASED" ||
      Boolean(patient.admissions?.[0]?.dischargeDate) ||
      Boolean(patient.emergencyTriages?.[0]?.dischargeDateTime);

    if (isDischarged) {
      return NextResponse.json(
        {
          error: "Patient file is locked and read-only. Clinical notes and doctor consults cannot be recorded after patient discharge.",
        },
        { status: 403 }
      );
    }

    // Resolve doctor
    let resolvedDoctorId = data.doctorId;
    if (!resolvedDoctorId && user.role === "DOCTOR") {
      const doc = await prisma.doctor.findFirst({
        where: { OR: [{ userId: user.id }, { email: user.email }] },
      });
      if (doc) resolvedDoctorId = doc.id;
    }

    if (!resolvedDoctorId) {
      const fallbackDoctor = await prisma.doctor.findFirst({
        where: { status: "ACTIVE" },
      });
      if (fallbackDoctor) {
        resolvedDoctorId = fallbackDoctor.id;
      } else {
        const anyDoctor = await prisma.doctor.findFirst();
        resolvedDoctorId = anyDoctor?.id;
      }
    }

    if (!resolvedDoctorId) {
      return NextResponse.json(
        { error: "No active physician found in the system to assign this clinical note" },
        { status: 400 }
      );
    }

    const consultationNumber = await generateNextConsultationNumber();
    const performerName = `${user.firstName} ${user.lastName}`.trim();

    const result = await prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.create({
        data: {
          consultationNumber,
          patientId,
          doctorId: resolvedDoctorId!,
          presentingComplaints: data.presentingComplaints?.trim() || null,
          provisionalDiagnosis: data.provisionalDiagnosis?.trim() || null,
          finalDiagnosis: data.finalDiagnosis?.trim() || null,
          medicalHistory: data.medicalHistory?.trim() || null,
          medicationHistory: data.medicationHistory?.trim() || null,
          physicalExamination: data.physicalExamination?.trim() || null,
          investigations: data.investigations?.trim() || null,
          treatmentPlan: data.treatmentPlan?.trim() || null,
          status: "COMPLETED",
        },
        include: {
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
        },
      });

      // Update active admission with latest diagnosis if any
      const activeAdmission = await tx.admission.findFirst({
        where: {
          patientId,
          status: { in: ["ADMITTED", "UNDER_TREATMENT"] },
        },
        orderBy: { admissionDate: "desc" },
      });

      if (activeAdmission) {
        await tx.admission.update({
          where: { id: activeAdmission.id },
          data: {
            provisionalDiagnosis: data.provisionalDiagnosis?.trim() || activeAdmission.provisionalDiagnosis,
            finalDiagnosis: data.finalDiagnosis?.trim() || activeAdmission.finalDiagnosis,
            treatmentPlan: data.treatmentPlan?.trim() || activeAdmission.treatmentPlan,
            medicationHistory: data.medicationHistory?.trim() || activeAdmission.medicationHistory,
          },
        });
      }

      // Record Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId,
          title: `Doctor Clinical Note / Consultation (${consultationNumber})`,
          description: `Recorded by ${performerName} (${user.role}). Prov: ${data.provisionalDiagnosis || "N/A"}. Plan: ${data.treatmentPlan || "N/A"}`,
          eventType: "CONSULTATION_COMPLETED",
          entityId: consultation.id,
          performerName,
          performerRole: user.role,
        },
      });

      return consultation;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Doctor clinical note saved successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/staff/patients/[id]/doctor-notes:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record doctor note" },
      { status: 500 }
    );
  }
}
