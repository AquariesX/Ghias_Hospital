import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import PatientLayout from "@/components/layout/PatientLayout";
import DoctorQueueClient from "./DoctorQueueClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Doctor Clinical Queue — GIAS Hospital",
};

export default async function DoctorQueuePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
    redirect("/staff");
  }

  // Find linked doctor profile for this user
  const doctor = await prisma.doctor.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email }],
    },
    select: { id: true },
  });

  return (
    <PatientLayout user={user}>
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto p-12 text-center text-sm text-slate-500">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading clinical doctor queue...
          </div>
        }
      >
        <DoctorQueueClient
          initialDoctorId={doctor?.id}
          isAdmin={user.role === "ADMIN"}
        />
      </Suspense>
    </PatientLayout>
  );
}
