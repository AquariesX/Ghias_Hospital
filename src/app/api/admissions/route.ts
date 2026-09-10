import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { generateNextAdmissionNumber } from "@/lib/admission-number";
import { generateNextPatientNumber } from "@/lib/patient-number";
import { AdmissionSource, AdmissionStatus, BedStatus, Prisma } from "@prisma/client";

const createAdmissionSchema = z.object({
  patientId: z.string().optional().nullable(),
  mrNumber: z.string().optional().nullable(),
  patientName: z.string().optional().nullable(),
  fatherHusbandName: z.string().optional().nullable(),
  relationType: z.string().optional().nullable(),
  age: z.union([z.number(), z.string()]).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  phone: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  admissionDate: z.string().optional().nullable(),
  admissionTime: z.string().optional().nullable(),
  admissionSource: z.enum(["OPD", "EMERGENCY"]),
  referenceNumber: z.string().optional().nullable(),
  bedId: z.string().optional().nullable(),
  roomBedNo: z.string().min(1, "Room / Bed number is required"),
  provisionalDiagnosis: z.string().optional().nullable(),
  finalDiagnosis: z.string().optional().nullable(),
  operation: z.string().optional().nullable(),
  presentingComplaints: z.string().optional().nullable(),
  medicationHistory: z.string().optional().nullable(),
  familyHistory: z.string().optional().nullable(),
  allergies: z.array(z.string()).optional(),
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

    // Strict department visibility enforcement for nurses
    if (user.role === "NURSE") {
      const staff = await prisma.staff.findFirst({
        where: { OR: [{ userId: user.id }, { email: user.email }] },
        select: { nurseDepartment: true, role: true },
      });
      if (staff?.nurseDepartment) {
        where.admissionSource = staff.nurseDepartment;
      }
    } else if (source && (source === "OPD" || source === "EMERGENCY")) {
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
              cnic: true,
              relationType: true,
              relatedPersonName: true,
              emergencyContactName: true,
              emergencyContactPhone: true,
              emergencyContactRelation: true,
              address: true,
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
      admissions: admissions,
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

    // Find or create patient
    let patient = null;
    if (val.patientId) {
      patient = await prisma.patient.findUnique({
        where: { id: val.patientId },
      });
    }

    if (!patient && (val.cnic?.trim() || val.phone?.trim())) {
      const conditions: Prisma.PatientWhereInput[] = [];
      if (val.cnic?.trim()) conditions.push({ cnic: val.cnic.trim() });
      if (val.phone?.trim()) conditions.push({ phone: val.phone.trim() });

      if (conditions.length > 0) {
        patient = await prisma.patient.findFirst({
          where: { OR: conditions },
        });
      }
    }

    if (!patient) {
      if (!val.patientName || !val.patientName.trim()) {
        return NextResponse.json({ error: "Patient Name is required" }, { status: 400 });
      }

      const finalMrNumber = val.mrNumber?.trim();
      if (!finalMrNumber) {
        return NextResponse.json(
          { error: "Medical Record (MR) Number is required for new patient admission." },
          { status: 400 }
        );
      }

      const existingWithMr = await prisma.patient.findUnique({
        where: { mrNumber: finalMrNumber },
      });
      if (existingWithMr) {
        return NextResponse.json(
          { error: `MR Number "${finalMrNumber}" is already registered to another patient (${existingWithMr.firstName} ${existingWithMr.lastName}).` },
          { status: 409 }
        );
      }

      const patientNumber = await generateNextPatientNumber();

      const trimmedName = val.patientName.trim();
      const nameParts = trimmedName.split(/\s+/);
      const firstName = nameParts[0] || "Patient";
      const lastName = nameParts.slice(1).join(" ") || ".";

      let dob = new Date("1995-01-01");
      if (val.age) {
        const parsedAge = parseInt(String(val.age), 10);
        if (!isNaN(parsedAge) && parsedAge >= 0 && parsedAge <= 130) {
          const currentYear = new Date().getFullYear();
          dob = new Date(`${currentYear - parsedAge}-01-01`);
        }
      }

      patient = await prisma.patient.create({
        data: {
          patientNumber,
          mrNumber: finalMrNumber,
          firstName,
          lastName,
          gender: val.gender || "MALE",
          dateOfBirth: dob,
          phone: val.phone?.trim() || "N/A",
          cnic: val.cnic?.trim() || null,
          address: val.address?.trim() || null,
          relationType: val.relationType?.trim() || "Father",
          relatedPersonName: val.fatherHusbandName?.trim() || null,
          bloodGroup: "B_POSITIVE",
          emergencyContactName: val.fatherHusbandName?.trim() || trimmedName,
          emergencyContactPhone: val.phone?.trim() || "N/A",
          emergencyContactRelation: val.relationType?.trim() || "Guardian",
          status: "ACTIVE",
        },
      });
    }

    // Guard 1: Cannot admit a patient whose status is DECEASED
    if (patient.status === "DECEASED") {
      return NextResponse.json(
        {
          error: "Cannot create admission: Patient status is marked as DECEASED.",
        },
        { status: 400 }
      );
    }

    // Guard 2: Prevent duplicate concurrent active admissions for the same patient
    const existingActiveAdmission = await prisma.admission.findFirst({
      where: {
        patientId: patient.id,
        status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
      },
      select: { id: true, admissionNumber: true, roomBedNo: true },
    });

    if (existingActiveAdmission) {
      return NextResponse.json(
        {
          error: `Patient already has an active admission (${existingActiveAdmission.admissionNumber}, ${existingActiveAdmission.roomBedNo || "No Bed Assigned"}). Please discharge or transfer the patient before admitting again.`,
        },
        { status: 409 }
      );
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

    const now = new Date();
    const effectiveAdmissionDate = val.admissionDate
      ? new Date(val.admissionDate)
      : now;
    const effectiveAdmissionTime =
      val.admissionTime ||
      now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    const admission = await prisma.$transaction(async (tx) => {
      // Validate and atomically reserve bed if bedId is provided
      if (val.bedId) {
        const bed = await tx.bed.findUnique({
          where: { id: val.bedId },
          include: { room: true },
        });

        if (!bed) {
          throw new Error("The selected bed could not be found.");
        }

        if (!bed.isActive) {
          throw new Error(`Bed ${bed.bedNumber} is currently deactivated.`);
        }

        if (bed.status !== BedStatus.FREE) {
          throw new Error(
            `Bed "${bed.bedNumber}" in Room "${bed.room.roomNumber}" is currently ${bed.status}. Only FREE beds can be booked.`
          );
        }

        // Atomically transition bed from FREE to SCHEDULED
        await tx.bed.update({
          where: { id: val.bedId },
          data: { status: BedStatus.SCHEDULED },
        });
      }

      const newAdm = await tx.admission.create({
        data: {
          admissionNumber,
          patientId: patient.id,
          doctorId: val.doctorId || null,
          doctorName,
          admissionDate: effectiveAdmissionDate,
          admissionTime: effectiveAdmissionTime,
          admissionSource: val.admissionSource as AdmissionSource,
          referenceNumber: val.referenceNumber || null,
          bedId: val.bedId || null,
          roomBedNo: val.roomBedNo.trim(),
          provisionalDiagnosis: val.provisionalDiagnosis || null,
          finalDiagnosis: val.finalDiagnosis || null,
          operation: val.operation || null,
          presentingComplaints: val.presentingComplaints || null,
          medicationHistory: val.medicationHistory || null,
          familyHistory: val.familyHistory || null,
          allergies: val.allergies || patient.allergies || [],
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
            patientId: patient.id,
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
          patientId: patient.id,
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
        bedId: admission.bedId,
        source: admission.admissionSource,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Admission recorded successfully",
        data: admission,
        admission: admission,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("POST /api/admissions error:", error);
    const message = error instanceof Error ? error.message : "Failed to create admission";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
