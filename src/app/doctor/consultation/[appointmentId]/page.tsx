import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import ClinicalWorkspaceClient from "./ClinicalWorkspaceClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ appointmentId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { appointmentId } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });

  if (!appointment) return { title: "Consultation Workspace — GHIAS Hospital" };

  return {
    title: `Clinical Consultation: ${appointment.patient.firstName} ${appointment.patient.lastName} — GHIAS Hospital`,
  };
}

export default async function ConsultationWorkspacePage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "DOCTOR") {
    redirect("/login");
  }

  const { appointmentId } = await params;

  // Find linked doctor record
  const doctor = await prisma.doctor.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialization: true,
      qualifications: true,
      experience: true,
      nameUrdu: true,
      specializationUrdu: true,
      qualificationsUrdu: true,
      subSpecialtyUrdu: true,
      designationEnglish: true,
    },
  });

  if (!doctor) {
    redirect("/login");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { doctorId: true },
  });

  if (!appointment) {
    notFound();
  }

  // Strict ownership check
  if (appointment.doctorId !== doctor.id) {
    return (
      <DashboardLayout user={user}>
        <div className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-xl border border-rose-200 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-sm text-slate-600">
            You are not authorized to view or manage consultations assigned to another physician.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <ClinicalWorkspaceClient appointmentId={appointmentId} doctor={doctor} />
    </DashboardLayout>
  );
}
