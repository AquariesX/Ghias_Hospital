import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionManage } from "@/lib/permission-auth";
import { createAuditLog } from "@/lib/audit";

const logPrintSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  admissionId: z.string().uuid("Invalid admission ID"),
  permissions: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermissionManage(request);

    const body = await request.json().catch(() => ({}));
    const parseResult = logPrintSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { patientId, admissionId, permissions } = parseResult.data;

    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "PERMISSION_DOCUMENT_PRINTED",
      entity: "Patient",
      entityId: patientId,
      newValue: JSON.stringify({
        admissionId,
        permissions,
        printedAt: new Date().toISOString(),
        status: "UNSIGNED",
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Error logging permission print:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while logging print action" },
      { status: 500 }
    );
  }
}
