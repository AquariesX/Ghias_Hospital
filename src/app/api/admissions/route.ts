import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { generateNextAdmissionNumber } from "@/lib/admission-number";
import { AdmissionSource, AdmissionStatus } from "@prisma/client";

const createAdmissionSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  doctorId: z.string().uuid("Invalid doctor ID").optional().nullable(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  admissionTime: z.string().optional().nullable(),
  admissionSource: z.enum(["OPD", "EMERGENCY"]),
  referenceNumber: z.string().optional().nullable(),
  roomBedNo: z.string().min(1, "Room / Bed number is required"),
  presentingComplaints: z.string().optional().nullable(),
  medicationHistory: z.string().optional().nullable(),
  familyHistory: z.string().optional().nullable(),
  allergies: z.array(z.string()).optional(),
  provisionalDiagnosis: z.string().optional().nullable(),
  treatmentPlan: z.string().optional().nullable(),
  // Baseline vitals
  pulse: z.number().int().optional().nullable(),
  temperature: z.number().optional().nullable(),
  systolicBP: z.number().int().optional().nullable(),
  diastolicBP: z.number().int().optional().nullable(),
  weight: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const status = searchParams.get("status") || "";
    const doctorId = searchParams.get("doctorId") || "";
    const patientId = searchParams.get("patientId") || "";
    const search = searchParams.get("search")?.trim() || "";
    const source = searchParams.get("source") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status as AdmissionStatus;
    }
    if (doctorId) {
      where.doctorId = doctorId;
    }
    if (patientId) {
      where.patientId = patientId;
    }
    if (source && (source === "OPD" || source === "EMERGENCY")) {
      where.admissionSource = source as AdmissionSource;
    }

    if (dateFrom || dateTo) {
      where.admissionDate = {};
      if (dateFrom) {
        (where.admissionDate as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.admissionDate as Record<string, unknown>).lte = new Date(dateTo);
      }
    }

    if (search) {
      where.OR = [
        { admissionNumber: { contains: search, mode: "insensitive" } },
        { roomBedNo: { contains: search, mode: "insensitive" } },
        { provisionalDiagnosis: { contains: search, mode: "insensitive" } },
        { finalDiagnosis: { contains: search, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { mrNumber: { contains: search, mode: "insensitive" } },
              { patientNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          },
        },
      ];
    }

    const [total, admissions] = await Promise.all([
      prisma.admission.count({ where }),
      prisma.admission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ admissionDate: "desc" }, { createdAt: "desc" }],
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
              bloodGroup: true,
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
              department: { select: { name: true } },
            },
          },
          _count: {
            select: {
              vitalSigns: true,
              nursingNotes: true,
              medicationAdministrations: true,
              prescriptions: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: admissions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("GET /api/admissions error:", error);
    return NextResponse.json({ error: "Failed to fetch admissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!canViewPatients(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const result = createAdmissionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const val = result.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: val.patientId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Verify doctor if provided
    let doctorName: string | null = null;
    if (val.doctorId) {
      const doctor = await prisma.doctor.findUnique({
        where: { id: val.doctorId },
      });
      if (doctor) {
        doctorName = `Dr. ${doctor.firstName} ${doctor.lastName}`;
      }
    }

    const admissionNumber = await generateNextAdmissionNumber();

    const admission = await prisma.$transaction(async (tx) => {
      const newAdm = await tx.admission.create({
        data: {
          admissionNumber,
          patientId: val.patientId,
          doctorId: val.doctorId || null,
          admissionDate: new Date(val.admissionDate),
          admissionTime: val.admissionTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          admissionSource: val.admissionSource as AdmissionSource,
          referenceNumber: val.referenceNumber || null,
          roomBedNo: val.roomBedNo.trim(),
          presentingComplaints: val.presentingComplaints || null,
          medicationHistory: val.medicationHistory || null,
          familyHistory: val.familyHistory || null,
          allergies: val.allergies || patient.allergies || [],
          provisionalDiagnosis: val.provisionalDiagnosis || null,
          treatmentPlan: val.treatmentPlan || null,
          pulse: val.pulse || null,
          temperature: val.temperature ? val.temperature : null,
          systolicBP: val.systolicBP || null,
          diastolicBP: val.diastolicBP || null,
          weight: val.weight ? val.weight : null,
          height: val.height ? val.height : null,
          status: AdmissionStatus.ADMITTED,
          createdById: user.id,
        },
      });

      // If baseline vitals were provided, record baseline vitalSign row
      if (val.pulse || val.systolicBP || val.diastolicBP || val.temperature) {
        await tx.vitalSign.create({
          data: {
            patientId: val.patientId,
            admissionId: newAdm.id,
            encounterType: "INPATIENT",
            systolicBP: val.systolicBP || null,
            diastolicBP: val.diastolicBP || null,
            pulse: val.pulse || null,
            temperature: val.temperature ? val.temperature : null,
            weight: val.weight ? val.weight : null,
            height: val.height ? val.height : null,
            generalCondition: "Stable",
            observations: "Recorded at hospital admission",
            recordedById: user.id,
            recordedByName: `${user.firstName} ${user.lastName}`,
            recordedByRole: user.role,
          },
        });
      }

      // Add timeline event
      await tx.timelineEvent.create({
        data: {
          patientId: val.patientId,
          title: "Patient Admitted",
          eventType: "PATIENT_ADMITTED",
          description: `Admitted to ${val.roomBedNo} via ${val.admissionSource} (Adm #${admissionNumber})${doctorName ? ` under care of ${doctorName}` : ""}.`,
          entityId: newAdm.id,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      return newAdm;
    });

    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "CREATE_ADMISSION",
      entity: "Admission",
      entityId: admission.id,
      newValue: JSON.stringify({
        admissionNumber: admission.admissionNumber,
        patientName: `${patient.firstName} ${patient.lastName}`,
        roomBedNo: admission.roomBedNo,
        source: admission.admissionSource,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Admission recorded successfully",
        data: admission,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("POST /api/admissions error:", error);
    return NextResponse.json({ error: "Failed to create admission" }, { status: 500 });
  }
}
