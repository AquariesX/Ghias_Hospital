import { Suspense } from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageAppointments } from "@/lib/rbac";
import PatientLayout from "@/components/layout/PatientLayout";
import AppointmentBookingWizard from "./AppointmentBookingWizard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Book Appointment — GIAS Hospital",
};

export default async function NewAppointmentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManageAppointments(user.role)) {
    redirect("/staff");
  }

  let initialDepartments: Array<{
    id: string;
    code: string;
    name: string;
    doctors: Array<{
      id: string;
      doctorNumber: string;
      firstName: string;
      lastName: string;
      specialization: string;
      roomNumber: string | null;
      consultationFee: number;
      regularFee: number | null;
      followUpFee: number | null;
      emergencyFee: number | null;
      availability: string;
      status: string;
      qualifications: string | null;
      designationEnglish: string | null;
      nameUrdu: string | null;
      specializationUrdu: string | null;
      qualificationsUrdu: string | null;
      subSpecialtyUrdu: string | null;
    }>;
  }> = [];

  try {
    const [departmentsData, unassignedDoctorsData] = await Promise.all([
      prisma.department.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          code: true,
          name: true,
          doctors: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              doctorNumber: true,
              firstName: true,
              lastName: true,
              specialization: true,
              roomNumber: true,
              consultationFee: true,
              regularFee: true,
              followUpFee: true,
              emergencyFee: true,
              availability: true,
              status: true,
              qualifications: true,
              designationEnglish: true,
              nameUrdu: true,
              specializationUrdu: true,
              qualificationsUrdu: true,
              subSpecialtyUrdu: true,
            },
            orderBy: { firstName: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.doctor.findMany({
        where: { status: "ACTIVE", departmentId: null },
        select: {
          id: true,
          doctorNumber: true,
          firstName: true,
          lastName: true,
          specialization: true,
          roomNumber: true,
          consultationFee: true,
          regularFee: true,
          followUpFee: true,
          emergencyFee: true,
          availability: true,
          status: true,
          qualifications: true,
          designationEnglish: true,
          nameUrdu: true,
          specializationUrdu: true,
          qualificationsUrdu: true,
          subSpecialtyUrdu: true,
        },
        orderBy: { firstName: "asc" },
      }),
    ]);

    initialDepartments = departmentsData.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      doctors: d.doctors.map((doc) => ({
        ...doc,
        consultationFee: Number(doc.consultationFee),
        regularFee: doc.regularFee != null ? Number(doc.regularFee) : null,
        followUpFee: doc.followUpFee != null ? Number(doc.followUpFee) : null,
        emergencyFee: doc.emergencyFee != null ? Number(doc.emergencyFee) : null,
      })),
    }));

    const formattedUnassigned = unassignedDoctorsData.map((doc) => ({
      ...doc,
      consultationFee: Number(doc.consultationFee),
      regularFee: doc.regularFee != null ? Number(doc.regularFee) : null,
      followUpFee: doc.followUpFee != null ? Number(doc.followUpFee) : null,
      emergencyFee: doc.emergencyFee != null ? Number(doc.emergencyFee) : null,
    }));

    if (formattedUnassigned.length > 0) {
      const existingOpd = initialDepartments.find(
        (d) => d.code === "OPD" || d.code === "GEN" || d.name.toLowerCase().includes("opd")
      );
      if (existingOpd) {
        existingOpd.doctors = [...existingOpd.doctors, ...formattedUnassigned];
      } else {
        initialDepartments.push({
          id: "general-opd-unassigned",
          code: "GEN",
          name: "General Consultation / OPD",
          doctors: formattedUnassigned,
        });
      }
    }
  } catch (error) {
    console.error("Error preloading departments/doctors in NewAppointmentPage:", error);
  }

  return (
    <PatientLayout user={user}>
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto p-12 text-center text-sm text-slate-500">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Initializing appointment booking workflow...
          </div>
        }
      >
        <AppointmentBookingWizard initialDepartments={initialDepartments} />
      </Suspense>
    </PatientLayout>
  );
}

