import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDoctorAuth } from "@/lib/doctor-auth";
import { generateNextConsultationNumber } from "@/lib/consultation-number";
import { generateNextPrescriptionNumber } from "@/lib/prescription-number";
import { createAuditLog } from "@/lib/audit";
import { AppointmentStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ appointmentId: string }>;
}

interface CompleteConsultationPayload {
  presentingComplaints?: string;
  medicalHistory?: string;
  medicationHistory?: string;
  familyHistory?: string;
  physicalExamination?: string;
  provisionalDiagnosis?: string;
  finalDiagnosis?: string;
  investigations?: string;
  treatmentPlan?: string;
  prescriptionItems?: Array<{
    medicineName: string;
    dosage: string;
    frequency: string;
    route: string;
    duration: string;
    instructions?: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, doctor } = await requireDoctorAuth(request);
    const { appointmentId } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        consultation: {
          include: {
            prescriptions: {
              include: { items: true },
            },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment record not found" },
        { status: 404 }
      );
    }

    if (appointment.doctorId !== doctor.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to complete another clinician's consultation" },
        { status: 403 }
      );
    }

    if (appointment.consultation?.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Consultation has already been completed" },
        { status: 400 }
      );
    }

    const body: CompleteConsultationPayload = await request.json();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get or create consultation record
      let consultation = appointment.consultation;
      if (!consultation) {
        const nextNum = await generateNextConsultationNumber();
        consultation = await tx.consultation.create({
          data: {
            consultationNumber: nextNum,
            appointment: { connect: { id: appointment.id } },
            patient: { connect: { id: appointment.patientId } },
            doctor: { connect: { id: doctor.id } },
            status: "IN_PROGRESS",
          },
          include: {
            prescriptions: {
              include: { items: true },
            },
          },
        });
      }

      // 2. Update Consultation to COMPLETED
      const completedConsultation = await tx.consultation.update({
        where: { id: consultation.id },
        data: {
          presentingComplaints: body.presentingComplaints || consultation.presentingComplaints,
          medicalHistory: body.medicalHistory || consultation.medicalHistory,
          medicationHistory: body.medicationHistory || consultation.medicationHistory,
          familyHistory: body.familyHistory || consultation.familyHistory,
          physicalExamination: body.physicalExamination || consultation.physicalExamination,
          provisionalDiagnosis: body.provisionalDiagnosis || consultation.provisionalDiagnosis,
          finalDiagnosis: body.finalDiagnosis || consultation.finalDiagnosis,
          investigations: body.investigations || consultation.investigations,
          treatmentPlan: body.treatmentPlan || consultation.treatmentPlan,
          status: "COMPLETED",
        },
      });

      // 3. Process Prescription if medicines entered
      let createdPrescriptionNumber: string | null = null;
      let prescriptionItemCount = 0;

      if (Array.isArray(body.prescriptionItems)) {
        const validItems = body.prescriptionItems.filter(
          (i) => i.medicineName && i.medicineName.trim().length > 0
        );

        if (validItems.length > 0) {
          prescriptionItemCount = validItems.length;
          let rx = consultation.prescriptions[0];

          if (!rx) {
            const rxNumber = await generateNextPrescriptionNumber();
            createdPrescriptionNumber = rxNumber;
            rx = await tx.prescription.create({
              data: {
                prescriptionNumber: rxNumber,
                patient: { connect: { id: appointment.patientId } },
                doctor: { connect: { id: doctor.id } },
                consultation: { connect: { id: consultation.id } },
                diagnosis: body.finalDiagnosis || body.provisionalDiagnosis || undefined,
                status: "ACTIVE",
              },
              include: { items: true },
            });
          } else {
            createdPrescriptionNumber = rx.prescriptionNumber;
            await tx.prescription.update({
              where: { id: rx.id },
              data: {
                diagnosis: body.finalDiagnosis || body.provisionalDiagnosis || undefined,
                status: "ACTIVE",
              },
            });
            await tx.prescriptionItem.deleteMany({
              where: { prescriptionId: rx.id },
            });
          }

          await tx.prescriptionItem.createMany({
            data: validItems.map((item) => ({
              prescriptionId: rx.id,
              medicineName: item.medicineName.trim(),
              dosage: item.dosage?.trim() || "As directed",
              frequency: item.frequency?.trim() || "Once daily",
              route: item.route?.trim() || "Oral",
              duration: item.duration?.trim() || "3 days",
              instructions: item.instructions?.trim() || null,
            })),
          });
        }
      }

      // 4. Update appointment status to COMPLETED
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.COMPLETED,
        },
      });

      // 5. Create timeline events
      await tx.timelineEvent.create({
        data: {
          patientId: appointment.patientId,
          eventType: "CONSULTATION_COMPLETED",
          title: "Consultation Completed",
          description: `Dr. ${doctor.firstName} ${doctor.lastName} completed consultation #${consultation.consultationNumber}.${
            body.finalDiagnosis ? ` Final Diagnosis: ${body.finalDiagnosis}` : ""
          }`,
          entityId: consultation.id,
          performerName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
          performerRole: "DOCTOR",
        },
      });

      if (createdPrescriptionNumber) {
        await tx.timelineEvent.create({
          data: {
            patientId: appointment.patientId,
            eventType: "PRESCRIPTION_CREATED",
            title: `Prescription Issued (${createdPrescriptionNumber})`,
            description: `Prescribed ${prescriptionItemCount} medicine(s) by Dr. ${doctor.firstName} ${doctor.lastName}.`,
            entityId: consultation.id,
            performerName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
            performerRole: "DOCTOR",
          },
        });
      }

      return {
        appointment: updatedAppointment,
        consultation: completedConsultation,
        prescriptionNumber: createdPrescriptionNumber,
      };
    });

    // 6. Record Audit Log
    await createAuditLog({
      action: "COMPLETE_CONSULTATION",
      entity: "Consultation",
      entityId: result.consultation.id,
      userId: user.id,
      userRole: user.role,
      userName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      newValue: JSON.stringify({
        status: "COMPLETED",
        appointmentId: appointment.id,
        prescriptionNumber: result.prescriptionNumber,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Consultation completed and saved successfully",
      appointment: result.appointment,
      consultation: result.consultation,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error completing consultation:", error);
    return NextResponse.json(
      { error: "Internal Server Error completing consultation" },
      { status: 500 }
    );
  }
}
