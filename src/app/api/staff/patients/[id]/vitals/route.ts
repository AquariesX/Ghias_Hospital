import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staff-auth";

const recordVitalsSchema = z.object({
  systolicBP: z.number().int().min(40).max(300).optional().nullable(),
  diastolicBP: z.number().int().min(30).max(200).optional().nullable(),
  pulse: z.number().int().min(20).max(250).optional().nullable(),
  temperature: z.number().min(80).max(115).optional().nullable(),
  respiratoryRate: z.number().int().min(4).max(80).optional().nullable(),
  oxygenSaturation: z.number().int().min(0).max(100).optional().nullable(),
  weight: z.number().positive().max(500).optional().nullable(),
  height: z.number().positive().max(300).optional().nullable(),
  painScore: z.number().int().min(0).max(10).optional().nullable(),
  generalCondition: z.string().max(100).optional().nullable(),
  observations: z.string().max(1000).optional().nullable(),
  admissionId: z.string().uuid().optional().nullable(),
  consultationId: z.string().uuid().optional().nullable(),
  encounterType: z.enum(["OPD", "EMERGENCY", "INPATIENT"]).optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffAuth(request, { requireNurse: true });
    const { id } = await params;

    const vitals = await prisma.vitalSign.findMany({
      where: { patientId: id },
      orderBy: { recordedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: vitals,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in GET /api/staff/patients/[id]/vitals:", error);
    return NextResponse.json(
      { error: "Failed to retrieve vital signs history" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, staff } = await requireStaffAuth(request, { requireNurse: true });
    const { id: patientId } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, mrNumber: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const body = await request.json();
    const parseResult = recordVitalsSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Calculate BMI if weight (kg) and height (cm) are provided
    let bmi: number | null = null;
    if (data.weight && data.height && data.height > 0) {
      const heightInMeters = data.height / 100;
      bmi = parseFloat(
        (data.weight / (heightInMeters * heightInMeters)).toFixed(2)
      );
    }

    const encounterType =
      data.encounterType || staff.nurseDepartment || "OPD";
    const nurseFullName = `${staff.firstName} ${staff.lastName}`;

    // Execute atomic transaction to record vitals, timeline event, and audit log
    const result = await prisma.$transaction(async (tx) => {
      // Create new append-only VitalSign record
      const vitalSign = await tx.vitalSign.create({
        data: {
          patient: { connect: { id: patientId } },
          admission: data.admissionId ? { connect: { id: data.admissionId } } : undefined,
          consultation: data.consultationId ? { connect: { id: data.consultationId } } : undefined,
          encounterType,
          systolicBP: data.systolicBP,
          diastolicBP: data.diastolicBP,
          pulse: data.pulse,
          temperature: data.temperature,
          respiratoryRate: data.respiratoryRate,
          oxygenSaturation: data.oxygenSaturation,
          weight: data.weight,
          height: data.height,
          bmi,
          painScore: data.painScore,
          generalCondition: data.generalCondition,
          observations: data.observations,
          recordedById: user.id,
          recordedByName: nurseFullName,
          recordedByRole: "NURSE",
        },
      });

      // Format vital summary for timeline
      const summaryParts = [];
      if (data.systolicBP && data.diastolicBP) summaryParts.push(`BP ${data.systolicBP}/${data.diastolicBP}`);
      if (data.pulse) summaryParts.push(`Pulse ${data.pulse} bpm`);
      if (data.temperature) summaryParts.push(`Temp ${data.temperature}°F`);
      if (data.oxygenSaturation) summaryParts.push(`SpO2 ${data.oxygenSaturation}%`);
      if (bmi) summaryParts.push(`BMI ${bmi}`);

      // Log timeline event
      await tx.timelineEvent.create({
        data: {
          patient: { connect: { id: patientId } },
          title: `Vital Signs Recorded (${encounterType})`,
          description: summaryParts.length > 0 ? summaryParts.join(" | ") : "Baseline vitals recorded",
          eventType: "VITALS_RECORDED",
          entityId: vitalSign.id,
          performerName: nurseFullName,
          performerRole: "NURSE",
        },
      });

      // Log system audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userName: nurseFullName,
          userRole: "NURSE",
          action: "RECORD_VITALS",
          entity: "VitalSign",
          entityId: vitalSign.id,
          newValue: JSON.stringify({
            bp: data.systolicBP && data.diastolicBP ? `${data.systolicBP}/${data.diastolicBP}` : null,
            pulse: data.pulse,
            temp: data.temperature,
            spO2: data.oxygenSaturation,
            bmi,
            encounterType,
          }),
        },
      });

      return vitalSign;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Vital signs recorded successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in POST /api/staff/patients/[id]/vitals:", error);
    return NextResponse.json(
      { error: "Failed to record vital signs" },
      { status: 500 }
    );
  }
}
