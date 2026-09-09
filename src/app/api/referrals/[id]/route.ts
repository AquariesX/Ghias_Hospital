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

    const referral = await prisma.patientReferral.findFirst({
      where: {
        OR: [{ id }, { referralNumber: id }],
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

    if (!referral) {
      return NextResponse.json({ error: "Referral record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, referral });
  } catch (error) {
    console.error("GET /api/referrals/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch referral" }, { status: 500 });
  }
}
