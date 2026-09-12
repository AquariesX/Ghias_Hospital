import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Billing & Financial Records — GIAS Hospital Admin",
};

export default async function AdminBillingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <BillingClient />
    </AdminLayout>
  );
}
