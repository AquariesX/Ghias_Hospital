import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const lastStaff = await prisma.staff.findFirst({
      orderBy: { staffNumber: "desc" },
      select: { staffNumber: true },
    });

    let nextNum = 1;
    if (lastStaff?.staffNumber) {
      const match = lastStaff.staffNumber.match(/STF-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    return NextResponse.json({
      nextNumber: `STF-${String(nextNum).padStart(5, "0")}`,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
