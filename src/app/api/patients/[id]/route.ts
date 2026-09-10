import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePatientAccess, requirePatientManage } from "@/lib/patient-auth";
import { createAuditLog } from "@/lib/audit";
import { Gender, BloodGroup, PatientStatus } from "@prisma/client";

const updatePatientSchema = z.object({
  mrNumber: z.string().min(1, "MR Number is required").max(100).optional().nullable(),
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePatientAccess(request);
    const { id } = await context.params;

    // Find by ID, or fallback to patientNumber / mrNumber
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id }, { patientNumber: id }, { mrNumber: id }],
      },
      include: {
        _count: {
          select: {
            appointments: true,
            consultations: true,
            prescriptions: true,
            admissions: true,
            vitalSigns: true,
            nursingNotes: true,
            emergencyTriages: true,
            timelineEvents: true,
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("GET /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePatientManage(request);
    const { id } = await context.params;

    const existing = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const body = await request.json();
    const result = updatePatientSchema.safeParse(body);

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

    // CNIC uniqueness check excluding current patient
    const cleanCnic = val.cnic?.trim() || null;
    if (cleanCnic) {
      const duplicateCnic = await prisma.patient.findFirst({
        where: {
          cnic: cleanCnic,
          id: { not: id },
        },
        select: { id: true, patientNumber: true },
      });
      if (duplicateCnic) {
        return NextResponse.json(
          {
            error: `Another patient with CNIC ${cleanCnic} already exists (${duplicateCnic.patientNumber})`,
            details: { cnic: ["CNIC belongs to another registered patient"] },
          },
          { status: 409 }
        );
      }
    }

    // MR Number uniqueness check excluding current patient
    const cleanMrNumber = val.mrNumber?.trim() || null;
    if (cleanMrNumber && cleanMrNumber !== existing.mrNumber) {
      const duplicateMr = await prisma.patient.findFirst({
        where: {
          mrNumber: cleanMrNumber,
          id: { not: id },
        },
        select: { id: true, patientNumber: true, firstName: true, lastName: true },
      });
      if (duplicateMr) {
        return NextResponse.json(
          {
            error: `Another patient with MR Number "${cleanMrNumber}" already exists (${duplicateMr.patientNumber}: ${duplicateMr.firstName} ${duplicateMr.lastName})`,
            details: { mrNumber: ["This MR Number belongs to another registered patient"] },
          },
          { status: 409 }
        );
      }
    }

    // Update patient and record timeline event
    const updated = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.update({
        where: { id },
        data: {
          mrNumber: cleanMrNumber !== null ? cleanMrNumber : existing.mrNumber,
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

      await tx.timelineEvent.create({
        data: {
          patientId: patient.id,
          title: "Patient Details Updated",
          eventType: "PATIENT_UPDATED",
          description: `Patient information updated by ${user.firstName} ${user.lastName} (${user.role}).`,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      return patient;
    });

    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "UPDATE_PATIENT",
      entity: "Patient",
      entityId: updated.id,
      oldValue: JSON.stringify({
        name: `${existing.firstName} ${existing.lastName}`,
        phone: existing.phone,
        status: existing.status,
      }),
      newValue: JSON.stringify({
        name: `${updated.firstName} ${updated.lastName}`,
        phone: updated.phone,
        status: updated.status,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Patient updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("PUT /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePatientManage(request);
    const { id } = await context.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        patientNumber: true,
        mrNumber: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete prescription items and prescriptions
      const prescriptions = await tx.prescription.findMany({
        where: { patientId: id },
        select: { id: true },
      });
      if (prescriptions.length > 0) {
        const rxIds = prescriptions.map((p) => p.id);
        await tx.prescriptionItem.deleteMany({
          where: { prescriptionId: { in: rxIds } },
        });
        await tx.prescription.deleteMany({
          where: { patientId: id },
        });
      }

      // 2. Delete medication administrations
      await tx.medicationAdministration.deleteMany({
        where: { patientId: id },
      });

      // 3. Delete vital signs
      await tx.vitalSign.deleteMany({
        where: { patientId: id },
      });

      // 4. Delete nursing notes
      await tx.nursingNote.deleteMany({
        where: { patientId: id },
      });

      // 5. Delete emergency triage
      await tx.emergencyTriage.deleteMany({
        where: { patientId: id },
      });

      // 6. Delete consultations
      await tx.consultation.deleteMany({
        where: { patientId: id },
      });

      // 7. Delete appointments
      await tx.appointment.deleteMany({
        where: { patientId: id },
      });

      // 8. Delete admissions & statements if any
      await tx.admissionStatement.deleteMany({
        where: { admission: { patientId: id } },
      });
      await tx.admission.deleteMany({
        where: { patientId: id },
      });

      // 9. Delete timeline events
      await tx.timelineEvent.deleteMany({
        where: { patientId: id },
      });

      // 10. Delete the patient record
      await tx.patient.delete({
        where: { id },
      });

      // 11. System audit log
      await createAuditLog({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: "DELETE_PATIENT",
        entity: "Patient",
        entityId: id,
        oldValue: JSON.stringify({
          name: `${patient.firstName} ${patient.lastName}`,
          patientNumber: patient.patientNumber,
          mrNumber: patient.mrNumber,
          phone: patient.phone,
        }),
      });
    });

    return NextResponse.json({
      success: true,
      message: `Patient ${patient.firstName} ${patient.lastName} (${patient.mrNumber || patient.patientNumber}) and all associated records deleted successfully.`,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("DELETE /api/patients/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete patient record" },
      { status: 500 }
    );
  }
}

