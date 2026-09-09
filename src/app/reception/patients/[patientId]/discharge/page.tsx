import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DischargeFormClient from "./DischargeFormClient";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle2, BedDouble } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ patientId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { patientId } = await params;
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: patientId }, { patientNumber: patientId }, { mrNumber: patientId }] },
    select: { firstName: true, lastName: true, patientNumber: true, mrNumber: true },
  });

  if (!patient) return { title: "Discharge Form — GHIAS Hospital" };
  return {
    title: `Discharge Form: ${patient.firstName} ${patient.lastName} (${patient.mrNumber || patient.patientNumber}) — GHIAS Hospital`,
  };
}

export default async function ReceptionPatientDischargePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF", "DOCTOR", "NURSE"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const { patientId } = await params;

  // 1. Fetch Patient
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ id: patientId }, { patientNumber: patientId }, { mrNumber: patientId }],
    },
    include: {
      admissions: {
        orderBy: { admissionDate: "desc" },
        include: {
          doctor: {
            include: { department: true },
          },
          prescriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { items: true },
          },
        },
      },
    },
  });

  if (!patient) {
    notFound();
  }

  // 2. Determine active admission
  const activeAdmission = patient.admissions.find(
    (adm) => adm.status !== "DISCHARGED" && adm.status !== "CANCELLED"
  );

  // 3. Fetch active doctors for dropdown
  const doctors = await prisma.doctor.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      doctorNumber: true,
      firstName: true,
      lastName: true,
      specialization: true,
      roomNumber: true,
      department: { select: { name: true } },
    },
    orderBy: { firstName: "asc" },
  });

  const layoutUser = {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  return (
    <DashboardLayout user={layoutUser}>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/patients/${patient.id}`}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              title="Back to Patient File"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Patient Discharge Form</h1>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                  {patient.mrNumber || patient.patientNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hospital Inpatient Episode Discharge &amp; Printable Document Generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/patients/${patient.id}`}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition"
            >
              Patient Profile
            </Link>
          </div>
        </div>

        {/* Admission Status Guards */}
        {!activeAdmission ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center space-y-4 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">No Active Admission Found</h2>
              <p className="text-xs text-slate-600 mt-1">
                Patient <strong>{patient.firstName} {patient.lastName}</strong> is currently not admitted to the inpatient ward.
              </p>
            </div>

            {patient.admissions.length > 0 && (
              <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                <span className="font-bold text-slate-700 block">Past Admission History:</span>
                {patient.admissions.slice(0, 3).map((adm) => (
                  <div key={adm.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-b-0">
                    <span className="font-mono text-slate-800">#{adm.admissionNumber}</span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(adm.admissionDate).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {adm.status}
                    </span>
                    <Link
                      href={`/reception/discharge/${adm.id}/print`}
                      className="text-teal-700 hover:underline font-semibold text-[11px]"
                    >
                      View / Print Form
                    </Link>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/admissions"
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl transition inline-flex items-center gap-2"
              >
                <BedDouble className="w-4 h-4" />
                <span>Admit Patient</span>
              </Link>
              <Link
                href={`/patients/${patient.id}`}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Back to Patient File
              </Link>
            </div>
          </div>
        ) : (
          <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading discharge form...</div>}>
            <DischargeFormClient
              patient={{
                id: patient.id,
                mrNumber: patient.mrNumber || patient.patientNumber,
                patientNumber: patient.patientNumber,
                firstName: patient.firstName,
                lastName: patient.lastName,
                fullName: `${patient.firstName} ${patient.lastName}`,
                gender: patient.gender,
                dateOfBirth: patient.dateOfBirth.toISOString(),
                phone: patient.phone,
                cnic: patient.cnic,
                relationType: patient.relationType,
                relatedPersonName: patient.relatedPersonName,
                address: patient.address,
              }}
              admission={{
                id: activeAdmission.id,
                admissionNumber: activeAdmission.admissionNumber,
                admissionDate: activeAdmission.admissionDate.toISOString(),
                admissionTime: activeAdmission.admissionTime,
                admissionSource: activeAdmission.admissionSource,
                roomBedNo: activeAdmission.roomBedNo,
                status: activeAdmission.status,
                presentingComplaints: activeAdmission.presentingComplaints,
                generalExamination: activeAdmission.generalExamination,
                investigations: activeAdmission.investigations,
                provisionalDiagnosis: activeAdmission.provisionalDiagnosis,
                finalDiagnosis: activeAdmission.finalDiagnosis,
                operation: activeAdmission.operation,
                outcome: activeAdmission.outcome,
                dischargeCondition: activeAdmission.dischargeCondition || "Satisfactory",
                dischargeAdvisedByDoctor: activeAdmission.dischargeAdvisedByDoctor,
                isLama: activeAdmission.isLama,
                dischargeSummary: activeAdmission.dischargeSummary,
                dischargeInstructions: activeAdmission.dischargeInstructions,
                dischargeMedications: activeAdmission.dischargeMedications,
                followUpInstructions: activeAdmission.followUpInstructions,
                followUpDate: activeAdmission.followUpDate ? activeAdmission.followUpDate.toISOString().split("T")[0] : null,
                doctorId: activeAdmission.doctorId,
                doctor: activeAdmission.doctor
                  ? {
                      id: activeAdmission.doctor.id,
                      fullName: `Dr. ${activeAdmission.doctor.firstName} ${activeAdmission.doctor.lastName}`,
                      specialization: activeAdmission.doctor.specialization,
                      departmentName: activeAdmission.doctor.department?.name,
                    }
                  : null,
                prescriptions: activeAdmission.prescriptions.map((rx) => ({
                  items: rx.items.map((it) => ({
                    medicineName: it.medicineName,
                    dosage: it.dosage,
                    route: it.route,
                    frequency: it.frequency,
                    duration: it.duration,
                    instructions: it.instructions,
                  })),
                })),
              }}
              doctors={doctors.map((d) => ({
                id: d.id,
                fullName: `Dr. ${d.firstName} ${d.lastName}`,
                specialization: d.specialization,
                departmentName: d.department?.name,
                roomNumber: d.roomNumber,
              }))}
              userRole={user.role}
            />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  );
}
