import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import AddDoctorForm from "./AddDoctorForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Doctor — GHIAS Hospital Admin" };

export default async function AddDoctorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <AddDoctorForm />
    </AdminLayout>
  );
}
