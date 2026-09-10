import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import NursePatientClient from "./NursePatientClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Patient Clinical Workspace — GHIAS Hospital" };

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
        consultations: {
          orderBy: { consultationDate: "desc" },
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                roomNumber: true,
              },
            },
          },
          take: 30,
        },
        prescriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
            doctor: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true,
              },
            },
          },
          take: 20,
        },
        medicationAdministrations: {
          orderBy: { administeredAt: "desc" },
          take: 50,
        },
        admissions: {
          orderBy: { admissionDate: "desc" },
          include: {
            doctor: {
              select: {
                firstName: true,
                lastName: true,
                specialization: true,
              },
            },
          },
          take: 10,
        },
      },
    }),
  ]);

  if (!patient) {
    notFound();
  }

  // Convert Decimal fields to numbers and Dates to strings for client components
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
      admissionDateTime: t.admissionDateTime ? t.admissionDateTime.toISOString() : null,
      dischargeDateTime: t.dischargeDateTime ? t.dischargeDateTime.toISOString() : null,
    })),
    appointments: patient.appointments.map((a) => ({
      ...a,
      consultationFee: Number(a.consultationFee),
      appointmentDate: a.appointmentDate.toISOString(),
    })),
    consultations: patient.consultations.map((c) => ({
      ...c,
      consultationDate: c.consultationDate.toISOString(),
    })),
    prescriptions: patient.prescriptions.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    medicationAdministrations: patient.medicationAdministrations.map((m) => ({
      ...m,
      administeredAt: m.administeredAt.toISOString(),
      createdAt: m.createdAt.toISOString(),
    })),
    admissions: patient.admissions.map((adm) => ({
      ...adm,
      admissionDate: adm.admissionDate.toISOString(),
      dischargeDate: adm.dischargeDate ? adm.dischargeDate.toISOString() : null,
      pulse: adm.pulse ?? null,
      temperature: adm.temperature ? Number(adm.temperature) : null,
      systolicBP: adm.systolicBP ?? null,
      diastolicBP: adm.diastolicBP ?? null,
      weight: adm.weight ? Number(adm.weight) : null,
      height: adm.height ? Number(adm.height) : null,
      bmi: adm.bmi ? Number(adm.bmi) : null,
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
