import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { generateNextReferralNumber } from "@/lib/referral-number";
import { AdmissionStatus, BedStatus, PatientStatus } from "@prisma/client";

const treatmentItemSchema = z.object({
  srNo: z.number().optional(),
  medicine: z.string().min(1, "Medicine name is required"),
  dose: z.string().optional().default(""),
  route: z.string().optional().default("Oral"),
  frequency: z.string().optional().default(""),
  timing: z.string().optional().default(""),
  duration: z.string().optional().default(""),
});

const createReferralSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  admissionId: z.string().uuid("Invalid admission ID").optional().nullable(),
  doctorId: z.string().uuid("Invalid doctor ID").optional().nullable(),
  referralDate: z.string().optional(),
  referralTime: z.string().optional(),
  hospitalReferredTo: z.string().min(2, "Hospital name to be referred is required"),
  reasonOfReferral: z.string().min(2, "Reason for referral is required"),
  presentingComplaints: z.string().optional().nullable(),
  provisionalDiagnosis: z.string().optional().nullable(),
  historyAndExamination: z.string().optional().nullable(),
  investigations: z.string().optional().nullable(),
  finalDiagnosis: z.string().optional().nullable(),
  procedureDone: z.string().optional().nullable(),
  conditionAtReferral: z.enum(["Satisfactory", "Fair", "Poor"]).default("Satisfactory"),
  referralNotes: z.string().optional().nullable(),
  treatmentGiven: z.array(treatmentItemSchema).optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const patientId = searchParams.get("patientId")?.trim() || "";

    const where: any = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (search) {
      where.OR = [
        { referralNumber: { contains: search, mode: "insensitive" } },
        { hospitalReferredTo: { contains: search, mode: "insensitive" } },
        { reasonOfReferral: { contains: search, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { mrNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { cnic: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, referrals] = await Promise.all([
      prisma.patientReferral.count({ where }),
      prisma.patientReferral.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: {
            select: {
              id: true,
              mrNumber: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              gender: true,
              dateOfBirth: true,
              phone: true,
            },
          },
          admission: {
            select: {
              id: true,
              admissionNumber: true,
              admissionDate: true,
              roomBedNo: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      referrals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/referrals error:", error);
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF", "DOCTOR", "NURSE"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = createReferralSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // IDOR verification: Check patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Target patient does not exist." }, { status: 404 });
    }

    // IDOR verification: If admissionId provided, verify it belongs to this patient
    let admission = null;
    if (data.admissionId) {
      admission = await prisma.admission.findUnique({
        where: { id: data.admissionId },
      });

      if (!admission) {
        return NextResponse.json({ error: "Referenced admission record not found." }, { status: 404 });
      }

      if (admission.patientId !== patient.id) {
        return NextResponse.json(
          { error: "Security Violation: Admission record does not match selected patient." },
          { status: 400 }
        );
      }
    }

    // Attending doctor lookup
    let doctorName: string | null = null;
    if (data.doctorId) {
      const doc = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
      if (doc) doctorName = `Dr. ${doc.firstName} ${doc.lastName}`;
    } else if (admission?.doctorId) {
      const doc = await prisma.doctor.findUnique({ where: { id: admission.doctorId } });
      if (doc) doctorName = `Dr. ${doc.firstName} ${doc.lastName}`;
    }

    const referralNumber = await generateNextReferralNumber();
    const now = new Date();
    const effectiveDate = data.referralDate ? new Date(data.referralDate) : now;
    const effectiveTime =
      data.referralTime ||
      now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    // Execute atomic creation transaction
    const referral = await prisma.$transaction(async (tx) => {
      // Create PatientReferral
      const newRef = await tx.patientReferral.create({
        data: {
          referralNumber,
          patientId: patient.id,
          admissionId: admission?.id || null,
          doctorId: data.doctorId || admission?.doctorId || null,
          doctorName,
          referralDate: effectiveDate,
          referralTime: effectiveTime,
          hospitalReferredTo: data.hospitalReferredTo.trim(),
          reasonOfReferral: data.reasonOfReferral.trim(),
          presentingComplaints: data.presentingComplaints?.trim() || null,
          provisionalDiagnosis: data.provisionalDiagnosis?.trim() || null,
          historyAndExamination: data.historyAndExamination?.trim() || null,
          investigations: data.investigations?.trim() || null,
          finalDiagnosis: data.finalDiagnosis?.trim() || null,
          procedureDone: data.procedureDone?.trim() || null,
          conditionAtReferral: data.conditionAtReferral,
          referralNotes: data.referralNotes?.trim() || null,
          treatmentGiven: JSON.stringify(data.treatmentGiven),
          createdById: user.id,
        },
        include: {
          patient: true,
          admission: true,
          doctor: true,
        },
      });

      // 2. Update Patient status to REFERRED so it appears as REFERRED across the system and directory
      await tx.patient.update({
        where: { id: patient.id },
        data: { status: PatientStatus.REFERRED },
      });

      // 3. If admission is provided or patient has an active admission, mark it REFERRED and release assigned bed
      let activeAdmissionToUpdate = admission;
      if (!activeAdmissionToUpdate) {
        activeAdmissionToUpdate = await tx.admission.findFirst({
          where: {
            patientId: patient.id,
            status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
          },
        });
      }

      if (activeAdmissionToUpdate && activeAdmissionToUpdate.status !== AdmissionStatus.REFERRED) {
        await tx.admission.update({
          where: { id: activeAdmissionToUpdate.id },
          data: {
            status: AdmissionStatus.REFERRED,
            dischargeDate: effectiveDate,
            dischargeTime: effectiveTime,
            dischargeReferralNote: `Patient referred to ${data.hospitalReferredTo}. Reason: ${data.reasonOfReferral}`,
          },
        });

        // Release bed back to FREE for immediate availability
        if (activeAdmissionToUpdate.bedId) {
          await tx.bed.update({
            where: { id: activeAdmissionToUpdate.bedId },
            data: { status: BedStatus.FREE },
          });
        }
      }

      // Record Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId: patient.id,
          title: "Patient Referral Issued",
          eventType: "REFERRAL_FORM_CREATED",
          description: `Referral Form (${referralNumber}) issued to ${data.hospitalReferredTo}. Reason: ${data.reasonOfReferral}. Condition: ${data.conditionAtReferral}.`,
          entityId: newRef.id,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      return newRef;
    });

    // Record Audit Log
    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "CREATE_REFERRAL_FORM",
      entity: "PatientReferral",
      entityId: referral.id,
      newValue: JSON.stringify({
        referralNumber: referral.referralNumber,
        patientMrNumber: patient.mrNumber,
        hospitalReferredTo: referral.hospitalReferredTo,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Referral Form created successfully",
        referral,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/referrals error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create referral form";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
