import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAppointmentAccess } from "@/lib/appointment-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAppointmentAccess(request);

    const [departments, unassignedDoctors] = await Promise.all([
      prisma.department.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          doctors: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              doctorNumber: true,
              firstName: true,
              lastName: true,
              specialization: true,
              roomNumber: true,
              consultationFee: true,
              regularFee: true,
              followUpFee: true,
              emergencyFee: true,
              availability: true,
              status: true,
            },
            orderBy: { firstName: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.doctor.findMany({
        where: { status: "ACTIVE", departmentId: null },
        select: {
          id: true,
          doctorNumber: true,
          firstName: true,
          lastName: true,
          specialization: true,
          roomNumber: true,
          consultationFee: true,
          regularFee: true,
          followUpFee: true,
          emergencyFee: true,
          availability: true,
          status: true,
        },
        orderBy: { firstName: "asc" },
      }),
    ]);

    if (unassignedDoctors.length > 0) {
      const existingOpd = departments.find(
        (d) => d.code === "OPD" || d.code === "GEN" || d.name.toLowerCase().includes("opd")
      );
      if (existingOpd) {
        // Merge unassigned doctors into existing OPD department without creating duplicate department
        existingOpd.doctors = [...existingOpd.doctors, ...unassignedDoctors];
      } else {
        departments.push({
          id: "general-opd-unassigned",
          code: "GEN",
          name: "General Consultation / OPD",
          description: "Doctors assigned to consultation rooms",
          doctors: unassignedDoctors,
        });
      }
    }

    return NextResponse.json({ departments });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error fetching appointment departments:", err);
    return NextResponse.json(
      { error: "Failed to load clinical departments" },
      { status: 500 }
    );
  }
}
