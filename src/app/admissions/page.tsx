import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients } from "@/lib/rbac";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AdmissionsClient from "./AdmissionsClient";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inpatient Admission — GHIAS Hospital" };

export default async function AdmissionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canViewPatients(user.role)) {
    redirect("/patients");
  }

  // Pre-load active rooms and beds directly on the server for instant, zero-delay rendering
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { roomNumber: "asc" },
    include: {
      beds: {
        where: { isActive: true },
        orderBy: { bedNumber: "asc" },
        select: {
          id: true,
          bedNumber: true,
          status: true,
          isActive: true,
          notes: true,
          admissions: {
            where: {
              status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
            },
            select: {
              id: true,
              patient: {
                select: { firstName: true, lastName: true },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  const formattedRooms = rooms.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    name: r.name,
    department: r.department,
    totalBeds: r.beds.length,
    freeBeds: r.beds.filter((b) => b.status === "FREE").length,
    scheduledBeds: r.beds.filter((b) => b.status === "SCHEDULED").length,
    occupiedBeds: r.beds.filter((b) => b.status === "OCCUPIED").length,
    beds: r.beds.map((b) => ({
      id: b.id,
      bedNumber: b.bedNumber,
      status: b.status,
      isAvailable: b.status === "FREE",
      notes: b.notes,
      currentPatient: b.admissions[0]
        ? `${b.admissions[0].patient.firstName} ${b.admissions[0].patient.lastName}`
        : null,
    })),
  }));

  return (
    <DashboardLayout
      user={{
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
      }}
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading admission intake...</div>}>
        <AdmissionsClient initialRooms={formattedRooms} />
      </Suspense>
    </DashboardLayout>
  );
}
