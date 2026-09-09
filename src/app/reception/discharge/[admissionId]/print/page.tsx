import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import DischargePrintClient from "./DischargePrintClient";
import { DischargeDocumentData } from "@/components/discharge/DischargeDocumentView";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Print Patient Discharge Form — GHIAS Hospital",
};

interface PrintPageProps {
  params: Promise<{ admissionId: string }>;
}

export default async function DischargePrintPage({ params }: PrintPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF", "DOCTOR", "NURSE"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const { admissionId } = await params;

  const admission = await prisma.admission.findFirst({
    where: {
      OR: [{ id: admissionId }, { admissionNumber: admissionId }],
    },
    include: {
      patient: true,
      doctor: {
        include: {
          department: true,
        },
      },
      prescriptions: {
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

  // Parse discharge medications
  let medications: any[] = [];
  if (admission.dischargeMedications) {
    try {
      const parsed = JSON.parse(admission.dischargeMedications);
      if (Array.isArray(parsed)) {
        medications = parsed;
      }
    } catch {
      // Non-JSON format
    }
  }

  if (medications.length === 0 && admission.prescriptions.length > 0) {
    const rx = admission.prescriptions[0];
    medications = rx.items.map((it, idx) => ({
      srNo: idx + 1,
      medicineName: it.medicineName,
      dosage: it.dosage,
      route: it.route || "Oral",
      frequency: it.frequency,
      timing: it.instructions || "After meals",
      duration: it.duration,
      instructions: it.instructions || "",
    }));
  }

  const dob = new Date(admission.patient.dateOfBirth);
  const ageYears = new Date().getFullYear() - dob.getFullYear();

  const documentData: DischargeDocumentData = {
    hospitalName: "GHIAS HOSPITAL PHALIA",
    regNumber: "REG NO. R-59488",
    title: "DISCHARGE FORM (Patient Copy)",
    generatedAt: new Date().toISOString(),
    generatedBy: `${user.firstName} ${user.lastName}`,
    patient: {
      id: admission.patient.id,
      patientNumber: admission.patient.patientNumber,
      mrNumber: admission.patient.mrNumber || admission.patient.patientNumber,
      fullName: `${admission.patient.firstName} ${admission.patient.lastName}`,
      firstName: admission.patient.firstName,
      lastName: admission.patient.lastName,
      gender: admission.patient.gender,
      ageYears,
      dateOfBirth: admission.patient.dateOfBirth.toISOString(),
      phone: admission.patient.phone,
      cnic: admission.patient.cnic,
      relationType: admission.patient.relationType,
      relatedPersonName: admission.patient.relatedPersonName,
      address: admission.patient.address,
    },
    admission: {
      id: admission.id,
      admissionNumber: admission.admissionNumber,
      admissionDate: admission.admissionDate.toISOString(),
      admissionTime: admission.admissionTime,
      dischargeDate: admission.dischargeDate ? admission.dischargeDate.toISOString() : new Date().toISOString(),
      dischargeTime: admission.dischargeTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      roomBedNo: admission.roomBedNo,
      admissionSource: admission.admissionSource,
      status: admission.status,
      presentingComplaints: admission.presentingComplaints,
      generalExamination: admission.generalExamination,
      investigations: admission.investigations,
      provisionalDiagnosis: admission.provisionalDiagnosis,
      finalDiagnosis: admission.finalDiagnosis,
      operation: admission.operation,
      outcome: admission.outcome,
      dischargeCondition: admission.dischargeCondition || "Satisfactory",
      dischargeAdvisedByDoctor: admission.dischargeAdvisedByDoctor,
      isLama: admission.isLama,
      dischargeSummary: admission.dischargeSummary,
      dischargeInstructions: admission.dischargeInstructions,
      followUpInstructions: admission.followUpInstructions,
      followUpDate: admission.followUpDate ? admission.followUpDate.toISOString() : null,
    },
    medications,
    doctor: admission.doctor
      ? {
          id: admission.doctor.id,
          doctorNumber: admission.doctor.doctorNumber,
          fullName: `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}`,
          specialization: admission.doctor.specialization,
          departmentName: admission.doctor.department?.name,
          roomNumber: admission.doctor.roomNumber,
        }
      : null,
  };

  return <DischargePrintClient data={documentData} />;
}
