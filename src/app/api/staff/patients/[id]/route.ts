import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staff-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffAuth(request, { requireNurse: true });
    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 30,
        },
        emergencyTriages: {
          orderBy: { triagedAt: "desc" },
          take: 10,
        },
        nursingNotes: {
          orderBy: { recordedAt: "desc" },
          take: 20,
        },
        appointments: {
          orderBy: { appointmentDate: "desc" },
          take: 5,
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                roomNumber: true,
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
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in GET /api/staff/patients/[id]:", error);
    return NextResponse.json(
      { error: "Failed to retrieve patient clinical details" },
      { status: 500 }
    );
  }
}
