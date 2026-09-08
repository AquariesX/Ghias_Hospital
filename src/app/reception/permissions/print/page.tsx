import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import PermissionPrintClient from "./PermissionPrintClient";
import { PermissionType } from "@/components/permissions/PermissionDocumentView";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Print Patient Permission Document — GHIAS Hospital",
};

interface PrintPageProps {
  searchParams: Promise<{
    patientId?: string;
    admissionId?: string;
    forms?: string;
    giverName?: string;
    giverRelation?: string;
    relationPersonName?: string;
    procedureName?: string;
    organOrBodyPart?: string;
    doctorName?: string;
    anesthetistName?: string;
    operationComplications?: string;
    operationAlternative?: string;
    bloodComponents?: string;
    bloodComplications?: string;
    bloodAlternative?: string;
    consentDate?: string;
    consentTime?: string;
  }>;
}

export default async function PermissionPrintPage({ searchParams }: PrintPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF", "DOCTOR"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const params = await searchParams;
  const { patientId, admissionId, forms } = params;

  if (!patientId || !admissionId) {
    notFound();
  }

  // Parse requested forms
  const validForms: PermissionType[] = ["ANESTHESIA", "OPERATION", "BLOOD_TRANSFUSION"];
  const parsedForms = (forms ? forms.split(",") : []).filter((f): f is PermissionType =>
    validForms.includes(f as PermissionType)
  );

  const selectedForms: PermissionType[] =
    parsedForms.length > 0 ? parsedForms : ["ANESTHESIA", "OPERATION"];

  // Fetch patient from PostgreSQL
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    notFound();
  }

  // Fetch admission with doctor
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    include: {
      doctor: {
        include: {
          department: true,
        },
      },
    },
  });

  if (!admission || admission.patientId !== patient.id) {
    notFound();
  }

  const dob = new Date(patient.dateOfBirth);
  const ageYears = new Date().getFullYear() - dob.getFullYear();

  const doctorFullName = admission.doctor
    ? `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}`
    : "Dr. Ghias Hospital";

  const documentData = {
    hospitalName: "GHIAS HOSPITAL PHALIA",
    regNumber: "REG NO. R-59488",
    generatedAt: new Date().toISOString(),
    generatedBy: `${user.firstName} ${user.lastName}`,
    isSigned: false,
    status: "UNSIGNED",
    watermarkText: "UNSIGNED / FOR SIGNATURE",
    selectedPermissions: selectedForms,
    consentDetails: {
      giverName: params.giverName || patient.relatedPersonName || `${patient.firstName} ${patient.lastName}`,
      relationToPatient: params.giverRelation || patient.relationType || "خود / مریض",
      relationPersonName: params.relationPersonName || patient.relatedPersonName || "",
      procedureName: params.procedureName || admission.provisionalDiagnosis || admission.treatmentPlan || "علاج و سرجری",
      organOrBodyPart: params.organOrBodyPart || "",
      doctorName: params.doctorName || doctorFullName,
      anesthetistName: params.anesthetistName || params.doctorName || doctorFullName,
      operationComplications: params.operationComplications || "خون بہنا، انفیکشن، الرجی",
      operationAlternative: params.operationAlternative || "ادویات و دیگر متبادل طریقہ علاج",
      bloodComponents: params.bloodComponents || "ہول بلڈ / ریڈ سیلز (Whole Blood / PRBC)",
      bloodComplications: params.bloodComplications || "بخار، الرجک ری ایکشن، لرزہ",
      bloodAlternative: params.bloodAlternative || "آئرن تھراپی / آئی وی فلوئڈز",
      consentDate: params.consentDate || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }),
      consentTime: params.consentTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    },
    patient: {
      id: patient.id,
      patientNumber: patient.patientNumber,
      mrNumber: patient.mrNumber || patient.patientNumber,
      fullName: `${patient.firstName} ${patient.lastName}`,
      firstName: patient.firstName,
      lastName: patient.lastName,
      gender: patient.gender,
      ageYears,
      bloodGroup: patient.bloodGroup,
      phone: patient.phone,
      cnic: patient.cnic || "",
      relationType: patient.relationType || "",
      relatedPersonName: patient.relatedPersonName || "",
      address: patient.address || "",
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
      emergencyContactRelation: patient.emergencyContactRelation || "",
    },
    admission: {
      id: admission.id,
      admissionNumber: admission.admissionNumber,
      admissionDate: admission.admissionDate.toISOString().split("T")[0],
      admissionTime: admission.admissionTime,
      roomBedNo: admission.roomBedNo,
      admissionSource: admission.admissionSource,
      status: admission.status,
      provisionalDiagnosis: admission.provisionalDiagnosis,
      treatmentPlan: admission.treatmentPlan,
    },
    doctor: admission.doctor
      ? {
          id: admission.doctor.id,
          doctorNumber: admission.doctor.doctorNumber,
          fullName: `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}`,
          firstName: admission.doctor.firstName,
          lastName: admission.doctor.lastName,
          specialization: admission.doctor.specialization,
          departmentName: admission.doctor.department?.name || "",
        }
      : null,
  };

  return <PermissionPrintClient data={documentData} />;
}
