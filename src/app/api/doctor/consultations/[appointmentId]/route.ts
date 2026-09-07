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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { doctor } = await requireDoctorAuth(request);
    const { appointmentId } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            vitalSigns: {
              orderBy: { recordedAt: "desc" },
              take: 20,
            },
            consultations: {
              where: {
                appointmentId: { not: appointmentId },
              },
              orderBy: { consultationDate: "desc" },
              take: 10,
              include: {
                doctor: {
                  select: {
                    firstName: true,
                    lastName: true,
                    specialization: true,
                  },
                },
              },
            },
            prescriptions: {
              orderBy: { createdAt: "desc" },
              take: 10,
              include: {
                doctor: {
                  select: {
                    firstName: true,
                    lastName: true,
                    specialization: true,
                  },
                },
                items: true,
              },
            },
          },
        },
        consultation: {
          include: {
            prescriptions: {
              include: {
                items: true,
              },
            },
            vitalSigns: {
              orderBy: { recordedAt: "desc" },
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

    // Strict doctor ownership check
    if (appointment.doctorId !== doctor.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to view another clinician's consultation" },
        { status: 403 }
      );
    }

    // Auto-create consultation draft if not yet generated
    let consultation = appointment.consultation;
    if (!consultation) {
      const nextNum = await generateNextConsultationNumber();
      consultation = await prisma.consultation.create({
        data: {
          consultationNumber: nextNum,
          appointment: { connect: { id: appointment.id } },
          patient: { connect: { id: appointment.patientId } },
          doctor: { connect: { id: doctor.id } },
          status: "IN_PROGRESS",
          presentingComplaints: appointment.reason || null,
        },
        include: {
          prescriptions: {
            include: {
              items: true,
            },
          },
          vitalSigns: true,
        },
      });

      if (appointment.status === AppointmentStatus.WAITING || appointment.status === AppointmentStatus.SCHEDULED) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: AppointmentStatus.IN_CONSULTATION },
        });
      }
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        appointmentType: appointment.appointmentType,
        reason: appointment.reason,
        status: appointment.status,
        isEmergency: appointment.isEmergency,
      },
      patient: appointment.patient,
      consultation,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error loading consultation data:", error);
    return NextResponse.json(
      { error: "Internal Server Error retrieving consultation workspace" },
      { status: 500 }
    );
  }
}

interface SaveProgressPayload {
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, doctor } = await requireDoctorAuth(request);
    const { appointmentId } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
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
        { error: "Forbidden: You are not authorized to update this consultation" },
        { status: 403 }
      );
    }

    if (appointment.consultation?.status === "COMPLETED") {
      return NextResponse.json(
        { error: "This consultation has already been completed and locked" },
        { status: 400 }
      );
    }

    const body: SaveProgressPayload = await request.json();

    const updatedConsultation = await prisma.$transaction(async (tx) => {
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

      // 1. Update clinical assessment fields
      const updated = await tx.consultation.update({
        where: { id: consultation.id },
        data: {
          presentingComplaints: body.presentingComplaints,
          medicalHistory: body.medicalHistory,
          medicationHistory: body.medicationHistory,
          familyHistory: body.familyHistory,
          physicalExamination: body.physicalExamination,
          provisionalDiagnosis: body.provisionalDiagnosis,
          finalDiagnosis: body.finalDiagnosis,
          investigations: body.investigations,
          treatmentPlan: body.treatmentPlan,
          status: "IN_PROGRESS",
        },
      });

      // 2. If prescription items provided, sync draft prescription
      if (Array.isArray(body.prescriptionItems)) {
        const validItems = body.prescriptionItems.filter(
          (i) => i.medicineName && i.medicineName.trim().length > 0
        );

        let activePrescription = consultation.prescriptions[0];

        if (validItems.length > 0) {
          if (!activePrescription) {
            const rxNumber = await generateNextPrescriptionNumber();
            activePrescription = await tx.prescription.create({
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
            // Delete old items and recreate
            await tx.prescriptionItem.deleteMany({
              where: { prescriptionId: activePrescription.id },
            });
          }

          // Create items
          await tx.prescriptionItem.createMany({
            data: validItems.map((item) => ({
              prescriptionId: activePrescription.id,
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

      return updated;
    });

    // Record audit log
    await createAuditLog({
      action: "UPDATE_CONSULTATION",
      entity: "Consultation",
      entityId: updatedConsultation.id,
      userId: user.id,
      userRole: user.role,
      userName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      newValue: JSON.stringify({
        status: "IN_PROGRESS",
        provisionalDiagnosis: body.provisionalDiagnosis,
        finalDiagnosis: body.finalDiagnosis,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Consultation draft saved successfully",
      consultation: updatedConsultation,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error saving consultation draft:", error);
    return NextResponse.json(
      { error: "Internal Server Error saving consultation draft" },
      { status: 500 }
    );
  }
}
