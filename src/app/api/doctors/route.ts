import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim() || "";

    const where: Record<string, unknown> = {
      status: "ACTIVE",
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { specialization: { contains: search, mode: "insensitive" } },
        { doctorNumber: { contains: search, mode: "insensitive" } },
        { roomNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        doctorNumber: true,
        firstName: true,
        lastName: true,
        specialization: true,
        roomNumber: true,
        consultationFee: true,
        availability: true,
        status: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      doctors,
      data: doctors,
    });
  } catch (err) {
    console.error("GET /api/doctors error:", err);
    return NextResponse.json({ error: "Failed to fetch doctors list" }, { status: 500 });
  }
}
