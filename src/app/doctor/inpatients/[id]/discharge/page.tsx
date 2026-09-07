import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import DischargeWorkflowForm from "./DischargeWorkflowForm";
import { ArrowLeft, Stethoscope, Bed } from "lucide-react";

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
  if (!adm) return { title: "Discharge Workflow — GIAS Hospital" };
  return {
    title: `Discharge: ${adm.patient.firstName} ${adm.patient.lastName} — GIAS Hospital`,
  };
}

export default async function DischargeDecisionPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const [admission, activeDoctors] = await Promise.all([
    prisma.admission.findFirst({
      where: { OR: [{ id }, { admissionNumber: id }] },
      include: {
        patient: true,
        doctor: {
          include: { department: true },
        },
      },
    }),
    prisma.doctor.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
      },
      orderBy: { firstName: "asc" },
    }),
  ]);

  if (!admission) {
    notFound();
  }

  const doctorOptions = activeDoctors.map((d) => ({
    id: d.id,
    name: `Dr. ${d.firstName} ${d.lastName}`,
    specialization: d.specialization,
  }));

  const isAlreadyDischarged = admission.status === "DISCHARGED";

  return (
    <DashboardLayout user={user}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/doctor/inpatients/${admission.id}`}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
            title="Back to Review"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Inpatient Discharge Decision
            </h1>
            <p className="text-xs text-slate-500">
              Formulate final diagnosis, hospital summary, discharge prescriptions, and follow-up plan
            </p>
          </div>
        </div>

        <DischargeWorkflowForm
          admissionId={admission.id}
          admissionNumber={admission.admissionNumber}
          patientName={`${admission.patient.firstName} ${admission.patient.lastName}`}
          mrNumber={admission.patient.mrNumber || admission.patient.patientNumber}
          gender={admission.patient.gender}
          roomBedNo={admission.roomBedNo || "Bed Not Assigned"}
          admissionDate={admission.admissionDate.toISOString()}
          provisionalDiagnosis={admission.provisionalDiagnosis}
          attendingDoctorName={
            admission.doctor
              ? `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}`
              : null
          }
          doctors={doctorOptions}
          isAlreadyDischarged={isAlreadyDischarged}
          existingDischargeData={{
            finalDiagnosis: admission.finalDiagnosis,
            dischargeSummary: admission.dischargeSummary,
            dischargeInstructions: admission.dischargeInstructions,
            dischargeDate: admission.dischargeDate?.toISOString(),
          }}
        />
      </div>
    </DashboardLayout>
  );
}
