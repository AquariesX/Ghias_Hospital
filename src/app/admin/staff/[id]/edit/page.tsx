import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import EditStaffClient from "./EditStaffClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Staff — GIAS Hospital Admin" };

export default async function EditStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <EditStaffClient />
    </AdminLayout>
  );
}
