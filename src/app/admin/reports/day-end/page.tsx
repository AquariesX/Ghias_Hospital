import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import DayEndReportClient from "./DayEndReportClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Day End Report — GIAS Hospital Admin",
};

export default async function AdminDayEndReportPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <AdminLayout user={user}>
      <DayEndReportClient />
    </AdminLayout>
  );
}
