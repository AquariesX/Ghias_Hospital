import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import DoctorAppointmentsClient from "./DoctorAppointmentsClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Doctor Appointments — GIAS Hospital",
};

export default async function DoctorAppointmentsPage() {
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
      <DoctorAppointmentsClient doctor={doctor} />
    </DashboardLayout>
  );
}
