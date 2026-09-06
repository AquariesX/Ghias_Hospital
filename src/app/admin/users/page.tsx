import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users — GIAS Hospital Admin" };

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <UsersClient currentUserId={user.id} />
    </AdminLayout>
  );
}
