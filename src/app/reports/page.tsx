import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Hospital Reports & Clinical Analytics — GHIAS Hospital",
};

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Admin, Doctors, and Receptionist/Staff can access reports sesuai RBAC
  return (
    <DashboardLayout user={user}>
      <ReportsClient />
    </DashboardLayout>
  );
}
