import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import prisma from "@/lib/prisma";
import RoomsBedsClient from "./RoomsBedsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rooms & Beds Management — GHIAS Hospital Admin" };

export default async function AdminRoomsBedsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const rooms = await prisma.room.findMany({
    orderBy: { roomNumber: "asc" },
    include: {
      beds: {
        orderBy: { bedNumber: "asc" },
        include: {
          admissions: {
            where: {
              status: {
                in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"],
              },
            },
            select: {
              id: true,
              admissionNumber: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  mrNumber: true,
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  // Serialize dates for client
  const serializedRooms = rooms.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    name: r.name,
    department: r.department,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    beds: r.beds.map((b) => ({
      id: b.id,
      bedNumber: b.bedNumber,
      roomId: b.roomId,
      status: b.status,
      isActive: b.isActive,
      notes: b.notes,
      currentPatient: b.admissions[0]
        ? {
            admissionId: b.admissions[0].id,
            admissionNumber: b.admissions[0].admissionNumber,
            patientName: `${b.admissions[0].patient.firstName} ${b.admissions[0].patient.lastName}`.trim(),
            mrNumber: b.admissions[0].patient.mrNumber,
          }
        : null,
    })),
  }));

  return (
    <AdminLayout user={user}>
      <RoomsBedsClient initialRooms={serializedRooms} />
    </AdminLayout>
  );
}
