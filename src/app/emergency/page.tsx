import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import EmergencyTriageClient from "./EmergencyTriageClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Emergency & Triage Station — GHIAS Hospital Phalia" };

export default async function EmergencyPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; action?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "STAFF"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const staff = await prisma.staff.findFirst({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    include: { department: true },
  });

  const params = await searchParams;
  const shouldOpenNewModal = params.new === "true" || params.action === "new";

  return (
    <DashboardLayout
      user={{
        ...user,
        nurseDepartment: staff?.nurseDepartment || (user.role === "NURSE" ? "EMERGENCY" : null),
        staffRole: staff?.role || null,
      }}
    >
      <div className="max-w-7xl mx-auto">
        <EmergencyTriageClient
          initialNewModalOpen={shouldOpenNewModal}
          userRole={user.role}
        />
      </div>
    </DashboardLayout>
  );
}
