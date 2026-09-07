import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staff-auth";

export async function GET(request: NextRequest) {
  try {
    // Strictly require EMERGENCY department access and nurse role
    await requireStaffAuth(request, {
      requiredDepartment: "EMERGENCY",
      requireNurse: true,
    });

    const { searchParams } = request.nextUrl;
    const priorityParam = searchParams.get("priority");
    const searchParam = searchParams.get("search") || "";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      triagedAt: { gte: todayStart, lte: todayEnd },
    };

    if (priorityParam && ["CRITICAL", "HIGH", "URGENT", "NORMAL"].includes(priorityParam)) {
      where.priority = priorityParam;
    }

    if (searchParam) {
      where.OR = [
        { patient: { firstName: { contains: searchParam, mode: "insensitive" } } },
        { patient: { lastName: { contains: searchParam, mode: "insensitive" } } },
        { patient: { mrNumber: { contains: searchParam, mode: "insensitive" } } },
        { patient: { patientNumber: { contains: searchParam, mode: "insensitive" } } },
        { chiefComplaint: { contains: searchParam, mode: "insensitive" } },
      ];
    }

    const triages = await prisma.emergencyTriage.findMany({
      where,
      orderBy: [{ triagedAt: "desc" }],
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            mrNumber: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            phone: true,
            bloodGroup: true,
            allergies: true,
            chronicConditions: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            vitalSigns: {
              orderBy: { recordedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: triages,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in GET /api/staff/emergency/queue:", error);
    return NextResponse.json(
      { error: "Failed to retrieve Emergency nursing queue" },
      { status: 500 }
    );
  }
}
