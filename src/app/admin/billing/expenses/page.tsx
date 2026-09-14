import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Hospital Operational Expenses — GHIAS Hospital",
};

export default async function AdminExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    return (
      <AdminLayout user={user}>
        <ExpensesClient />
      </AdminLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <ExpensesClient />
    </DashboardLayout>
  );
}

