import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import { AdmissionStatus } from "@prisma/client";
import StaffInpatientsClient from "./StaffInpatientsClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admitted Inpatients & Medication Sheets — GHIAS Hospital",
};

export default async function StaffInpatientsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["NURSE", "ADMIN", "STAFF", "DOCTOR"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const staff = await prisma.staff.findFirst({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    include: { department: true },
  });

  // Query active admitted patients (ADMITTED, UNDER_TREATMENT, DISCHARGE_PENDING)
  const whereClause: any = {
    status: {
      in: [
        AdmissionStatus.ADMITTED,
        AdmissionStatus.UNDER_TREATMENT,
        AdmissionStatus.DISCHARGE_PENDING,
      ],
    },
  };

  // Strict nurse department visibility
  if (user.role === "NURSE" && staff?.nurseDepartment) {
    whereClause.admissionSource = staff.nurseDepartment;
  }

  const admissions = await prisma.admission.findMany({
    where: whereClause,
    orderBy: { admissionDate: "desc" },
    include: {
      patient: {
        select: {
          id: true,
          patientNumber: true,
          mrNumber: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          phone: true,
          bloodGroup: true,
          allergies: true,
        },
      },
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialization: true,
          department: {
            select: { name: true },
          },
        },
      },
      _count: {
        select: {
          vitalSigns: true,
          nursingNotes: true,
          medicationAdministrations: true,
          prescriptions: true,
        },
      },
    },
  });

  const serializedAdmissions = admissions.map((adm) => ({
    ...adm,
    admissionDate: adm.admissionDate.toISOString(),
    patient: {
      ...adm.patient,
      dateOfBirth: adm.patient.dateOfBirth.toISOString(),
    },
  }));

  return (
    <DashboardLayout
      user={{
        ...user,
        nurseDepartment: staff?.nurseDepartment || "OPD",
        staffRole: staff?.role || null,
      }}
    >
      <div className="max-w-7xl mx-auto">
        <StaffInpatientsClient initialAdmissions={serializedAdmissions as any} />
      </div>
    </DashboardLayout>
  );
}
