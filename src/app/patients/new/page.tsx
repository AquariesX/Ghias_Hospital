import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManagePatients } from "@/lib/rbac";
import PatientLayout from "@/components/layout/PatientLayout";
import PatientRegistrationForm from "./PatientRegistrationForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admit Patient — GHIAS Hospital" };

export default async function NewPatientPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManagePatients(user.role)) {
    redirect("/patients");
  }

  return (
    <PatientLayout user={user}>
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto p-12 text-center text-sm text-slate-500">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading patient intake form...
          </div>
        }
      >
        <PatientRegistrationForm />
      </Suspense>
    </PatientLayout>
  );
}
