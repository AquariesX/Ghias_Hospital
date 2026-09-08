import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PermissionsClient from "./PermissionsClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Patient Permissions & Consents — GHIAS Hospital",
};

export default async function ReceptionPermissionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF", "DOCTOR"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
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
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading consents wizard...</div>}>
        <PermissionsClient />
      </Suspense>
    </DashboardLayout>
  );
}
