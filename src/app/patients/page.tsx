import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients } from "@/lib/rbac";
import PatientLayout from "@/components/layout/PatientLayout";
import PatientListClient from "./PatientListClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Patients Directory — GIAS Hospital" };

export default async function PatientsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canViewPatients(user.role)) {
    redirect("/login");
  }

  return (
    <PatientLayout user={user}>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading patient directory...</div>}>
        <PatientListClient userRole={user.role} />
      </Suspense>
    </PatientLayout>
  );
}
