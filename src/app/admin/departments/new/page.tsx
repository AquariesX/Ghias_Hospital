import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import AddDeptForm from "./AddDeptForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Department — GHIAS Hospital Admin" };

export default async function AddDepartmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <AddDeptForm />
    </AdminLayout>
  );
}
