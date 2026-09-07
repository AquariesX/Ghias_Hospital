import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAppointmentAccess } from "@/lib/appointment-auth";
import { createAuditLog } from "@/lib/audit";
import { AppointmentStatus } from "@prisma/client";

const updateAppointmentSchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  appointmentTime: z.string().min(1).optional(),
  notes: z.string().max(1000).optional().nullable(),
  cancellationReason: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAppointmentAccess(request);
    const { id } = await context.params;

    const appointment = await prisma.appointment.findFirst({
      where: {
        OR: [{ id }, { appointmentNumber: id }],
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            mrNumber: true,
            firstName: true,
            lastName: true,
            cnic: true,
            phone: true,
            gender: true,
            dateOfBirth: true,
            bloodGroup: true,
            address: true,
            status: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            emergencyContactRelation: true,
          },
        },
        doctor: {
          select: {
            id: true,
            doctorNumber: true,
            firstName: true,
            lastName: true,
            specialization: true,
            roomNumber: true,
            consultationFee: true,
            phone: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        consultation: {
          select: {
            id: true,
            consultationNumber: true,
            consultationDate: true,
            provisionalDiagnosis: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json({ appointment });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error fetching appointment details:", err);
    return NextResponse.json(
      { error: "Failed to load appointment details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAppointmentAccess(request);
    const { id } = await context.params;
    const body = await request.json();

    const parseResult = updateAppointmentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, appointmentDate, appointmentTime, notes, cancellationReason } = parseResult.data;

    const existing = await prisma.appointment.findFirst({
      where: { OR: [{ id }, { appointmentNumber: id }] },
      include: {
        patient: true,
        doctor: true,
        department: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Role check: Receptionist/Admin can reschedule, check-in, cancel.
    // Doctor can transition WAITING -> IN_CONSULTATION -> COMPLETED.
    if (user.role === "DOCTOR") {
      // Doctor can only update status for their own appointment
      if (user.doctorProfile && existing.doctorId !== user.doctorProfile.id) {
        return NextResponse.json(
          { error: "Forbidden: Clinicians may only update status for their own appointments" },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (appointmentDate) {
      updateData.appointmentDate = new Date(`${appointmentDate}T00:00:00.000Z`);
    }

    if (appointmentTime) {
      updateData.appointmentTime = appointmentTime;
    }

    if (cancellationReason && status === AppointmentStatus.CANCELLED) {
      updateData.notes = existing.notes
        ? `${existing.notes}\n[Cancellation Reason: ${cancellationReason}]`
        : `[Cancellation Reason: ${cancellationReason}]`;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          patient: true,
          doctor: true,
          department: true,
        },
      });

      // Record timeline event if status changed
      if (status && status !== existing.status) {
        await tx.timelineEvent.create({
          data: {
            patientId: existing.patientId,
            eventType:
              status === AppointmentStatus.CANCELLED
                ? "APPOINTMENT_CANCELLED"
                : "APPOINTMENT_UPDATED",
            title: `Appointment Status: ${status}`,
            description: `Appointment ${existing.appointmentNumber} with Dr. ${existing.doctor.firstName} ${existing.doctor.lastName} changed status to ${status}.${
              cancellationReason ? ` Reason: ${cancellationReason}` : ""
            }`,
            entityId: existing.id,
            performerName: `${user.firstName} ${user.lastName}`,
            performerRole: user.role,
          },
        });
      }

      return apt;
    });

    await createAuditLog({
      action: "UPDATE",
      entity: "APPOINTMENT",
      entityId: existing.id,
      userId: user.id,
      userRole: user.role,
      userName: `${user.firstName} ${user.lastName}`,
      oldValue: JSON.stringify({
        status: existing.status,
        appointmentDate: existing.appointmentDate.toISOString(),
        appointmentTime: existing.appointmentTime,
      }),
      newValue: JSON.stringify({
        appointmentNumber: existing.appointmentNumber,
        previousStatus: existing.status,
        newStatus: updated.status,
        date: appointmentDate || existing.appointmentDate.toISOString(),
        time: appointmentTime || existing.appointmentTime,
        reason: cancellationReason,
      }),
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error updating appointment:", err);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}
