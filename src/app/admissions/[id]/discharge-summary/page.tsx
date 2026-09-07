import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import DischargeSummaryPrintClient from "./DischargeSummaryPrintClient";

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
  if (!adm) return { title: "Discharge Summary Not Found — GIAS Hospital" };
  return {
    title: `Discharge Summary — ${adm.patient.firstName} ${adm.patient.lastName} (${adm.admissionNumber})`,
  };
}

export default async function DischargeSummaryPage({ params }: Props) {
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
      prescriptions: {
        where: { notes: { contains: "Discharge" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          items: true,
        },
      },
    },
  });

  if (!admission) {
    notFound();
  }

  // If no specific discharge prescription found, grab latest prescription for admission
  if (admission.prescriptions.length === 0) {
    const latestRx = await prisma.prescription.findFirst({
      where: { admissionId: admission.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    if (latestRx) {
      admission.prescriptions.push(latestRx);
    }
  }

  const serializedAdmission = {
    ...admission,
    admissionDate: admission.admissionDate.toISOString(),
    dischargeDate: admission.dischargeDate ? admission.dischargeDate.toISOString() : null,
    patient: {
      ...admission.patient,
      dateOfBirth: admission.patient.dateOfBirth.toISOString(),
    },
    prescriptions: admission.prescriptions.map((rx) => ({
      ...rx,
      createdAt: rx.createdAt.toISOString(),
    })),
  };

  return <DischargeSummaryPrintClient admission={serializedAdmission} />;
}
