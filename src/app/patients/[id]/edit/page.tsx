import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManagePatients } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import PatientLayout from "@/components/layout/PatientLayout";
import EditPatientForm from "./EditPatientForm";

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

  if (!patient) return { title: "Edit Patient — GIAS Hospital" };

  return {
    title: `Edit ${patient.firstName} ${patient.lastName} (${patient.patientNumber}) — GIAS Hospital`,
  };
}

export default async function EditPatientPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManagePatients(user.role)) {
    redirect("/patients");
  }

  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ id }, { patientNumber: id }, { mrNumber: id }],
    },
  });

  if (!patient) {
    notFound();
  }

  // Format dateOfBirth to YYYY-MM-DD for standard HTML date input
  const dobFormatted = patient.dateOfBirth
    ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
    : "";

  const serializedPatient = {
    ...JSON.parse(JSON.stringify(patient)),
    dateOfBirthFormatted: dobFormatted,
  };

  return (
    <PatientLayout user={user}>
      <EditPatientForm patient={serializedPatient} />
    </PatientLayout>
  );
}
