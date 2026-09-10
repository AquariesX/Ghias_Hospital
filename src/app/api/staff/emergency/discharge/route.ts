import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const dischargeSchema = z.object({
  triageId: z.string().uuid("Invalid triage ID"),
  admissionId: z.string().optional().nullable(),
  dischargeDateTime: z.string().optional().nullable(),
  dischargeCondition: z.enum([
    "Satisfactory / Discharged Home",
    "Stable",
    "Transferred to IPD Ward",
    "Referred to Higher Facility",
    "LAMA (Left Against Medical Advice)",
    "Deceased",
  ]).default("Satisfactory / Discharged Home"),
  dischargeSummary: z.string().max(2000).optional().nullable(),
  dischargeInstructions: z.string().max(2000).optional().nullable(),
  dischargeMedications: z.string().max(2000).optional().nullable(),
  finalDiagnosis: z.string().max(2000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const allowedRoles = ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "STAFF"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to discharge patients" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = dischargeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const dischargeDateObj = data.dischargeDateTime ? new Date(data.dischargeDateTime) : new Date();
    const dischargeTimeStr = dischargeDateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const performerName = `${user.firstName} ${user.lastName}`.trim();

    const triage = await prisma.emergencyTriage.findUnique({
      where: { id: data.triageId },
      include: { patient: true, admission: true },
    });

    if (!triage) {
      return NextResponse.json({ error: "Emergency triage record not found" }, { status: 404 });
    }

    const resolvedAdmissionId = data.admissionId || triage.admissionId || triage.admission?.id;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Emergency Triage record with discharge timestamp
      const updatedTriage = await tx.emergencyTriage.update({
        where: { id: data.triageId },
        data: {
          dischargeDateTime: dischargeDateObj,
          finalDiagnosis: data.finalDiagnosis || triage.finalDiagnosis,
          observations: data.dischargeSummary
            ? `${triage.observations || ""}\n[Discharge]: ${data.dischargeSummary}`.trim()
            : triage.observations,
        },
      });

      // 2. If Admission is linked, close admission
      if (resolvedAdmissionId) {
        await tx.admission.update({
          where: { id: resolvedAdmissionId },
          data: {
            status: data.dischargeCondition === "Transferred to IPD Ward" ? "TRANSFERRED" : "DISCHARGED",
            dischargeDate: dischargeDateObj,
            dischargeTime: dischargeTimeStr,
            dischargeCondition: data.dischargeCondition,
            dischargeSummary: data.dischargeSummary,
            dischargeInstructions: data.dischargeInstructions,
            dischargeMedications: data.dischargeMedications,
            finalDiagnosis: data.finalDiagnosis || undefined,
            isLama: data.dischargeCondition === "LAMA (Left Against Medical Advice)",
          },
        });
      }

      // 3. Update Patient status if deceased or discharged
      if (triage.patientId) {
        let newPatientStatus: "ACTIVE" | "DISCHARGED" | "DECEASED" = "DISCHARGED";
        if (data.dischargeCondition === "Deceased") {
          newPatientStatus = "DECEASED";
        } else if (data.dischargeCondition === "Transferred to IPD Ward") {
          newPatientStatus = "ACTIVE";
        }

        await tx.patient.update({
          where: { id: triage.patientId },
          data: {
            status: newPatientStatus,
          },
        });
      }

      // 4. Create Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId: triage.patientId,
          title: `Emergency Patient Discharged (${data.dischargeCondition})`,
          description: `Discharged at ${dischargeDateObj.toLocaleString()} by ${performerName} (${user.role}). Summary: ${data.dischargeSummary || "Routine ER Discharge"}`,
          eventType: "EMERGENCY_DISCHARGE",
          entityId: triage.id,
          performerName,
          performerRole: user.role,
        },
      });

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userName: performerName,
          userRole: user.role,
          action: "DISCHARGE_EMERGENCY_PATIENT",
          entity: "EmergencyTriage",
          entityId: triage.id,
          newValue: JSON.stringify({
            dischargeDateTime: dischargeDateObj,
            dischargeCondition: data.dischargeCondition,
            dischargeSummary: data.dischargeSummary,
          }),
        },
      });

      return updatedTriage;
    });

    return NextResponse.json({
      success: true,
      message: "Patient discharged from emergency successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in POST /api/staff/emergency/discharge:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to discharge emergency patient" },
      { status: 500 }
    );
  }
}
