import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PatientHistoryClient from "./PatientHistoryClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id }, { patientNumber: id }, { mrNumber: id }] },
    select: { firstName: true, lastName: true, mrNumber: true, patientNumber: true },
  });
  if (!patient) return { title: "Patient History Not Found — GHIAS Hospital" };
  return {
    title: `Complete History: ${patient.firstName} ${patient.lastName} (${patient.mrNumber || patient.patientNumber}) — GHIAS Hospital`,
  };
}

export default async function PatientHistoryPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewPatients(user.role)) redirect("/login");

  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id }, { patientNumber: id }, { mrNumber: id }] },
  });

  if (!patient) {
    notFound();
  }

  const patientId = patient.id;

  const [
    appointments,
    consultations,
    prescriptions,
    admissions,
    vitalSigns,
    nursingNotes,
    medicationAdministrations,
    timelineEvents,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
        department: { select: { name: true, code: true } },
      },
      orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
    }),
    prisma.consultation.findMany({
      where: { patientId },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
      },
      orderBy: { consultationDate: "desc" },
    }),
    prisma.prescription.findMany({
      where: { patientId },
      include: {
        items: true,
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.admission.findMany({
      where: { patientId },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
      },
      orderBy: { admissionDate: "desc" },
    }),
    prisma.vitalSign.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.nursingNote.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.medicationAdministration.findMany({
      where: { patientId },
      orderBy: { administeredAt: "desc" },
    }),
    prisma.timelineEvent.findMany({
      where: { patientId },
      orderBy: { timestamp: "desc" },
    }),
  ]);

  const serializedPatient = {
    ...patient,
    dateOfBirth: patient.dateOfBirth.toISOString(),
  };

  const serializedHistory = {
    appointments: appointments.map((a) => ({
      ...a,
      appointmentDate: a.appointmentDate.toISOString(),
      consultationFee: Number(a.consultationFee),
    })),
    consultations: consultations.map((c) => ({
      ...c,
      consultationDate: c.consultationDate.toISOString(),
    })),
    prescriptions: prescriptions.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
    admissions: admissions.map((adm) => ({
      ...adm,
      admissionDate: adm.admissionDate.toISOString(),
      dischargeDate: adm.dischargeDate ? adm.dischargeDate.toISOString() : null,
      pulse: adm.pulse,
      systolicBP: adm.systolicBP,
      diastolicBP: adm.diastolicBP,
    })),
    vitalSigns: vitalSigns.map((v) => ({
      ...v,
      recordedAt: v.recordedAt.toISOString(),
      temperature: v.temperature ? Number(v.temperature) : null,
      weight: v.weight ? Number(v.weight) : null,
      height: v.height ? Number(v.height) : null,
    })),
    nursingNotes: nursingNotes.map((n) => ({
      ...n,
      recordedAt: n.recordedAt.toISOString(),
    })),
    medicationAdministrations: medicationAdministrations.map((m) => ({
      ...m,
      administeredAt: m.administeredAt.toISOString(),
    })),
    timelineEvents: timelineEvents.map((t) => ({
      ...t,
      timestamp: t.timestamp.toISOString(),
    })),
  };

  return (
    <DashboardLayout user={user}>
      <PatientHistoryClient
        patient={serializedPatient}
        history={serializedHistory}
      />
    </DashboardLayout>
  );
}
