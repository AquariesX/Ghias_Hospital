import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import AuditLogsClient from "./AuditLogsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Logs — GIAS Hospital Admin" };

export default async function AuditLogsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <AuditLogsClient />
    </AdminLayout>
  );
}
