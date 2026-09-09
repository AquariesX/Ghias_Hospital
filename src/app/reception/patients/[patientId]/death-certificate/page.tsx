import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DeathCertificateFormClient from "./DeathCertificateFormClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

  if (!patient) return { title: "Death Certificate — GHIAS Hospital" };
  return {
    title: `Death Certificate: ${patient.firstName} ${patient.lastName} (${patient.mrNumber || patient.patientNumber}) — GHIAS Hospital`,
  };
}

export default async function ReceptionPatientDeathCertificatePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF", "DOCTOR", "NURSE"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const { patientId } = await params;

  // 1. Fetch Patient with admissions
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ id: patientId }, { patientNumber: patientId }, { mrNumber: patientId }],
    },
    include: {
      admissions: {
        orderBy: { admissionDate: "desc" },
        include: {
          doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } },
        },
      },
    },
  });

  if (!patient) {
    notFound();
  }

  // 2. Fetch doctors for certifying consultant dropdown
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
                <h1 className="text-xl font-bold text-slate-900">Hospital Death Certificate</h1>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-900 border border-slate-300">
                  {patient.mrNumber || patient.patientNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Certification of Death &amp; Dead Body Handover Documentation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/reception/death-certificate"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition"
            >
              Death Certificate Hub
            </Link>
            <Link
              href={`/patients/${patient.id}`}
              className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 px-3.5 py-2 rounded-xl transition"
            >
              Patient Profile
            </Link>
          </div>
        </div>

        {/* Client Form Component */}
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading death certificate form...</div>}>
          <DeathCertificateFormClient
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
            admissions={patient.admissions.map((adm) => ({
              id: adm.id,
              admissionNumber: adm.admissionNumber,
              admissionDate: adm.admissionDate.toISOString(),
              admissionTime: adm.admissionTime,
              status: adm.status,
              roomBedNo: adm.roomBedNo,
              provisionalDiagnosis: adm.provisionalDiagnosis,
              finalDiagnosis: adm.finalDiagnosis,
              doctorId: adm.doctorId,
              doctor: adm.doctor
                ? {
                    id: adm.doctor.id,
                    fullName: `Dr. ${adm.doctor.firstName} ${adm.doctor.lastName}`,
                    specialization: adm.doctor.specialization,
                  }
                : null,
            }))}
            doctors={doctors.map((d) => ({
              id: d.id,
              fullName: `Dr. ${d.firstName} ${d.lastName}`,
              specialization: d.specialization,
              departmentName: d.department?.name,
            }))}
            userRole={user.role}
          />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
