import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireDoctorAuth } from "@/lib/doctor-auth";
import { generateNextConsultationNumber } from "@/lib/consultation-number";
import { createAuditLog } from "@/lib/audit";
import { AppointmentStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, doctor } = await requireDoctorAuth(request);
    const { id: appointmentId } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        consultation: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment record not found" },
        { status: 404 }
      );
    }

    // Strict Doctor ownership validation
    if (appointment.doctorId !== doctor.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to start a consultation for another doctor's patient" },
        { status: 403 }
      );
    }

    // Status transition validation
    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      return NextResponse.json(
        { error: `Cannot start consultation for an appointment that is already ${appointment.status}` },
        { status: 400 }
      );
    }

    // Begin atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update appointment status to IN_CONSULTATION
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.IN_CONSULTATION,
        },
      });

      // 2. Check if consultation already exists
      let consultation = appointment.consultation;
      if (!consultation) {
        const nextConsultationNumber = await generateNextConsultationNumber();
        consultation = await tx.consultation.create({
          data: {
            consultationNumber: nextConsultationNumber,
            appointment: { connect: { id: appointment.id } },
            patient: { connect: { id: appointment.patientId } },
            doctor: { connect: { id: doctor.id } },
            status: "IN_PROGRESS",
            presentingComplaints: appointment.reason || null,
          },
        });
      }

      // 3. Create Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId: appointment.patientId,
          eventType: "CONSULTATION_STARTED",
          title: "Clinical Consultation Started",
          description: `Dr. ${doctor.firstName} ${doctor.lastName} started consultation #${consultation.consultationNumber} for appointment ${appointment.appointmentNumber}.`,
          entityId: consultation.id,
          performerName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
          performerRole: "DOCTOR",
        },
      });

      return {
        appointment: updatedAppointment,
        consultation,
      };
    });

    // 4. Record Audit Log
    await createAuditLog({
      action: "START_CONSULTATION",
      entity: "Consultation",
      entityId: result.consultation.id,
      userId: user.id,
      userRole: user.role,
      userName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      newValue: JSON.stringify({
        appointmentId: appointment.id,
        consultationNumber: result.consultation.consultationNumber,
        status: "IN_PROGRESS",
      }),
    });

    return NextResponse.json({
      success: true,
      appointment: result.appointment,
      consultation: result.consultation,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error starting consultation:", error);
    return NextResponse.json(
      { error: "Internal Server Error starting consultation" },
      { status: 500 }
    );
  }
}
