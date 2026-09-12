import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import PatientReportClient from "./PatientReportClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Patient Report — GIAS Hospital Admin",
};

export default async function AdminPatientReportPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <PatientReportClient />
    </AdminLayout>
  );
}
