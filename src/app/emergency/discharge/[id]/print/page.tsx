import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import EmergencyDischargePrintClient from "./EmergencyDischargePrintClient";
import { EmergencyDischargeDocumentData } from "@/components/emergency/EmergencyDischargeDocument";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Emergency Discharge Form — GHIAS Hospital Phalia",
};

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function EmergencyDischargePrintPage({ params }: PrintPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF", "DOCTOR", "NURSE"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const { id } = await params;

  // Search by EmergencyTriage ID, or linked admissionId, or patient MR number
  let triage = await prisma.emergencyTriage.findFirst({
    where: {
      OR: [
        { id },
        { admissionId: id },
        { patient: { mrNumber: id } },
      ],
    },
    include: {
      patient: true,
      admission: true,
    },
  });

  // If not found directly, check if ID matches an Admission with associated emergencyTriages
  if (!triage) {
    const admission = await prisma.admission.findFirst({
      where: {
        OR: [{ id }, { admissionNumber: id }],
      },
      include: {
        patient: true,
        emergencyTriages: {
          orderBy: { triagedAt: "desc" },
          take: 1,
        },
      },
    });

    if (admission && admission.emergencyTriages && admission.emergencyTriages.length > 0) {
      triage = {
        ...admission.emergencyTriages[0],
        patient: admission.patient,
        admission: admission,
      };
    }
  }

  if (!triage) {
    notFound();
  }

  const patient = triage.patient;
  const admission = triage.admission;
  const triagedByName = triage.triagedByName || "Triage Officer";

  const documentData: EmergencyDischargeDocumentData = {
    patient: {
      id: patient.id,
      mrNumber: patient.mrNumber || patient.patientNumber,
      patientNumber: patient.patientNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth?.toISOString(),
      phone: patient.phone,
      cnic: patient.cnic,
      relationType: patient.relationType,
      relatedPersonName: patient.relatedPersonName,
      address: patient.address,
    },
    triage: {
      id: triage.id,
      admissionDateTime: triage.admissionDateTime
        ? triage.admissionDateTime.toISOString()
        : triage.triagedAt.toISOString(),
      triagedAt: triage.triagedAt.toISOString(),
      triagedByName,
      systolicBP: triage.systolicBP,
      diastolicBP: triage.diastolicBP,
      pulse: triage.pulse,
      temperature: triage.temperature ? String(triage.temperature) : null,
      weight: null,
      oxygenSaturation: triage.oxygenSaturation,
      respiratoryRate: triage.respiratoryRate,
      chiefComplaint: triage.chiefComplaint,
      provisionalDiagnosis: triage.provisionalDiagnosis,
      finalDiagnosis: triage.finalDiagnosis || admission?.finalDiagnosis || null,
      observations: triage.observations,
    },
    discharge: {
      dischargeDateTime: admission?.dischargeDate
        ? admission.dischargeDate.toISOString()
        : triage.dischargeDateTime
        ? triage.dischargeDateTime.toISOString()
        : null,
      dischargeCondition: admission?.dischargeCondition || "Satisfactory / Discharged Home",
      dischargeSummary: admission?.dischargeSummary || null,
      dischargeInstructions: admission?.dischargeInstructions || null,
      dischargeMedications: admission?.dischargeMedications || null,
      outcome: admission?.outcome || admission?.dischargeCondition || "Satisfactory / Discharged Home",
    },
  };

  return (
    <EmergencyDischargePrintClient
      data={documentData}
      triageId={triage.id}
      patientId={patient.id}
    />
  );
}
