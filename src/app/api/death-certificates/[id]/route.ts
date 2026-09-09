import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;

    const certificate = await prisma.deathCertificate.findFirst({
      where: {
        OR: [{ id }, { certificateNumber: id }],
      },
      include: {
        patient: true,
        admission: true,
        doctor: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Death certificate record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, certificate });
  } catch (error) {
    console.error("GET /api/death-certificates/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch death certificate" }, { status: 500 });
  }
}
