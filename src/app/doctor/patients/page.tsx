import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import DoctorPatientsClient from "./DoctorPatientsClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Doctor Patient Directory — GHIAS Hospital",
};

export default async function DoctorPatientsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "DOCTOR") {
    redirect("/login");
  }

  const doctor = await prisma.doctor.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email }],
    },
    include: {
      department: true,
    },
  });

  return (
    <DashboardLayout user={user}>
      <DoctorPatientsClient doctor={doctor} />
    </DashboardLayout>
  );
}
