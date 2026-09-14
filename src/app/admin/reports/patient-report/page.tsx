import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PatientReportClient from "./PatientReportClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Patient Report — GHIAS Hospital",
};

export default async function AdminPatientReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    return (
      <AdminLayout user={user}>
        <PatientReportClient />
      </AdminLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <PatientReportClient />
    </DashboardLayout>
  );
}

