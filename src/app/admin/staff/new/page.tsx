import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import AddStaffForm from "./AddStaffForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Staff — GIAS Hospital Admin" };

export default async function AddStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <AddStaffForm />
    </AdminLayout>
  );
}
