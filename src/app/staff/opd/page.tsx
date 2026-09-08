import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import OpdQueueClient from "./OpdQueueClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "OPD Patient Queue — GHIAS Hospital" };

export default async function OpdQueuePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["NURSE", "ADMIN", "STAFF"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const staff = await prisma.staff.findFirst({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    include: { department: true },
  });

  return (
    <DashboardLayout
      user={{
        ...user,
        nurseDepartment: staff?.nurseDepartment || "OPD",
        staffRole: staff?.role || null,
      }}
    >
      <div className="max-w-6xl mx-auto">
        <OpdQueueClient />
      </div>
    </DashboardLayout>
  );
}
