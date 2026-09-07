import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canViewAppointments, canManageAppointments } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import PatientLayout from "@/components/layout/PatientLayout";
import AppointmentDetailsClient from "./AppointmentDetailsClient";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canViewAppointments(user.role)) {
    redirect("/login");
  }

  const { id } = await props.params;

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
          emergencyContactName: true,
          emergencyContactPhone: true,
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
    notFound();
  }

  // Convert dates and Decimal for client serialization
  const serializedAppointment = {
    ...appointment,
    consultationFee: appointment.consultationFee.toString(),
    appointmentDate: appointment.appointmentDate.toISOString(),
    createdAt: appointment.createdAt.toISOString(),
    patient: {
      ...appointment.patient,
      dateOfBirth: appointment.patient.dateOfBirth.toISOString(),
    },
    consultation: appointment.consultation
      ? {
          ...appointment.consultation,
          consultationDate: appointment.consultation.consultationDate.toISOString(),
        }
      : null,
  };

  const canManage = canManageAppointments(user.role);

  return (
    <PatientLayout user={user}>
      <AppointmentDetailsClient
        appointment={serializedAppointment}
        canManage={canManage}
      />
    </PatientLayout>
  );
}
