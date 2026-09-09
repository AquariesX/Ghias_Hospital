import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportsClient from "@/app/reports/ReportsClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Reports & Analytics — GHIAS Hospital Admin",
};

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <ReportsClient />
    </AdminLayout>
  );
}
