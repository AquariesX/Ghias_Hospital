import { NextRequest, NextResponse } from "next/server";
import { requirePatientManage } from "@/lib/patient-auth";
import { generatePatientAndMRNumbers } from "@/lib/patient-number";

export async function GET(request: NextRequest) {
  try {
    await requirePatientManage(request);

    const numbers = await generatePatientAndMRNumbers();

    return NextResponse.json({
      success: true,
      data: numbers,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Failed to generate next patient numbers:", error);
    return NextResponse.json(
      { error: "Failed to generate patient numbers" },
      { status: 500 }
    );
  }
}
