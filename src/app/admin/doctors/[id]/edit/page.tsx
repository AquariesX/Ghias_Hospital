import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import EditDoctorClient from "./EditDoctorClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Doctor — GIAS Hospital Admin" };

export default async function EditDoctorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <EditDoctorClient />
    </AdminLayout>
  );
}
