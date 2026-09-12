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
  if (!adm) return { title: "Inpatient Not Found — GHIAS Hospital" };
  return {
    title: `Inpatient Care: ${adm.patient.firstName} ${adm.patient.lastName} (${adm.roomBedNo}) — GHIAS Hospital`,
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

  const doctors = await prisma.doctor.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialization: true,
      roomNumber: true,
    },
  });

  // Serialize Decimal and Date fields safely for client component
  const serializedAdmission = JSON.parse(JSON.stringify(admission));
  const serializedDoctors = JSON.parse(JSON.stringify(doctors));

  return (
    <DashboardLayout
      user={{
        ...user,
        nurseDepartment: staff?.nurseDepartment || "IPD",
        staffRole: staff?.role || null,
      }}
    >
      <div className="max-w-7xl mx-auto">
        <InpatientTreatmentClient
          admission={serializedAdmission as any}
          currentUserRole={user.role}
          currentUserName={`${user.firstName} ${user.lastName}`.trim()}
          availableDoctors={serializedDoctors}
        />
      </div>
    </DashboardLayout>
  );
}
