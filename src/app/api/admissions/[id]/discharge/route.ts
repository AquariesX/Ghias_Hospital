import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { generateNextPrescriptionNumber } from "@/lib/prescription-number";
import { generateNextAppointmentNumber } from "@/lib/appointment-number";
import {
  AdmissionStatus,
  AppointmentStatus,
  AppointmentType,
  PatientStatus,
} from "@prisma/client";

const dischargeMedicationItemSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  route: z.string().min(1, "Route is required"),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional().nullable(),
});

const dischargeRequestSchema = z.object({
  finalDiagnosis: z.string().min(2, "Final diagnosis is required"),
  dischargeCondition: z.string().min(2, "Discharge condition is required"),
  dischargeSummary: z.string().min(5, "Discharge summary course is required"),
  dischargeInstructions: z.string().min(5, "Discharge care instructions are required"),
  dischargeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  dischargeTime: z.string().optional(),
  medications: z.array(dischargeMedicationItemSchema).optional().default([]),
  followUpInstructions: z.string().optional().nullable(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Follow-up date must be YYYY-MM-DD").optional().nullable(),
  followUpDoctorId: z.string().uuid().optional().nullable(),
  scheduleFollowUpAppointment: z.boolean().optional().default(false),
  dischargeReferralNote: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Only Doctor or Admin can discharge an admitted patient
    if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only authorized physicians or administrators can confirm patient discharge." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parseResult = dischargeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Fetch existing admission with patient and doctor associations
    const admission = await prisma.admission.findFirst({
      where: {
        OR: [{ id }, { admissionNumber: id }],
      },
      include: {
        patient: true,
        doctor: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission record not found" }, { status: 404 });
    }

    // Guard: Prevent double discharge
    if (admission.status === AdmissionStatus.DISCHARGED) {
      const formattedDate = admission.dischargeDate
        ? new Date(admission.dischargeDate).toLocaleDateString()
        : "a previous date";
      return NextResponse.json(
        {
          error: `Patient has already been discharged on ${formattedDate} (Admission #${admission.admissionNumber}).`,
        },
        { status: 400 }
      );
    }

    if (admission.status === AdmissionStatus.CANCELLED) {
      return NextResponse.json(
        { error: `Cannot discharge an admission marked as CANCELLED.` },
        { status: 400 }
      );
    }

    // Determine discharging doctor
    let dischargingDoctorId = admission.doctorId;
    let dischargingDoctorName = admission.doctor
      ? `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}`
      : `Staff ${user.firstName} ${user.lastName}`;

    if (user.role === "DOCTOR") {
      const linkedDoctor = await prisma.doctor.findFirst({
        where: { OR: [{ userId: user.id }, { email: user.email }] },
        include: { department: true },
      });
      if (linkedDoctor) {
        dischargingDoctorId = linkedDoctor.id;
        dischargingDoctorName = `Dr. ${linkedDoctor.firstName} ${linkedDoctor.lastName}`;
      }
    }

    const now = new Date();
    const effectiveDischargeDate = data.dischargeDate ? new Date(data.dischargeDate) : now;
    const effectiveDischargeTime =
      data.dischargeTime ||
      now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    // Format discharge medications text for historical summary
    const medicationsSummary =
      data.medications.length > 0
        ? data.medications
            .map(
              (m, idx) =>
                `${idx + 1}. ${m.medicineName} (${m.dosage}) - ${m.frequency}, ${m.route} for ${m.duration}${m.instructions ? ` [${m.instructions}]` : ""}`
            )
            .join("\n")
        : "None prescribed at discharge.";

    // Execute atomic Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Admission record
      const updatedAdmission = await tx.admission.update({
        where: { id: admission.id },
        data: {
          status: AdmissionStatus.DISCHARGED,
          dischargeDate: effectiveDischargeDate,
          dischargeTime: effectiveDischargeTime,
          finalDiagnosis: data.finalDiagnosis.trim(),
          dischargeSummary: data.dischargeSummary.trim(),
          dischargeInstructions: data.dischargeInstructions.trim(),
          dischargeMedications: medicationsSummary,
          followUpInstructions: data.followUpInstructions?.trim() || null,
          dischargeReferralNote: data.dischargeReferralNote?.trim() || null,
          generalExamination: `Condition at discharge: ${data.dischargeCondition.trim()}`,
        },
      });

      // 2. Create official Prescription record if discharge medications provided
      let createdPrescriptionId: string | null = null;
      if (data.medications.length > 0 && dischargingDoctorId) {
        const prescriptionNumber = await generateNextPrescriptionNumber();
        const prescription = await tx.prescription.create({
          data: {
            prescriptionNumber,
            patientId: admission.patientId,
            doctorId: dischargingDoctorId,
            admissionId: admission.id,
            diagnosis: data.finalDiagnosis.trim(),
            notes: `Official Inpatient Discharge Prescription.\nCondition: ${data.dischargeCondition}.\nCare Instructions: ${data.dischargeInstructions}`,
            status: "ACTIVE",
            items: {
              create: data.medications.map((m) => ({
                medicineName: m.medicineName.trim(),
                dosage: m.dosage.trim(),
                frequency: m.frequency.trim(),
                route: m.route.trim(),
                duration: m.duration.trim(),
                instructions: m.instructions?.trim() || null,
              })),
            },
          },
        });
        createdPrescriptionId = prescription.id;
      }

      // 3. Schedule Follow-up Appointment if requested
      let createdAppointmentId: string | null = null;
      if (data.scheduleFollowUpAppointment && data.followUpDate) {
        const appointmentDoctorId = data.followUpDoctorId || dischargingDoctorId || admission.doctorId;
        if (appointmentDoctorId) {
          const aptDoctor = await tx.doctor.findUnique({
            where: { id: appointmentDoctorId },
            include: { department: true },
          });

          if (aptDoctor) {
            let followUpDeptId = aptDoctor.departmentId;
            if (!followUpDeptId) {
              const fallbackDept = await tx.department.findFirst({
                where: { status: "ACTIVE" },
                orderBy: { createdAt: "asc" },
                select: { id: true },
              });
              followUpDeptId = fallbackDept?.id || null;
            }

            if (followUpDeptId) {
              const appointmentNumber = await generateNextAppointmentNumber();
              const followUpApt = await tx.appointment.create({
                data: {
                  appointmentNumber,
                  patientId: admission.patientId,
                  doctorId: aptDoctor.id,
                  departmentId: followUpDeptId,
                  appointmentType: AppointmentType.FOLLOW_UP,
                  appointmentDate: new Date(data.followUpDate),
                  appointmentTime: "10:00 AM",
                  consultationFee: aptDoctor.consultationFee,
                  reason: `Inpatient Discharge Follow-up for Admission #${admission.admissionNumber} (${data.finalDiagnosis})`,
                  status: AppointmentStatus.SCHEDULED,
                  notes: data.followUpInstructions || "Routine post-discharge clinical evaluation",
                  createdById: user.id,
                },
              });
              createdAppointmentId = followUpApt.id;
            }
          }
        }
      }

      // 4. Update Patient status to ACTIVE (or DISCHARGED), ensuring searchable and intact
      await tx.patient.update({
        where: { id: admission.patientId },
        data: {
          status: PatientStatus.ACTIVE,
        },
      });

      // 5. Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId: admission.patientId,
          title: "Patient Discharged",
          eventType: "PATIENT_DISCHARGED",
          description: `Discharged from hospital after admission #${admission.admissionNumber}. Condition: ${data.dischargeCondition}. Final Diagnosis: ${data.finalDiagnosis}. Attending Physician: ${dischargingDoctorName}.`,
          entityId: admission.id,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      return {
        updatedAdmission,
        prescriptionId: createdPrescriptionId,
        appointmentId: createdAppointmentId,
      };
    });

    // 6. Audit Log
    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "DISCHARGE_PATIENT",
      entity: "Admission",
      entityId: admission.id,
      oldValue: JSON.stringify({
        status: admission.status,
        admissionNumber: admission.admissionNumber,
      }),
      newValue: JSON.stringify({
        status: AdmissionStatus.DISCHARGED,
        finalDiagnosis: data.finalDiagnosis,
        condition: data.dischargeCondition,
        dischargeDate: effectiveDischargeDate,
        prescriptionCreated: !!result.prescriptionId,
        followUpScheduled: !!result.appointmentId,
      }),
    });

    return NextResponse.json({
      success: true,
      message: `Patient ${admission.patient.firstName} ${admission.patient.lastName} has been successfully discharged.`,
      data: {
        admissionId: result.updatedAdmission.id,
        admissionNumber: result.updatedAdmission.admissionNumber,
        status: result.updatedAdmission.status,
        dischargeDate: result.updatedAdmission.dischargeDate,
        dischargeTime: result.updatedAdmission.dischargeTime,
        prescriptionId: result.prescriptionId,
        appointmentId: result.appointmentId,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("POST /api/admissions/[id]/discharge error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing discharge." },
      { status: 500 }
    );
  }
}
