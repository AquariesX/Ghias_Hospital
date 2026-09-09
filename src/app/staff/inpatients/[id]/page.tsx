import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import InpatientTreatmentClient from "./InpatientTreatmentClient";

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
  if (!adm) return { title: "Inpatient Not Found — GIAS Hospital" };
  return {
    title: `Inpatient Care: ${adm.patient.firstName} ${adm.patient.lastName} (${adm.roomBedNo}) — GIAS Hospital`,
  };
}

export default async function StaffInpatientTreatmentPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["NURSE", "ADMIN", "STAFF", "DOCTOR"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const { id } = await params;

  const staff = await prisma.staff.findFirst({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    include: { department: true },
  });

  const admission = await prisma.admission.findFirst({
    where: { OR: [{ id }, { admissionNumber: id }] },
    include: {
      patient: true,
      doctor: {
        include: { department: true },
      },
      vitalSigns: {
        orderBy: { recordedAt: "desc" },
        take: 50,
      },
      nursingNotes: {
        orderBy: { recordedAt: "desc" },
        take: 50,
      },
      medicationAdministrations: {
        orderBy: { administeredAt: "desc" },
        include: {
          prescriptionItem: true,
        },
      },
      prescriptions: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              administrations: {
                orderBy: { administeredAt: "desc" },
                take: 1,
              },
            },
          },
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
        },
      },
    },
  });

  if (!admission) {
    notFound();
  }

  // Serialize Decimal and Date fields for client component
  const serializedAdmission = {
    ...admission,
    admissionDate: admission.admissionDate.toISOString(),
    dischargeDate: admission.dischargeDate?.toISOString() || null,
    createdAt: admission.createdAt.toISOString(),
    updatedAt: admission.updatedAt.toISOString(),
    temperature: admission.temperature ? Number(admission.temperature) : null,
    weight: admission.weight ? Number(admission.weight) : null,
    height: admission.height ? Number(admission.height) : null,
    bmi: admission.bmi ? Number(admission.bmi) : null,
    patient: {
      ...admission.patient,
      dateOfBirth: admission.patient.dateOfBirth.toISOString(),
      createdAt: admission.patient.createdAt.toISOString(),
      updatedAt: admission.patient.updatedAt.toISOString(),
    },
    vitalSigns: admission.vitalSigns.map((v) => ({
      ...v,
      temperature: v.temperature ? Number(v.temperature) : null,
      weight: v.weight ? Number(v.weight) : null,
      height: v.height ? Number(v.height) : null,
      bmi: v.bmi ? Number(v.bmi) : null,
      recordedAt: v.recordedAt.toISOString(),
    })),
    nursingNotes: admission.nursingNotes.map((n) => ({
      ...n,
      recordedAt: n.recordedAt.toISOString(),
    })),
    medicationAdministrations: admission.medicationAdministrations.map((m) => ({
      ...m,
      administeredAt: m.administeredAt.toISOString(),
      createdAt: m.createdAt.toISOString(),
    })),
    prescriptions: admission.prescriptions.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      items: p.items.map((it) => ({
        ...it,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
        administrations: it.administrations.map((ad) => ({
          ...ad,
          administeredAt: ad.administeredAt.toISOString(),
        })),
      })),
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
      <div className="max-w-7xl mx-auto">
        <InpatientTreatmentClient
          admission={serializedAdmission as any}
          currentUserRole={user.role}
        />
      </div>
    </DashboardLayout>
  );
}
