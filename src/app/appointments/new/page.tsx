import { Suspense } from "react";
import { redirect } from "next/navigation";
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
        <AppointmentBookingWizard />
      </Suspense>
    </PatientLayout>
  );
}
