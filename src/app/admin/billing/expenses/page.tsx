import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Hospital Operational Expenses — GIAS Hospital Admin",
};

export default async function AdminExpensesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <ExpensesClient />
    </AdminLayout>
  );
}
