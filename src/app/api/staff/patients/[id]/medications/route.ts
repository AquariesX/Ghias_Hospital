import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MedicationAdminStatus } from "@prisma/client";

const addMedicationSchema = z.object({
  medicineName: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  route: z.string().default("Oral"),
  frequency: z.string().default("Once"),
  status: z.enum(["GIVEN", "MISSED", "REFUSED", "HELD"]).default("GIVEN"),
  administeredAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  admissionId: z.string().optional().nullable(),
  medicationHistory: z.string().optional().nullable(),
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

    const { id } = await params;

    const [administrations, prescriptions, admissions, emergencyTriages] = await Promise.all([
      prisma.medicationAdministration.findMany({
        where: { patientId: id },
        orderBy: { administeredAt: "desc" },
        take: 50,
      }),
      prisma.prescription.findMany({
        where: { patientId: id },
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          doctor: { select: { firstName: true, lastName: true, specialization: true } },
        },
        take: 20,
      }),
      prisma.admission.findMany({
        where: { patientId: id },
        select: {
          id: true,
          admissionNumber: true,
          medicationHistory: true,
          dischargeMedications: true,
          admissionDate: true,
        },
        take: 10,
      }),
      prisma.emergencyTriage.findMany({
        where: { patientId: id },
        select: {
          id: true,
          medicationSheet: true,
          triagedAt: true,
          triagedByName: true,
        },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        administrations,
        prescriptions,
        admissions,
        emergencyTriages,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/staff/patients/[id]/medications:", error);
    return NextResponse.json({ error: "Failed to fetch medications" }, { status: 500 });
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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id: patientId } = await params;
    const body = await request.json();
    const parseResult = addMedicationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const performerName = `${user.firstName} ${user.lastName}`.trim();
    const administeredAtDate = data.administeredAt ? new Date(data.administeredAt) : new Date();

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
          error: "Patient file is locked and read-only. Medications and medication history cannot be modified after patient discharge.",
        },
        { status: 403 }
      );
    }

    const activeAdmission = patient.admissions.find((a) =>
      ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"].includes(a.status)
    );
    const resolvedAdmissionId = data.admissionId || activeAdmission?.id || null;

    const result = await prisma.$transaction(async (tx) => {
      let administration = null;

      // 1. If medicineName is provided, create MedicationAdministration record
      if (data.medicineName && data.medicineName.trim()) {
        administration = await tx.medicationAdministration.create({
          data: {
            patientId,
            admissionId: resolvedAdmissionId,
            medicineName: data.medicineName.trim(),
            dosage: data.dosage?.trim() || "Standard",
            route: data.route,
            status: data.status as MedicationAdminStatus,
            administeredAt: administeredAtDate,
            administeredById: user.id,
            administeredByName: performerName,
            notes: data.notes || data.instructions || `${data.frequency} - Recorded by ${performerName}`,
          },
        });

        // Record Timeline Event
        await tx.timelineEvent.create({
          data: {
            patientId,
            title: `Medication: ${data.medicineName} (${data.dosage || "Standard"}) - ${data.status}`,
            description: `Route: ${data.route} | Frequency: ${data.frequency} | Recorded by ${performerName} (${user.role})`,
            eventType: "MEDICATION_ADMINISTERED",
            entityId: administration.id,
            performerName,
            performerRole: user.role,
          },
        });
      }

      // 2. If medicationHistory text is provided, update active admission or latest consultation
      if (data.medicationHistory && data.medicationHistory.trim()) {
        if (resolvedAdmissionId) {
          await tx.admission.update({
            where: { id: resolvedAdmissionId },
            data: { medicationHistory: data.medicationHistory.trim() },
          });
        }

        await tx.timelineEvent.create({
          data: {
            patientId,
            title: `Patient Medication History Updated`,
            description: `${data.medicationHistory.trim().slice(0, 180)}... Recorded by ${performerName}`,
            eventType: "CLINICAL_NOTE_ADDED",
            performerName,
            performerRole: user.role,
          },
        });
      }

      return administration || { updatedHistory: true };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Medication details successfully recorded",
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/staff/patients/[id]/medications:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record medication" },
      { status: 500 }
    );
  }
}
