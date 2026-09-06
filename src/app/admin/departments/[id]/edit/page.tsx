import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import EditDeptClient from "./EditDeptClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Department — GIAS Hospital Admin" };

export default async function EditDepartmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <EditDeptClient />
    </AdminLayout>
  );
}
