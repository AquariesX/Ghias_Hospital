import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import AssessmentSheetPrintClient from "./AssessmentSheetPrintClient";


export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const adm = await prisma.admission.findFirst({
    where: { OR: [{ id }, { admissionNumber: id }] },
    include: { patient: true },
  });
  if (!adm) return { title: "Assessment Sheet Not Found — Ghias Hospital" };
  return {
    title: `Assessment Sheet — ${adm.patient.firstName} ${adm.patient.lastName} (${adm.admissionNumber})`,
  };
}

export default async function AssessmentSheetPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewPatients(user.role)) redirect("/login");

  const { id } = await params;

  const admission = await prisma.admission.findFirst({
    where: { OR: [{ id }, { admissionNumber: id }] },
    include: {
      patient: true,
      doctor: {
        include: { department: true },
      },
      vitalSigns: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!admission) {
    notFound();
  }

  const serializedAdmission = {
    ...admission,
    pulse: admission.pulse ?? admission.vitalSigns[0]?.pulse ?? null,
    temperature: admission.temperature ? Number(admission.temperature) : admission.vitalSigns[0]?.temperature ? Number(admission.vitalSigns[0].temperature) : null,
    systolicBP: admission.systolicBP ?? admission.vitalSigns[0]?.systolicBP ?? null,
    diastolicBP: admission.diastolicBP ?? admission.vitalSigns[0]?.diastolicBP ?? null,
    respiratoryRate: admission.vitalSigns[0]?.respiratoryRate ?? null,
    weight: admission.weight ? Number(admission.weight) : admission.vitalSigns[0]?.weight ? Number(admission.vitalSigns[0].weight) : null,
    height: admission.height ? Number(admission.height) : admission.vitalSigns[0]?.height ? Number(admission.vitalSigns[0].height) : null,
    bmi: admission.bmi ? Number(admission.bmi) : null,
    admissionFee: admission.admissionFee ? Number(admission.admissionFee) : null,
    admissionDate: admission.admissionDate.toISOString(),
    dischargeDate: admission.dischargeDate ? admission.dischargeDate.toISOString() : null,
    patient: {
      ...admission.patient,
      dateOfBirth: admission.patient.dateOfBirth.toISOString(),
    },
  };

  return <AssessmentSheetPrintClient admission={serializedAdmission} />;
}
