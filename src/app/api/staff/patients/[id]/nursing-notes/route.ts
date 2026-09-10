import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/staff-auth";

const nursingNoteSchema = z.object({
  observation: z.string().min(2, "Observation is required").max(25000),
  patientCondition: z.string().min(2, "Patient condition is required").max(5000),
  intervention: z.string().max(25000).optional().nullable(),
  response: z.string().max(25000).optional().nullable(),
  notes: z.string().max(25000).optional().nullable(),
  department: z.enum(["OPD", "EMERGENCY", "INPATIENT"]).optional().nullable(),
  admissionId: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffAuth(request, { requireNurse: true });
    const { id } = await params;

    const notes = await prisma.nursingNote.findMany({
      where: { patientId: id },
      orderBy: { recordedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in GET /api/staff/patients/[id]/nursing-notes:", error);
    return NextResponse.json(
      { error: "Failed to retrieve nursing notes" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, staff } = await requireStaffAuth(request, { requireNurse: true });
    const { id: patientId } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const body = await request.json();
    const parseResult = nursingNoteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const department =
      data.department || staff.nurseDepartment || "OPD";
    const nurseFullName = `${staff.firstName} ${staff.lastName}`;

    const result = await prisma.$transaction(async (tx) => {
      const note = await tx.nursingNote.create({
        data: {
          patient: { connect: { id: patientId } },
          admission: data.admissionId ? { connect: { id: data.admissionId } } : undefined,
          department,
          observation: data.observation,
          patientCondition: data.patientCondition,
          intervention: data.intervention,
          response: data.response,
          notes: data.notes,
          recordedById: user.id,
          recordedByName: nurseFullName,
        },
      });

      // Create Timeline Event
      await tx.timelineEvent.create({
        data: {
          patient: { connect: { id: patientId } },
          title: `Nursing Note Added (${department})`,
          description: `Condition: ${data.patientCondition.slice(0, 120)}... Recorded by ${nurseFullName}`,
          eventType: "NURSING_NOTE_ADDED",
          entityId: note.id,
          performerName: nurseFullName,
          performerRole: "NURSE",
        },
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userName: nurseFullName,
          userRole: "NURSE",
          action: "CREATE_NURSING_NOTE",
          entity: "NursingNote",
          entityId: note.id,
          newValue: JSON.stringify({
            department,
            patientCondition: data.patientCondition,
          }),
        },
      });

      return note;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Nursing note recorded successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in POST /api/staff/patients/[id]/nursing-notes:", error);
    return NextResponse.json(
      { error: "Failed to record nursing note" },
      { status: 500 }
    );
  }
}
