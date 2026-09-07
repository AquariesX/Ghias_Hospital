import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDoctorAuth } from "@/lib/doctor-auth";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

interface RecordVitalsPayload {
  patientId: string;
  consultationId?: string;
  systolicBP?: number | null;
  diastolicBP?: number | null;
  pulse?: number | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weight?: number | null;
  height?: number | null;
  painScore?: number | null;
  generalCondition?: string | null;
  observations?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { user, doctor } = await requireDoctorAuth(request);
    const body: RecordVitalsPayload = await request.json();

    if (!body.patientId) {
      return NextResponse.json(
        { error: "Validation Error: Patient ID is required to record vitals" },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient record not found" },
        { status: 404 }
      );
    }

    // Backend validations
    const errors: string[] = [];

    if (body.systolicBP !== undefined && body.systolicBP !== null) {
      if (body.systolicBP < 30 || body.systolicBP > 300) {
        errors.push("Systolic Blood Pressure must be between 30 and 300 mmHg");
      }
    }

    if (body.diastolicBP !== undefined && body.diastolicBP !== null) {
      if (body.diastolicBP < 20 || body.diastolicBP > 200) {
        errors.push("Diastolic Blood Pressure must be between 20 and 200 mmHg");
      }
    }

    if (body.pulse !== undefined && body.pulse !== null) {
      if (body.pulse < 20 || body.pulse > 250) {
        errors.push("Pulse must be between 20 and 250 bpm");
      }
    }

    if (body.oxygenSaturation !== undefined && body.oxygenSaturation !== null) {
      if (body.oxygenSaturation < 0 || body.oxygenSaturation > 100) {
        errors.push("Oxygen Saturation (SpO2) must be between 0% and 100%");
      }
    }

    if (body.painScore !== undefined && body.painScore !== null) {
      if (body.painScore < 0 || body.painScore > 10) {
        errors.push("Pain Score must be between 0 and 10");
      }
    }

    if (body.weight !== undefined && body.weight !== null && body.weight <= 0) {
      errors.push("Weight must be a positive value (kg)");
    }

    if (body.height !== undefined && body.height !== null && body.height <= 0) {
      errors.push("Height must be a positive value (cm)");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(". ") },
        { status: 400 }
      );
    }

    // Auto-calculate BMI if height and weight available
    let bmiValue: number | null = null;
    if (body.weight && body.height && body.height > 0) {
      const heightInMeters = body.height / 100;
      const rawBmi = body.weight / (heightInMeters * heightInMeters);
      bmiValue = Math.round(rawBmi * 100) / 100;
    }

    const vitalSign = await prisma.$transaction(async (tx) => {
      const created = await tx.vitalSign.create({
        data: {
          patient: { connect: { id: patient.id } },
          consultation: body.consultationId ? { connect: { id: body.consultationId } } : undefined,
          encounterType: "OPD",
          systolicBP: body.systolicBP !== undefined && body.systolicBP !== null ? Math.round(body.systolicBP) : null,
          diastolicBP: body.diastolicBP !== undefined && body.diastolicBP !== null ? Math.round(body.diastolicBP) : null,
          pulse: body.pulse !== undefined && body.pulse !== null ? Math.round(body.pulse) : null,
          temperature: body.temperature !== undefined && body.temperature !== null ? new Prisma.Decimal(body.temperature) : null,
          respiratoryRate: body.respiratoryRate !== undefined && body.respiratoryRate !== null ? Math.round(body.respiratoryRate) : null,
          oxygenSaturation: body.oxygenSaturation !== undefined && body.oxygenSaturation !== null ? Math.round(body.oxygenSaturation) : null,
          weight: body.weight !== undefined && body.weight !== null ? new Prisma.Decimal(body.weight) : null,
          height: body.height !== undefined && body.height !== null ? new Prisma.Decimal(body.height) : null,
          bmi: bmiValue !== null ? new Prisma.Decimal(bmiValue) : null,
          painScore: body.painScore !== undefined && body.painScore !== null ? Math.round(body.painScore) : null,
          generalCondition: body.generalCondition?.trim() || null,
          observations: body.observations?.trim() || null,
          recordedById: user.id,
          recordedByName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
          recordedByRole: "DOCTOR",
        },
      });

      // Timeline event
      const summaryParts: string[] = [];
      if (body.systolicBP && body.diastolicBP) summaryParts.push(`BP: ${body.systolicBP}/${body.diastolicBP}`);
      if (body.pulse) summaryParts.push(`HR: ${body.pulse} bpm`);
      if (body.temperature) summaryParts.push(`Temp: ${body.temperature}°`);
      if (body.oxygenSaturation) summaryParts.push(`SpO2: ${body.oxygenSaturation}%`);
      if (bmiValue) summaryParts.push(`BMI: ${bmiValue}`);

      await tx.timelineEvent.create({
        data: {
          patientId: patient.id,
          eventType: "VITALS_RECORDED",
          title: "Vital Signs Recorded",
          description: `Dr. ${doctor.firstName} ${doctor.lastName} recorded vitals: ${summaryParts.join(" | ") || "Clinical vital metrics"}`,
          entityId: created.id,
          performerName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
          performerRole: "DOCTOR",
        },
      });

      return created;
    });

    await createAuditLog({
      action: "RECORD_VITALS",
      entity: "VitalSign",
      entityId: vitalSign.id,
      userId: user.id,
      userRole: user.role,
      userName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      newValue: JSON.stringify({
        patientId: patient.id,
        bmi: bmiValue,
      }),
    });

    return NextResponse.json({
      success: true,
      vitalSign,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error recording vital signs:", error);
    return NextResponse.json(
      { error: "Internal Server Error recording vital signs" },
      { status: 500 }
    );
  }
}
