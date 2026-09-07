import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import NursePatientClient from "./NursePatientClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Patient Clinical Workspace — GIAS Hospital" };

export default async function NursePatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["NURSE", "ADMIN", "STAFF", "DOCTOR"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const { id } = await params;

  const [staff, patient] = await Promise.all([
    prisma.staff.findFirst({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      include: { department: true },
    }),
    prisma.patient.findUnique({
      where: { id },
      include: {
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 40,
        },
        nursingNotes: {
          orderBy: { recordedAt: "desc" },
          take: 30,
        },
        emergencyTriages: {
          orderBy: { triagedAt: "desc" },
          take: 15,
        },
        appointments: {
          orderBy: { appointmentDate: "desc" },
          take: 5,
        },
      },
    }),
  ]);

  if (!patient) {
    notFound();
  }

  // Convert Decimal fields to numbers for client components
  const sanitizedPatient = {
    ...patient,
    dateOfBirth: patient.dateOfBirth.toISOString(),
    vitalSigns: patient.vitalSigns.map((v) => ({
      ...v,
      temperature: v.temperature ? Number(v.temperature) : null,
      weight: v.weight ? Number(v.weight) : null,
      height: v.height ? Number(v.height) : null,
      bmi: v.bmi ? Number(v.bmi) : null,
      recordedAt: v.recordedAt.toISOString(),
    })),
    nursingNotes: patient.nursingNotes.map((n) => ({
      ...n,
      recordedAt: n.recordedAt.toISOString(),
    })),
    emergencyTriages: patient.emergencyTriages.map((t) => ({
      ...t,
      temperature: t.temperature ? Number(t.temperature) : null,
      triagedAt: t.triagedAt.toISOString(),
    })),
    appointments: patient.appointments.map((a) => ({
      ...a,
      consultationFee: Number(a.consultationFee),
      appointmentDate: a.appointmentDate.toISOString(),
    })),
  };

  return (
    <DashboardLayout
      user={{
        ...user,
        nurseDepartment: staff?.nurseDepartment || "OPD",
        staffRole: staff?.role || null,
      }}
    >
      <div className="max-w-6xl mx-auto">
        <NursePatientClient
          patient={sanitizedPatient as any}
          nurseDepartment={staff?.nurseDepartment || "OPD"}
        />
      </div>
    </DashboardLayout>
  );
}
