import { Suspense } from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewAppointments } from "@/lib/rbac";
import PatientLayout from "@/components/layout/PatientLayout";
import AppointmentsListClient, { DoctorOption } from "./AppointmentsListClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Appointments Directory — GHIAS Hospital",
};

export default async function AppointmentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canViewAppointments(user.role)) {
    redirect("/login");
  }

  let initialDepartments: Array<{
    id: string;
    name: string;
    doctors: Array<{ id: string; firstName: string; lastName: string; specialization?: string | null }>;
  }> = [];
  let initialDoctors: DoctorOption[] = [];

  try {
    const [departmentsData, doctorsData] = await Promise.all([
      prisma.department.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          doctors: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true,
            },
            orderBy: { firstName: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.doctor.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialization: true,
          departmentId: true,
        },
        orderBy: { firstName: "asc" },
      }),
    ]);

    initialDepartments = departmentsData;
    initialDoctors = doctorsData;
  } catch (err) {
    console.error("Error preloading departments/doctors in AppointmentsPage:", err);
  }

  return (
    <PatientLayout user={user}>
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto p-12 text-center text-sm text-slate-500">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading appointments workspace...
          </div>
        }
      >
        <AppointmentsListClient
          initialDepartments={initialDepartments}
          initialDoctors={initialDoctors}
        />
      </Suspense>
    </PatientLayout>
  );
}

