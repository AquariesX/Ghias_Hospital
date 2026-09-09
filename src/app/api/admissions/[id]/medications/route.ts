import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MedicationAdminStatus } from "@prisma/client";

const createMedicationAdminSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  medicineName: z.string().trim().min(1, "Drug name is required").max(200),
  dosage: z.string().trim().min(1, "Dose is required").max(100),
  route: z.string().trim().min(1, "Route is required").max(50),
  status: z.enum(["GIVEN", "MISSED", "REFUSED", "HELD"]).default("GIVEN"),
  administeredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  administeredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Time must be HH:MM"),
  prescriptionItemId: z.string().uuid("Invalid prescription item ID").optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * GET /api/admissions/[id]/medications
 * Retrieves all MedicationAdministration records and active Prescriptions for this admission.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const allowedRoles = ["NURSE", "DOCTOR", "STAFF", "ADMIN"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized role for medication records" }, { status: 403 });
    }

    const { id } = await params;

    // Verify admission exists
    const admission = await prisma.admission.findFirst({
      where: { OR: [{ id }, { admissionNumber: id }] },
      select: {
        id: true,
        admissionNumber: true,
        patientId: true,
        status: true,
        roomBedNo: true,
        patient: {
          select: {
            id: true,
            mrNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission record not found" }, { status: 404 });
    }

    // Fetch MAR records and active Prescriptions
    const [medications, prescriptions] = await Promise.all([
      prisma.medicationAdministration.findMany({
        where: { admissionId: admission.id },
        orderBy: { administeredAt: "desc" },
        include: {
          prescriptionItem: {
            select: {
              id: true,
              medicineName: true,
              dosage: true,
              frequency: true,
              route: true,
            },
          },
        },
      }),
      prisma.prescription.findMany({
        where: { admissionId: admission.id },
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              administrations: {
                orderBy: { administeredAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  administeredAt: true,
                  administeredByName: true,
                },
              },
            },
          },
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        admission,
        medications,
        prescriptions,
      },
    });
  } catch (error) {
    console.error("GET /api/admissions/[id]/medications error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve medication records" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admissions/[id]/medications
 * Records medication administration by an authorized Nurse/Clinician.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Role verification: NURSE, STAFF, DOCTOR, ADMIN. RECEPTIONIST is explicitly denied.
    const allowedRoles = ["NURSE", "STAFF", "DOCTOR", "ADMIN"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only nurses and authorized clinical staff can record medication administration." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify admission exists
    const admission = await prisma.admission.findFirst({
      where: { OR: [{ id }, { admissionNumber: id }] },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrNumber: true,
          },
        },
      },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = createMedicationAdminSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // IDOR Protection: Ensure admission belongs strictly to the submitted patientId
    if (admission.patientId !== data.patientId) {
      return NextResponse.json(
        { error: "Security Error: The admission does not belong to the specified patient." },
        { status: 400 }
      );
    }

    // If a prescriptionItemId is provided, verify it belongs to this patient or admission
    if (data.prescriptionItemId) {
      const presItem = await prisma.prescriptionItem.findUnique({
        where: { id: data.prescriptionItemId },
        include: {
          prescription: {
            select: {
              patientId: true,
              admissionId: true,
            },
          },
        },
      });

      if (!presItem || presItem.prescription.patientId !== data.patientId) {
        return NextResponse.json(
          { error: "Invalid prescription item reference." },
          { status: 400 }
        );
      }
    }

    // Construct the actual administration timestamp from Date and Time provided by Nurse
    // (Preserves actual time of clinical administration, e.g. 08:00 AM entered at 10:30 AM)
    const timeParts = data.administeredTime.split(":");
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

    const [year, month, day] = data.administeredDate.split("-").map(Number);
    const administeredAt = new Date(year, month - 1, day, hours, minutes, seconds);

    if (isNaN(administeredAt.getTime())) {
      return NextResponse.json(
        { error: "Invalid administration date or time format" },
        { status: 400 }
      );
    }

    // Resolving administering user identity
    const administeredById = user.id;
    const administeredByName = `${user.firstName} ${user.lastName}`.trim() || user.username || "Staff Nurse";

    // Transactionally create MedicationAdministration, TimelineEvent, and AuditLog
    const result = await prisma.$transaction(async (tx) => {
      const medAdmin = await tx.medicationAdministration.create({
        data: {
          patientId: data.patientId,
          admissionId: admission.id,
          prescriptionItemId: data.prescriptionItemId || null,
          medicineName: data.medicineName,
          dosage: data.dosage,
          route: data.route,
          status: data.status as MedicationAdminStatus,
          administeredAt,
          administeredById,
          administeredByName,
          notes: data.notes?.trim() || null,
        },
      });

      // Format description for timeline event
      const timelineDesc = `${data.medicineName} (${data.dosage}, ${data.route}) — Status: ${data.status}. Recorded by ${administeredByName}.${data.notes ? ` Notes: ${data.notes}` : ""}`;

      // Create clinical TimelineEvent
      await tx.timelineEvent.create({
        data: {
          patientId: data.patientId,
          title: `Medication Administration: ${data.medicineName} [${data.status}]`,
          description: timelineDesc,
          eventType: "MEDICATION_ADMINISTERED",
          entityId: medAdmin.id,
          performerName: administeredByName,
          performerRole: user.role,
          timestamp: administeredAt,
        },
      });

      // Create system AuditLog
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userName: administeredByName,
          userRole: user.role,
          action: "MEDICATION_ADMINISTRATION_CREATED",
          entity: "MedicationAdministration",
          entityId: medAdmin.id,
          newValue: JSON.stringify({
            admissionId: admission.id,
            admissionNumber: admission.admissionNumber,
            patientId: data.patientId,
            medicineName: data.medicineName,
            dosage: data.dosage,
            route: data.route,
            status: data.status,
            administeredAt: administeredAt.toISOString(),
            administeredByName,
          }),
        },
      });

      return medAdmin;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Medication administration recorded successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admissions/[id]/medications error:", error);
    return NextResponse.json(
      { error: "Failed to record medication administration" },
      { status: 500 }
    );
  }
}
