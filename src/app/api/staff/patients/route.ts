import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staff-auth";

export async function GET(request: NextRequest) {
  try {
    await requireStaffAuth(request, { requireNurse: true });

    const { searchParams } = request.nextUrl;
    const query = searchParams.get("search")?.trim() || "";

    if (!query) {
      // Return recent 15 patients
      const patients = await prisma.patient.findMany({
        take: 15,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          patientNumber: true,
          mrNumber: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          phone: true,
          cnic: true,
          bloodGroup: true,
          status: true,
          allergies: true,
          vitalSigns: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            select: {
              systolicBP: true,
              diastolicBP: true,
              pulse: true,
              temperature: true,
              oxygenSaturation: true,
              recordedAt: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: patients,
      });
    }

    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { mrNumber: { contains: query, mode: "insensitive" } },
          { patientNumber: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { cnic: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 25,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        patientNumber: true,
        mrNumber: true,
        firstName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        phone: true,
        cnic: true,
        bloodGroup: true,
        status: true,
        allergies: true,
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 1,
          select: {
            systolicBP: true,
            diastolicBP: true,
            pulse: true,
            temperature: true,
            oxygenSaturation: true,
            recordedAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in GET /api/staff/patients:", error);
    return NextResponse.json(
      { error: "Failed to search patient directory" },
      { status: 500 }
    );
  }
}
