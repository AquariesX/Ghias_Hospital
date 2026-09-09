import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients, canManagePatients } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import PatientLayout from "@/components/layout/PatientLayout";
import PatientProfileClient from "./PatientProfileClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ id }, { patientNumber: id }, { mrNumber: id }],
    },
    select: { firstName: true, lastName: true, patientNumber: true },
  });

  if (!patient) return { title: "Patient Not Found — GHIAS Hospital" };

  return {
    title: `${patient.firstName} ${patient.lastName} (${patient.patientNumber}) — GHIAS Hospital`,
  };
}

export default async function PatientProfilePage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canViewPatients(user.role)) {
    redirect("/login");
  }

  const { id } = await params;

  // Retrieve patient
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
    notFound();
  }

  // Fetch initial history
  const [
    appointments,
    consultations,
    prescriptions,
    admissions,
    vitalSigns,
    nursingNotes,
    timelineEvents,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          select: {
            id: true,
            doctorNumber: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
    }),

    prisma.consultation.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          select: {
            id: true,
            doctorNumber: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentNumber: true,
            department: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { consultationDate: "desc" },
    }),

    prisma.prescription.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          select: {
            id: true,
            doctorNumber: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.admission.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          select: {
            id: true,
            doctorNumber: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
      },
      orderBy: { admissionDate: "desc" },
    }),

    prisma.vitalSign.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: "desc" },
    }),

    prisma.nursingNote.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: "desc" },
    }),

    prisma.timelineEvent.findMany({
      where: { patientId: patient.id },
      orderBy: { timestamp: "desc" },
    }),
  ]);

  // Serialize Prisma decimal and dates safely for client component props
  const serializedPatient = JSON.parse(JSON.stringify(patient));
  const serializedHistory = JSON.parse(
    JSON.stringify({
      appointments,
      consultations,
      prescriptions,
      admissions,
      vitalSigns,
      nursingNotes,
      timelineEvents,
    })
  );

  const canEdit = canManagePatients(user.role);

  return (
    <PatientLayout user={user}>
      <PatientProfileClient
        patient={serializedPatient}
        initialHistory={serializedHistory}
        canEdit={canEdit}
      />
    </PatientLayout>
  );
}
