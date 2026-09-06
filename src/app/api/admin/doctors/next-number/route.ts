import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const lastDoctor = await prisma.doctor.findFirst({
      orderBy: { doctorNumber: "desc" },
      select: { doctorNumber: true },
    });

    let nextNum = 1;
    if (lastDoctor?.doctorNumber) {
      const match = lastDoctor.doctorNumber.match(/DOC-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    return NextResponse.json({
      nextNumber: `DOC-${String(nextNum).padStart(5, "0")}`,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
