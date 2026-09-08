import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManagePatients } from "@/lib/rbac";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AdmissionsClient from "./AdmissionsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inpatient Admission — GHIAS Hospital" };

export default async function AdmissionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManagePatients(user.role)) {
    redirect("/patients");
  }

  return (
    <DashboardLayout
      user={{
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
      }}
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading admission intake...</div>}>
        <AdmissionsClient />
      </Suspense>
    </DashboardLayout>
  );
}
