import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePatientAccess, requirePatientManage } from "@/lib/patient-auth";
import { generatePatientAndMRNumbers } from "@/lib/patient-number";
import { createAuditLog } from "@/lib/audit";
import { Gender, BloodGroup, PatientStatus } from "@prisma/client";

const PAGE_SIZE = 10;

const registerPatientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "Select a valid gender" }),
  dateOfBirth: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, "Enter a valid past date of birth"),
  phone: z.string().min(6, "Phone number is required").max(25),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  bloodGroup: z.enum(
    [
      "A_POSITIVE",
      "A_NEGATIVE",
      "B_POSITIVE",
      "B_NEGATIVE",
      "AB_POSITIVE",
      "AB_NEGATIVE",
      "O_POSITIVE",
      "O_NEGATIVE",
    ],
    { message: "Select a valid blood group" }
  ),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  status: z.enum(["ACTIVE", "CRITICAL", "DISCHARGED"]).default("ACTIVE"),

  cnic: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  relationType: z.string().optional().nullable(),
  relatedPersonName: z.string().optional().nullable(),
  landline: z.string().optional().nullable(),

  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(6, "Emergency contact phone is required"),
  emergencyContactRelation: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    await requirePatientAccess(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10)));
    const search = searchParams.get("search")?.trim() || "";
    const gender = searchParams.get("gender") || "";
    const bloodGroup = searchParams.get("bloodGroup") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { patientNumber: { contains: search, mode: "insensitive" } },
        { mrNumber: { contains: search, mode: "insensitive" } },
        { cnic: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { relatedPersonName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (gender && ["MALE", "FEMALE", "OTHER"].includes(gender)) {
      where.gender = gender as Gender;
    }

    if (bloodGroup) {
      where.bloodGroup = bloodGroup as BloodGroup;
    }

    if (status && ["ACTIVE", "CRITICAL", "DISCHARGED"].includes(status)) {
      where.status = status as PatientStatus;
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
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
          bloodGroup: true,
          status: true,
          cnic: true,
          relationType: true,
          relatedPersonName: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          createdAt: true,
          _count: {
            select: {
              appointments: true,
              consultations: true,
              admissions: true,
              prescriptions: true,
              vitalSigns: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: patients,
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
    console.error("GET /api/patients error:", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePatientManage(request);

    const body = await request.json();
    const result = registerPatientSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const val = result.data;

    // Check unique CNIC if provided
    const cleanCnic = val.cnic?.trim() || null;
    if (cleanCnic) {
      const existingWithCnic = await prisma.patient.findFirst({
        where: { cnic: cleanCnic },
        select: { id: true, patientNumber: true, firstName: true, lastName: true },
      });
      if (existingWithCnic) {
        return NextResponse.json(
          {
            error: `A patient with CNIC ${cleanCnic} is already registered (${existingWithCnic.patientNumber}: ${existingWithCnic.firstName} ${existingWithCnic.lastName})`,
            details: { cnic: ["A patient with this CNIC already exists in the system"] },
          },
          { status: 409 }
        );
      }
    }

    // Generate safe unique numbers
    const { patientNumber, mrNumber } = await generatePatientAndMRNumbers();

    // Create Patient record with initial timeline event in transaction
    const patient = await prisma.$transaction(async (tx) => {
      const newPatient = await tx.patient.create({
        data: {
          patientNumber,
          mrNumber,
          firstName: val.firstName.trim(),
          lastName: val.lastName.trim(),
          gender: val.gender as Gender,
          dateOfBirth: new Date(val.dateOfBirth),
          phone: val.phone.trim(),
          email: val.email?.trim() || null,
          address: val.address?.trim() || null,
          bloodGroup: val.bloodGroup as BloodGroup,
          allergies: val.allergies || [],
          chronicConditions: val.chronicConditions || [],
          status: val.status as PatientStatus,
          cnic: cleanCnic,
          maritalStatus: val.maritalStatus?.trim() || null,
          relationType: val.relationType?.trim() || null,
          relatedPersonName: val.relatedPersonName?.trim() || null,
          landline: val.landline?.trim() || null,
          emergencyContactName: val.emergencyContactName.trim(),
          emergencyContactPhone: val.emergencyContactPhone.trim(),
          emergencyContactRelation: val.emergencyContactRelation?.trim() || null,
        },
      });

      // Automatic initial timeline event
      await tx.timelineEvent.create({
        data: {
          patientId: newPatient.id,
          title: "Patient Registered",
          eventType: "PATIENT_REGISTERED",
          description: `Registered at GIAS Hospital Front Desk with MR Number ${mrNumber} and Patient Number ${patientNumber}.`,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      return newPatient;
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "CREATE_PATIENT",
      entity: "Patient",
      entityId: patient.id,
      newValue: JSON.stringify({
        patientNumber: patient.patientNumber,
        mrNumber: patient.mrNumber,
        name: `${patient.firstName} ${patient.lastName}`,
        cnic: patient.cnic,
        phone: patient.phone,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Patient registered successfully",
        data: patient,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("POST /api/patients error:", error);
    return NextResponse.json({ error: "Failed to register patient" }, { status: 500 });
  }
}
