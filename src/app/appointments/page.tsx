import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canViewAppointments } from "@/lib/rbac";
import PatientLayout from "@/components/layout/PatientLayout";
import AppointmentsListClient from "./AppointmentsListClient";

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
        <AppointmentsListClient />
      </Suspense>
    </PatientLayout>
  );
}
