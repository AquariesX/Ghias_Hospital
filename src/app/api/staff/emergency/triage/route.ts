import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staff-auth";

const emergencyTriageSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  chiefComplaint: z.string().min(2, "Chief complaint is required").max(1000),
  priority: z.enum(["NORMAL", "URGENT", "HIGH", "CRITICAL"]),
  painScore: z.number().int().min(0).max(10).optional().nullable(),
  generalCondition: z.string().max(100).optional().nullable(),
  observations: z.string().max(2000).optional().nullable(),

  // Optional triage vitals
  systolicBP: z.number().int().min(40).max(300).optional().nullable(),
  diastolicBP: z.number().int().min(30).max(200).optional().nullable(),
  pulse: z.number().int().min(20).max(250).optional().nullable(),
  temperature: z.number().min(80).max(115).optional().nullable(),
  oxygenSaturation: z.number().int().min(0).max(100).optional().nullable(),
  respiratoryRate: z.number().int().min(4).max(80).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // Strictly require EMERGENCY nurse access
    const { user, staff } = await requireStaffAuth(request, {
      requiredDepartment: "EMERGENCY",
      requireNurse: true,
    });

    const body = await request.json();
    const parseResult = emergencyTriageSchema.safeParse(body);

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

    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, firstName: true, lastName: true, mrNumber: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const nurseFullName = `${staff.firstName} ${staff.lastName}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Emergency Triage record
      const triage = await tx.emergencyTriage.create({
        data: {
          patient: { connect: { id: data.patientId } },
          chiefComplaint: data.chiefComplaint,
          priority: data.priority,
          painScore: data.painScore,
          generalCondition: data.generalCondition,
          observations: data.observations,
          systolicBP: data.systolicBP,
          diastolicBP: data.diastolicBP,
          pulse: data.pulse,
          temperature: data.temperature,
          oxygenSaturation: data.oxygenSaturation,
          respiratoryRate: data.respiratoryRate,
          triagedById: user.id,
          triagedByName: nurseFullName,
        },
      });

      // 2. If vitals provided, create an Emergency VitalSign record
      const hasVitals =
        data.systolicBP !== undefined ||
        data.pulse !== undefined ||
        data.temperature !== undefined ||
        data.oxygenSaturation !== undefined;

      if (hasVitals) {
        await tx.vitalSign.create({
          data: {
            patient: { connect: { id: data.patientId } },
            encounterType: "EMERGENCY",
            systolicBP: data.systolicBP,
            diastolicBP: data.diastolicBP,
            pulse: data.pulse,
            temperature: data.temperature,
            respiratoryRate: data.respiratoryRate,
            oxygenSaturation: data.oxygenSaturation,
            painScore: data.painScore,
            generalCondition: data.generalCondition,
            observations: `Triage: ${data.chiefComplaint}. ${data.observations || ""}`.trim(),
            recordedById: user.id,
            recordedByName: nurseFullName,
            recordedByRole: "NURSE",
          },
        });
      }

      // 3. Create Timeline Event
      await tx.timelineEvent.create({
        data: {
          patient: { connect: { id: data.patientId } },
          title: `Emergency Triage: ${data.priority} Priority`,
          description: `Chief Complaint: ${data.chiefComplaint} | Triaged by ${nurseFullName}`,
          eventType: "EMERGENCY_TRIAGE_RECORDED",
          entityId: triage.id,
          performerName: nurseFullName,
          performerRole: "NURSE",
        },
      });

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userName: nurseFullName,
          userRole: "NURSE",
          action: "CREATE_EMERGENCY_TRIAGE",
          entity: "EmergencyTriage",
          entityId: triage.id,
          newValue: JSON.stringify({
            priority: data.priority,
            chiefComplaint: data.chiefComplaint,
            painScore: data.painScore,
          }),
        },
      });

      return triage;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Emergency triage recorded successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in POST /api/staff/emergency/triage:", error);
    return NextResponse.json(
      { error: "Failed to record emergency triage" },
      { status: 500 }
    );
  }
}
