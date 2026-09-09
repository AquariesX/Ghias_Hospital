import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { AdmissionStatus } from "@prisma/client";

const updateAdmissionSchema = z.object({
  status: z.enum([
    "ADMITTED",
    "UNDER_TREATMENT",
    "DISCHARGE_PENDING",
    "TRANSFERRED",
    "DISCHARGED",
    "REFERRED",
    "CANCELLED",
  ]).optional(),
  roomBedNo: z.string().min(1).optional(),

  // Clinical initial assessment fields
  presentingComplaints: z.string().optional().nullable(),
  medicationHistory: z.string().optional().nullable(),
  familyHistory: z.string().optional().nullable(),
  allergies: z.array(z.string()).optional(),

  pulse: z.number().int().optional().nullable(),
  temperature: z.number().optional().nullable(),
  systolicBP: z.number().int().optional().nullable(),
  diastolicBP: z.number().int().optional().nullable(),
  respiratoryRate: z.number().int().optional().nullable(),
  weight: z.number().optional().nullable(),
  height: z.number().optional().nullable(),

  generalExamination: z.string().optional().nullable(),
  provisionalDiagnosis: z.string().optional().nullable(),
  investigations: z.string().optional().nullable(),
  finalDiagnosis: z.string().optional().nullable(),
  operation: z.string().optional().nullable(),

  nutritionalStatus: z.string().optional().nullable(),
  advisedDiet: z.string().optional().nullable(),
  treatmentPlan: z.string().optional().nullable(),

  // Discharge fields
  dischargeSummary: z.string().optional().nullable(),
  dischargeInstructions: z.string().optional().nullable(),
  dischargeMedications: z.string().optional().nullable(),
  followUpInstructions: z.string().optional().nullable(),
  dischargeReferralNote: z.string().optional().nullable(),
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

    if (!canViewPatients(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    const admission = await prisma.admission.findFirst({
      where: {
        OR: [{ id }, { admissionNumber: id }],
      },
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
            email: true,
            address: true,
            bloodGroup: true,
            allergies: true,
            chronicConditions: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            emergencyContactRelation: true,
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
            roomNumber: true,
            email: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 30,
        },
        nursingNotes: {
          orderBy: { recordedAt: "desc" },
          take: 30,
        },
        medicationAdministrations: {
          orderBy: { administeredAt: "desc" },
          take: 50,
        },
        prescriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
            doctor: {
              select: {
                firstName: true,
                lastName: true,
                doctorNumber: true,
              },
            },
          },
        },
        statements: {
          include: {
            statement: true,
          },
        },
      },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission record not found" }, { status: 404 });
    }

    // IDOR Protection: Nurse can only access admissions matching their nurseDepartment
    if (user.role === "NURSE") {
      const staff = await prisma.staff.findFirst({
        where: { OR: [{ userId: user.id }, { email: user.email }] },
        select: { nurseDepartment: true, role: true },
      });
      if (staff?.nurseDepartment && admission.admissionSource !== staff.nurseDepartment) {
        return NextResponse.json(
          {
            error: `Forbidden: Patient was admitted via ${admission.admissionSource}. You only have access to ${staff.nurseDepartment} admissions.`,
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: admission,
      admission,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("GET /api/admissions/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch admission details" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const isNurse = user.role === "NURSE";
    const isDoctor = user.role === "DOCTOR";
    const isAdmin = user.role === "ADMIN";
    const isStaffOrRecep = user.role === "RECEPTIONIST" || user.role === "STAFF";

    if (!isNurse && !isDoctor && !isAdmin && !isStaffOrRecep) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateAdmissionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.admission.findFirst({
      where: { OR: [{ id }, { admissionNumber: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    // IDOR Protection: Nurse can only update admissions matching their nurseDepartment
    if (isNurse) {
      const staff = await prisma.staff.findFirst({
        where: { OR: [{ userId: user.id }, { email: user.email }] },
        select: { nurseDepartment: true, role: true },
      });
      if (staff?.nurseDepartment && existing.admissionSource !== staff.nurseDepartment) {
        return NextResponse.json(
          {
            error: `Forbidden: Patient was admitted via ${existing.admissionSource}. You only have access to ${staff.nurseDepartment} admissions.`,
          },
          { status: 403 }
        );
      }
    }

    const val = result.data;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Admission record
      const adm = await tx.admission.update({
        where: { id: existing.id },
        data: {
          status: val.status ? (val.status as AdmissionStatus) : undefined,
          roomBedNo: val.roomBedNo ? val.roomBedNo.trim() : undefined,
          presentingComplaints: val.presentingComplaints !== undefined ? val.presentingComplaints : undefined,
          medicationHistory: val.medicationHistory !== undefined ? val.medicationHistory : undefined,
          familyHistory: val.familyHistory !== undefined ? val.familyHistory : undefined,
          allergies: val.allergies !== undefined ? val.allergies : undefined,
          pulse: val.pulse !== undefined ? val.pulse : undefined,
          temperature: val.temperature !== undefined ? val.temperature : undefined,
          systolicBP: val.systolicBP !== undefined ? val.systolicBP : undefined,
          diastolicBP: val.diastolicBP !== undefined ? val.diastolicBP : undefined,
          weight: val.weight !== undefined ? val.weight : undefined,
          height: val.height !== undefined ? val.height : undefined,
          generalExamination: val.generalExamination !== undefined ? val.generalExamination : undefined,
          provisionalDiagnosis: val.provisionalDiagnosis !== undefined ? val.provisionalDiagnosis : undefined,
          investigations: val.investigations !== undefined ? val.investigations : undefined,
          finalDiagnosis: val.finalDiagnosis !== undefined ? val.finalDiagnosis : undefined,
          operation: val.operation !== undefined ? val.operation : undefined,
          nutritionalStatus: val.nutritionalStatus !== undefined ? val.nutritionalStatus : undefined,
          advisedDiet: val.advisedDiet !== undefined ? val.advisedDiet : undefined,
          treatmentPlan: val.treatmentPlan !== undefined ? val.treatmentPlan : undefined,
          dischargeSummary: val.dischargeSummary !== undefined ? val.dischargeSummary : undefined,
          dischargeInstructions: val.dischargeInstructions !== undefined ? val.dischargeInstructions : undefined,
          dischargeMedications: val.dischargeMedications !== undefined ? val.dischargeMedications : undefined,
          followUpInstructions: val.followUpInstructions !== undefined ? val.followUpInstructions : undefined,
          dischargeReferralNote: val.dischargeReferralNote !== undefined ? val.dischargeReferralNote : undefined,
        },
        include: {
          patient: { select: { firstName: true, lastName: true, mrNumber: true } },
          doctor: { select: { firstName: true, lastName: true, specialization: true } },
        },
      });

      // 2. If vitals provided, record VitalSign entry linked to Admission & Nurse
      if (val.pulse || val.temperature || val.systolicBP || val.diastolicBP || val.respiratoryRate) {
        await tx.vitalSign.create({
          data: {
            patientId: existing.patientId,
            admissionId: existing.id,
            encounterType: "INPATIENT",
            systolicBP: val.systolicBP || null,
            diastolicBP: val.diastolicBP || null,
            pulse: val.pulse || null,
            temperature: val.temperature ? val.temperature : null,
            respiratoryRate: val.respiratoryRate || null,
            weight: val.weight ? val.weight : null,
            height: val.height ? val.height : null,
            generalCondition: "Under observation",
            observations: isNurse ? "Recorded during nurse initial inpatient assessment" : "Recorded during inpatient clinical review",
            recordedById: user.id,
            recordedByName: `${user.firstName} ${user.lastName}`,
            recordedByRole: user.role,
          },
        });
      }

      // 3. Add timeline event
      await tx.timelineEvent.create({
        data: {
          patientId: existing.patientId,
          title: isNurse ? "Nurse Assessment Recorded" : "Clinical Assessment Updated",
          eventType: isNurse ? "NURSE_NOTE" : "TREATMENT_PLAN_UPDATED",
          description: `Inpatient clinical record updated for Admission #${existing.admissionNumber}.`,
          entityId: existing.id,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      return adm;
    });

    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "UPDATE_ADMISSION",
      entity: "Admission",
      entityId: existing.id,
      oldValue: JSON.stringify({ status: existing.status, roomBedNo: existing.roomBedNo }),
      newValue: JSON.stringify({ status: updated.status, roomBedNo: updated.roomBedNo }),
    });

    return NextResponse.json({
      success: true,
      message: "Admission updated successfully",
      data: updated,
      admission: updated,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("PUT /api/admissions/[id] error:", error);
    return NextResponse.json({ error: "Failed to update admission" }, { status: 500 });
  }
}
