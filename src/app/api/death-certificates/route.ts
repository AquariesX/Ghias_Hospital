import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { generateNextDeathCertificateNumber } from "@/lib/death-certificate-number";
import { AdmissionStatus, BedStatus, PatientStatus } from "@prisma/client";

const createDeathCertificateSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  admissionId: z.string().uuid("Invalid admission ID").optional().nullable(),
  doctorId: z.string().uuid("Invalid doctor ID").optional().nullable(),
  dateOfDeath: z.string().min(1, "Date of death is required"),
  timeOfDeath: z.string().min(1, "Time of death is required"),
  causeOfDeath: z.string().min(2, "Cause of death is required"),
  diagnosis: z.string().optional().nullable(),
  bodyReceivedBy: z.string().min(2, "Name of person receiving the body is required"),
  receivedByRelation: z.string().optional().nullable(),
  receivedByCnic: z.string().optional().nullable(),
  receivedByPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
        { certificateNumber: { contains: search, mode: "insensitive" } },
        { causeOfDeath: { contains: search, mode: "insensitive" } },
        { bodyReceivedBy: { contains: search, mode: "insensitive" } },
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

    const [total, certificates] = await Promise.all([
      prisma.deathCertificate.count({ where }),
      prisma.deathCertificate.findMany({
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
      certificates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/death-certificates error:", error);
    return NextResponse.json({ error: "Failed to fetch death certificates" }, { status: 500 });
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
    const parseResult = createDeathCertificateSchema.safeParse(body);

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

    const certificateNumber = await generateNextDeathCertificateNumber();
    const effectiveDate = new Date(data.dateOfDeath);

    // Execute atomic creation transaction
    const certificate = await prisma.$transaction(async (tx) => {
      // 1. Create DeathCertificate record
      const newCert = await tx.deathCertificate.create({
        data: {
          certificateNumber,
          patientId: patient.id,
          admissionId: admission?.id || null,
          doctorId: data.doctorId || admission?.doctorId || null,
          doctorName,
          dateOfDeath: effectiveDate,
          timeOfDeath: data.timeOfDeath.trim(),
          causeOfDeath: data.causeOfDeath.trim(),
          diagnosis: data.diagnosis?.trim() || null,
          bodyReceivedBy: data.bodyReceivedBy.trim(),
          receivedByRelation: data.receivedByRelation?.trim() || null,
          receivedByCnic: data.receivedByCnic?.trim() || null,
          receivedByPhone: data.receivedByPhone?.trim() || null,
          notes: data.notes?.trim() || null,
          createdById: user.id,
        },
        include: {
          patient: true,
          admission: true,
          doctor: true,
        },
      });

      // 2. Update Patient status to DECEASED so it shows Deceased / Death in the Patient Directory
      await tx.patient.update({
        where: { id: patient.id },
        data: { status: PatientStatus.DECEASED },
      });

      // 3. If admission was active, close it as DISCHARGED and automatically release assigned bed to FREE
      let activeAdmissionToClose = admission;
      if (!activeAdmissionToClose) {
        activeAdmissionToClose = await tx.admission.findFirst({
          where: {
            patientId: patient.id,
            status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
          },
        });
      }

      if (activeAdmissionToClose && activeAdmissionToClose.status !== AdmissionStatus.DISCHARGED) {
        await tx.admission.update({
          where: { id: activeAdmissionToClose.id },
          data: {
            status: AdmissionStatus.DISCHARGED,
            dischargeDate: effectiveDate,
            dischargeTime: data.timeOfDeath.trim(),
            dischargeCondition: "Deceased",
            outcome: "Expired / Expired in hospital",
            dischargeSummary: `Patient expired on ${effectiveDate.toLocaleDateString()} at ${data.timeOfDeath}. Cause of death: ${data.causeOfDeath}. Death Certificate #${certificateNumber} issued. Body handed over to ${data.bodyReceivedBy} (${data.receivedByRelation || "Next of kin"}).`,
          },
        });

        // Automatically release assigned bed back to FREE for immediate availability
        if (activeAdmissionToClose.bedId) {
          await tx.bed.update({
            where: { id: activeAdmissionToClose.bedId },
            data: { status: BedStatus.FREE },
          });
        }
      }

      // 4. Record Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId: patient.id,
          title: "Death Certificate Issued",
          eventType: "DEATH_CERTIFICATE_CREATED",
          description: `Death Certificate (${certificateNumber}) issued. Cause of death: ${data.causeOfDeath}. Dead body handed over to ${data.bodyReceivedBy}.`,
          entityId: newCert.id,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      return newCert;
    });

    // Record Audit Log
    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "CREATE_DEATH_CERTIFICATE",
      entity: "DeathCertificate",
      entityId: certificate.id,
      newValue: JSON.stringify({
        certificateNumber: certificate.certificateNumber,
        patientMrNumber: patient.mrNumber,
        causeOfDeath: certificate.causeOfDeath,
        bodyReceivedBy: certificate.bodyReceivedBy,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Death Certificate issued successfully",
        certificate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/death-certificates error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create death certificate";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
