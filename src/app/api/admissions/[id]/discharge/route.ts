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
  srNo: z.number().optional(),
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().optional().default(""),
  frequency: z.string().optional().default(""),
  route: z.string().optional().default("Oral"),
  timing: z.string().optional().default(""),
  duration: z.string().optional().default(""),
  instructions: z.string().optional().nullable(),
});

const dischargeRequestSchema = z.object({
  isDraft: z.boolean().optional().default(false),
  presentingComplaints: z.string().optional().nullable(),
  generalExamination: z.string().optional().nullable(), // Brief history & examination
  investigations: z.string().optional().nullable(),
  finalDiagnosis: z.string().optional().nullable(),
  operation: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  dischargeCondition: z.string().optional().nullable(), // Satisfactory, Fair, Poor
  dischargeAdvisedByDoctor: z.boolean().optional().default(true),
  isLama: z.boolean().optional().default(false),
  dischargeSummary: z.string().optional().nullable(),
  dischargeInstructions: z.string().optional().nullable(),
  dischargeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional().nullable(),
  dischargeTime: z.string().optional().nullable(),
  medications: z.array(dischargeMedicationItemSchema).optional().default([]),
  followUpInstructions: z.string().optional().nullable(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Follow-up date must be YYYY-MM-DD").optional().nullable(),
  followUpDoctorId: z.string().uuid().optional().nullable(),
  scheduleFollowUpAppointment: z.boolean().optional().default(false),
  dischargeReferralNote: z.string().optional().nullable(),
  attendingDoctorId: z.string().uuid().optional().nullable(),
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

    const allowedRoles = ["ADMIN", "DOCTOR", "RECEPTIONIST", "STAFF"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions to access discharge workflows." },
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

    // If this is a final discharge (not draft), verify authorized staff
    const canFinalize = ["ADMIN", "DOCTOR", "RECEPTIONIST", "STAFF"].includes(user.role);
    if (!data.isDraft && !canFinalize) {
      return NextResponse.json(
        { error: "Only authorized clinical and reception staff can confirm and finalize patient discharge." },
        { status: 403 }
      );
    }

    // Determine discharging doctor
    let dischargingDoctorId = data.attendingDoctorId || admission.doctorId;
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

    // Store structured JSON array of medications in dischargeMedications
    const medicationsJson = JSON.stringify(data.medications);

    // Format discharge medications text for human-readable fallback
    const medicationsSummary =
      data.medications.length > 0
        ? data.medications
            .map(
              (m, idx) =>
                `${idx + 1}. ${m.medicineName} (${m.dosage || "-"}) - ${m.frequency || "-"}, ${m.route || "Oral"}${m.timing ? ` [${m.timing}]` : ""}, ${m.duration || "-"}${m.instructions ? ` (${m.instructions})` : ""}`
            )
            .join("\n")
        : "None prescribed at discharge.";

    // Execute atomic Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      if (data.isDraft) {
        // 1. DRAFT SAVE: keep admission status active, update clinical and discharge preparation data
        const updatedAdmission = await tx.admission.update({
          where: { id: admission.id },
          data: {
            doctorId: dischargingDoctorId || undefined,
            presentingComplaints: data.presentingComplaints !== undefined ? data.presentingComplaints : undefined,
            generalExamination: data.generalExamination !== undefined ? data.generalExamination : undefined,
            investigations: data.investigations !== undefined ? data.investigations : undefined,
            finalDiagnosis: data.finalDiagnosis !== undefined ? data.finalDiagnosis : undefined,
            operation: data.operation !== undefined ? data.operation : undefined,
            outcome: data.outcome !== undefined ? data.outcome : undefined,
            dischargeCondition: data.dischargeCondition || undefined,
            dischargeAdvisedByDoctor: data.dischargeAdvisedByDoctor !== undefined ? data.dischargeAdvisedByDoctor : undefined,
            isLama: data.isLama !== undefined ? data.isLama : undefined,
            dischargeSummary: data.dischargeSummary || undefined,
            dischargeInstructions: data.dischargeInstructions || undefined,
            dischargeMedications: medicationsJson,
            followUpInstructions: data.followUpInstructions || undefined,
            followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
            dischargeReferralNote: data.dischargeReferralNote || undefined,
          },
        });

        // Add timeline event for draft save
        await tx.timelineEvent.create({
          data: {
            patientId: admission.patientId,
            title: "Discharge Form Draft Saved",
            eventType: "DISCHARGE_INITIATED",
            description: `Discharge form prepared/updated for Admission #${admission.admissionNumber}. Condition: ${data.dischargeCondition || "Pending"}.`,
            entityId: admission.id,
            performerName: `${user.firstName} ${user.lastName}`,
            performerRole: user.role,
          },
        });

        return {
          updatedAdmission,
          prescriptionId: null,
          appointmentId: null,
          isDraft: true,
        };
      }

      // 2. FINAL DISCHARGE:
      const updatedAdmission = await tx.admission.update({
        where: { id: admission.id },
        data: {
          status: AdmissionStatus.DISCHARGED,
          doctorId: dischargingDoctorId || undefined,
          dischargeDate: effectiveDischargeDate,
          dischargeTime: effectiveDischargeTime,
          presentingComplaints: data.presentingComplaints !== undefined ? data.presentingComplaints : undefined,
          generalExamination: data.generalExamination !== undefined ? data.generalExamination : undefined,
          investigations: data.investigations !== undefined ? data.investigations : undefined,
          finalDiagnosis: data.finalDiagnosis ? data.finalDiagnosis.trim() : undefined,
          operation: data.operation !== undefined ? data.operation : undefined,
          outcome: data.outcome !== undefined ? data.outcome : undefined,
          dischargeCondition: data.dischargeCondition || "Satisfactory",
          dischargeAdvisedByDoctor: data.dischargeAdvisedByDoctor,
          isLama: data.isLama,
          dischargeSummary: data.dischargeSummary ? data.dischargeSummary.trim() : "Patient discharged after completing hospital inpatient medical treatment.",
          dischargeInstructions: data.dischargeInstructions ? data.dischargeInstructions.trim() : "Follow prescribed instructions.",
          dischargeMedications: medicationsJson,
          followUpInstructions: data.followUpInstructions?.trim() || null,
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
          dischargeReferralNote: data.dischargeReferralNote?.trim() || null,
        },
      });

      // Create official Prescription record if discharge medications provided
      let createdPrescriptionId: string | null = null;
      if (data.medications.length > 0 && dischargingDoctorId) {
        const prescriptionNumber = await generateNextPrescriptionNumber();
        const prescription = await tx.prescription.create({
          data: {
            prescriptionNumber,
            patientId: admission.patientId,
            doctorId: dischargingDoctorId,
            admissionId: admission.id,
            diagnosis: data.finalDiagnosis || "Inpatient Discharge",
            notes: `Official Inpatient Discharge Prescription.\nCondition: ${data.dischargeCondition || "Satisfactory"}.\nInstructions: ${data.dischargeInstructions || ""}`,
            status: "ACTIVE",
            items: {
              create: data.medications.map((m) => ({
                medicineName: m.medicineName.trim(),
                dosage: m.dosage ? m.dosage.trim() : "-",
                frequency: m.frequency ? m.frequency.trim() : "-",
                route: m.route ? m.route.trim() : "Oral",
                duration: m.duration ? m.duration.trim() : "-",
                instructions: m.instructions ? m.instructions.trim() : (m.timing ? m.timing.trim() : null),
              })),
            },
          },
        });
        createdPrescriptionId = prescription.id;
      }

      // Schedule Follow-up Appointment if requested
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
                  reason: `Inpatient Discharge Follow-up for Admission #${admission.admissionNumber} (${data.finalDiagnosis || "Discharge"})`,
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

      // Update Patient status to ACTIVE, ensuring permanently searchable and intact
      await tx.patient.update({
        where: { id: admission.patientId },
        data: {
          status: PatientStatus.ACTIVE,
        },
      });

      // Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId: admission.patientId,
          title: "Patient Discharged",
          eventType: "PATIENT_DISCHARGED",
          description: `Discharged from hospital after admission #${admission.admissionNumber}. Condition: ${data.dischargeCondition || "Satisfactory"}. Final Diagnosis: ${data.finalDiagnosis || "Under review"}. Attending Physician: ${dischargingDoctorName}.`,
          entityId: admission.id,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      return {
        updatedAdmission,
        prescriptionId: createdPrescriptionId,
        appointmentId: createdAppointmentId,
        isDraft: false,
      };
    });

    // Audit Log
    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: data.isDraft ? "UPDATE_DISCHARGE_DRAFT" : "DISCHARGE_PATIENT",
      entity: "Admission",
      entityId: admission.id,
      oldValue: JSON.stringify({
        status: admission.status,
        admissionNumber: admission.admissionNumber,
      }),
      newValue: JSON.stringify({
        status: result.updatedAdmission.status,
        isDraft: data.isDraft,
        condition: data.dischargeCondition,
        dischargeDate: effectiveDischargeDate,
      }),
    });

    return NextResponse.json({
      success: true,
      message: data.isDraft
        ? `Discharge form draft saved successfully for Admission #${admission.admissionNumber}.`
        : `Patient ${admission.patient.firstName} ${admission.patient.lastName} has been successfully discharged.`,
      data: {
        admissionId: result.updatedAdmission.id,
        admissionNumber: result.updatedAdmission.admissionNumber,
        status: result.updatedAdmission.status,
        dischargeDate: result.updatedAdmission.dischargeDate,
        dischargeTime: result.updatedAdmission.dischargeTime,
        prescriptionId: result.prescriptionId,
        appointmentId: result.appointmentId,
        isDraft: data.isDraft,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const allowedRoles = ["ADMIN", "DOCTOR", "RECEPTIONIST", "STAFF", "NURSE"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

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
        prescriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            items: true,
          },
        },
      },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    // Try parsing dischargeMedications as JSON array if possible
    let parsedMedications: any[] = [];
    if (admission.dischargeMedications) {
      try {
        const json = JSON.parse(admission.dischargeMedications);
        if (Array.isArray(json)) {
          parsedMedications = json;
        }
      } catch {
        // Fallback for non-JSON strings
      }
    }

    // If no dischargeMedications saved yet, pull from the admission's latest prescription items
    if (parsedMedications.length === 0 && admission.prescriptions.length > 0) {
      const rx = admission.prescriptions[0];
      parsedMedications = rx.items.map((it, idx) => ({
        srNo: idx + 1,
        medicineName: it.medicineName,
        dosage: it.dosage,
        route: it.route || "Oral",
        frequency: it.frequency,
        timing: it.instructions || "After meals",
        duration: it.duration,
        instructions: it.instructions || "",
      }));
    }

    return NextResponse.json({
      success: true,
      admission: {
        id: admission.id,
        admissionNumber: admission.admissionNumber,
        admissionDate: admission.admissionDate.toISOString(),
        admissionTime: admission.admissionTime,
        admissionSource: admission.admissionSource,
        roomBedNo: admission.roomBedNo,
        status: admission.status,
        presentingComplaints: admission.presentingComplaints,
        generalExamination: admission.generalExamination,
        investigations: admission.investigations,
        provisionalDiagnosis: admission.provisionalDiagnosis,
        finalDiagnosis: admission.finalDiagnosis,
        operation: admission.operation,
        outcome: admission.outcome,
        dischargeCondition: admission.dischargeCondition || "Satisfactory",
        dischargeAdvisedByDoctor: admission.dischargeAdvisedByDoctor,
        isLama: admission.isLama,
        dischargeDate: admission.dischargeDate
          ? admission.dischargeDate.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        dischargeTime:
          admission.dischargeTime ||
          new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        dischargeSummary: admission.dischargeSummary,
        dischargeInstructions: admission.dischargeInstructions,
        dischargeMedications: parsedMedications,
        followUpInstructions: admission.followUpInstructions,
        followUpDate: admission.followUpDate ? admission.followUpDate.toISOString().split("T")[0] : null,
        patient: {
          id: admission.patient.id,
          mrNumber: admission.patient.mrNumber || admission.patient.patientNumber,
          patientNumber: admission.patient.patientNumber,
          firstName: admission.patient.firstName,
          lastName: admission.patient.lastName,
          fullName: `${admission.patient.firstName} ${admission.patient.lastName}`,
          gender: admission.patient.gender,
          dateOfBirth: admission.patient.dateOfBirth.toISOString(),
          phone: admission.patient.phone,
          cnic: admission.patient.cnic,
          address: admission.patient.address,
          bloodGroup: admission.patient.bloodGroup,
          relationType: admission.patient.relationType,
          relatedPersonName: admission.patient.relatedPersonName,
        },
        doctor: admission.doctor
          ? {
              id: admission.doctor.id,
              doctorNumber: admission.doctor.doctorNumber,
              fullName: `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}`,
              firstName: admission.doctor.firstName,
              lastName: admission.doctor.lastName,
              specialization: admission.doctor.specialization,
              departmentName: admission.doctor.department?.name,
              roomNumber: admission.doctor.roomNumber,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("GET /api/admissions/[id]/discharge error:", error);
    return NextResponse.json({ error: "Failed to load discharge details" }, { status: 500 });
  }
}
