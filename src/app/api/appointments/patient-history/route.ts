import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAppointmentAccess } from "@/lib/appointment-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAppointmentAccess(request);
    const { searchParams } = request.nextUrl;
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "patientId parameter is required" },
        { status: 400 }
      );
    }

    const [appointments, consultations] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId },
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              doctorNumber: true,
              specialization: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
        take: 5,
      }),
      prisma.consultation.findMany({
        where: { patientId },
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
        },
        orderBy: { consultationDate: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      appointments,
      consultations,
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error fetching patient history for follow-up:", err);
    return NextResponse.json(
      { error: "Failed to load patient consultation history" },
      { status: 500 }
    );
  }
}
