import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDoctorAuth } from "@/lib/doctor-auth";
import { generateNextPatientNumber } from "@/lib/patient-number";
import { createAuditLog } from "@/lib/audit";
import { Gender, BloodGroup, Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireDoctorAuth(request);
    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      // Return recent 20 patients
      const recentPatients = await prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          patientNumber: true,
          mrNumber: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          bloodGroup: true,
          phone: true,
          cnic: true,
          allergies: true,
          chronicConditions: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ patients: recentPatients });
    }

    const whereClause: Prisma.PatientWhereInput = {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { patientNumber: { contains: query, mode: "insensitive" } },
        { mrNumber: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { cnic: { contains: query, mode: "insensitive" } },
      ],
    };

    const patients = await prisma.patient.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        patientNumber: true,
        mrNumber: true,
        firstName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        bloodGroup: true,
        phone: true,
        cnic: true,
        allergies: true,
        chronicConditions: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ patients });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in doctor patient search:", error);
    return NextResponse.json(
      { error: "Internal Server Error searching patients" },
      { status: 500 }
    );
  }
}

interface RegisterPatientPayload {
  mrNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  bloodGroup?: BloodGroup;
  cnic?: string;
  address?: string;
  city?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { user, doctor } = await requireDoctorAuth(request);
    const body: RegisterPatientPayload = await request.json();

    // Validation
    const errors: string[] = [];
    if (!body.mrNumber?.trim()) errors.push("Medical Record (MR) Number is required");
    if (!body.firstName?.trim()) errors.push("First name is required");
    if (!body.lastName?.trim()) errors.push("Last name is required");
    if (!body.phone?.trim()) errors.push("Phone number is required");
    if (!body.gender) errors.push("Gender is required");
    if (!body.dateOfBirth) errors.push("Date of birth is required");

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(". ") },
        { status: 400 }
      );
    }

    const cleanMrNumber = body.mrNumber.trim();

    // Check MR Number duplicate
    const existingMR = await prisma.patient.findUnique({
      where: { mrNumber: cleanMrNumber },
      select: { id: true, patientNumber: true },
    });
    if (existingMR) {
      return NextResponse.json(
        { error: `Patient already registered with MR Number ${cleanMrNumber} (${existingMR.patientNumber})` },
        { status: 409 }
      );
    }

    // Check CNIC duplicate if provided
    if (body.cnic?.trim()) {
      const existingCnic = await prisma.patient.findFirst({
        where: { cnic: body.cnic.trim() },
        select: { id: true, patientNumber: true },
      });
      if (existingCnic) {
        return NextResponse.json(
          { error: `Patient already registered with CNIC ${body.cnic} (${existingCnic.patientNumber})` },
          { status: 400 }
        );
      }
    }

    const patientNumber = await generateNextPatientNumber();
    const mrNumber = cleanMrNumber;

    const newPatient = await prisma.$transaction(async (tx) => {
      const p = await tx.patient.create({
        data: {
          patientNumber,
          mrNumber,
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          phone: body.phone.trim(),
          gender: body.gender,
          dateOfBirth: new Date(body.dateOfBirth),
          bloodGroup: body.bloodGroup || BloodGroup.O_POSITIVE,
          cnic: body.cnic?.trim() || null,
          address: body.city && body.address ? `${body.address.trim()}, ${body.city.trim()}` : (body.address?.trim() || body.city?.trim() || null),
          emergencyContactName: body.emergencyContactName?.trim() || "Attendant",
          emergencyContactPhone: body.emergencyContactPhone?.trim() || body.phone.trim(),
          emergencyContactRelation: body.emergencyContactRelation?.trim() || "Family",
          allergies: Array.isArray(body.allergies) ? body.allergies : [],
          chronicConditions: Array.isArray(body.chronicConditions) ? body.chronicConditions : [],
        },
      });

      await tx.timelineEvent.create({
        data: {
          patientId: p.id,
          eventType: "PATIENT_REGISTERED",
          title: "Patient Registered by Doctor",
          description: `Patient ${p.firstName} ${p.lastName} registered by Dr. ${doctor.firstName} ${doctor.lastName}.`,
          entityId: p.id,
          performerName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
          performerRole: "DOCTOR",
        },
      });

      return p;
    });

    await createAuditLog({
      action: "REGISTER_PATIENT",
      entity: "Patient",
      entityId: newPatient.id,
      userId: user.id,
      userRole: user.role,
      userName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      newValue: JSON.stringify({
        patientNumber: newPatient.patientNumber,
        mrNumber: newPatient.mrNumber,
        name: `${newPatient.firstName} ${newPatient.lastName}`,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Patient registered successfully",
      patient: newPatient,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error creating patient in doctor module:", error);
    return NextResponse.json(
      { error: "Internal Server Error registering patient" },
      { status: 500 }
    );
  }
}
