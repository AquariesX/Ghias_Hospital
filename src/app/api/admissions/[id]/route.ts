import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canViewPatients, canManagePatients } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { AdmissionStatus } from "@prisma/client";

const updateAdmissionSchema = z.object({
  status: z.enum([
    "ADMITTED",
    "UNDER_TREATMENT",
    "DISCHARGE_PENDING",
    "TRANSFERRED",
    "DISCHARGED",
    "REFERRED",
    "CANCELLED",
  ]).optional(),
  roomBedNo: z.string().min(1).optional(),
  provisionalDiagnosis: z.string().optional().nullable(),
  finalDiagnosis: z.string().optional().nullable(),
  treatmentPlan: z.string().optional().nullable(),
  advisedDiet: z.string().optional().nullable(),
  nutritionalStatus: z.string().optional().nullable(),
  investigations: z.string().optional().nullable(),
  generalExamination: z.string().optional().nullable(),
  dischargeSummary: z.string().optional().nullable(),
  dischargeInstructions: z.string().optional().nullable(),
  dischargeMedications: z.string().optional().nullable(),
  followUpInstructions: z.string().optional().nullable(),
  dischargeReferralNote: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!canViewPatients(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    const admission = await prisma.admission.findFirst({
      where: {
        OR: [{ id }, { admissionNumber: id }],
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            mrNumber: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            phone: true,
            email: true,
            address: true,
            bloodGroup: true,
            allergies: true,
            chronicConditions: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            emergencyContactRelation: true,
            status: true,
          },
        },
        doctor: {
          select: {
            id: true,
            doctorNumber: true,
            firstName: true,
            lastName: true,
            specialization: true,
            email: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 30,
        },
        nursingNotes: {
          orderBy: { recordedAt: "desc" },
          take: 30,
        },
        medicationAdministrations: {
          orderBy: { administeredAt: "desc" },
          take: 50,
        },
        prescriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
            doctor: {
              select: {
                firstName: true,
                lastName: true,
                doctorNumber: true,
              },
            },
          },
        },
        statements: {
          include: {
            statement: true,
          },
        },
      },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission record not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: admission,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("GET /api/admissions/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch admission details" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!canManagePatients(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateAdmissionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.admission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    const updated = await prisma.admission.update({
      where: { id },
      data: {
        ...result.data,
        status: result.data.status ? (result.data.status as AdmissionStatus) : undefined,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrNumber: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: "UPDATE_ADMISSION",
      entity: "Admission",
      entityId: id,
      oldValue: JSON.stringify({ status: existing.status, roomBedNo: existing.roomBedNo }),
      newValue: JSON.stringify({ status: updated.status, roomBedNo: updated.roomBedNo }),
    });

    return NextResponse.json({
      success: true,
      message: "Admission updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("PUT /api/admissions/[id] error:", error);
    return NextResponse.json({ error: "Failed to update admission" }, { status: 500 });
  }
}
