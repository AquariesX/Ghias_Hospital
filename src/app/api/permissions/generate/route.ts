import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requirePermissionManage } from "@/lib/permission-auth";
import { createAuditLog } from "@/lib/audit";

const VALID_PERMISSION_TYPES = ["ANESTHESIA", "OPERATION", "BLOOD_TRANSFUSION"] as const;

const generatePermissionSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  admissionId: z.string().uuid("Invalid admission ID"),
  permissions: z
    .array(z.enum(VALID_PERMISSION_TYPES))
    .min(1, "Please select at least one permission form")
    .max(3, "Maximum 3 permission types allowed"),
  consentDetails: z.record(z.string(), z.any()).optional(),
});

const PERMISSION_LABELS: Record<(typeof VALID_PERMISSION_TYPES)[number], { en: string; ur: string }> = {
  ANESTHESIA: {
    en: "Permission for Unconsciousness / Anesthesia",
    ur: "اجازت نامہ برائے بے ہوشی",
  },
  OPERATION: {
    en: "Permission for Operation",
    ur: "اجازت نامہ برائے آپریشن",
  },
  BLOOD_TRANSFUSION: {
    en: "Permission for Blood Transfusion",
    ur: "اجازت نامہ برائے انتقال خون (مریض)",
  },
};

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermissionManage(request);

    const body = await request.json().catch(() => ({}));
    const parseResult = generatePermissionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { patientId, admissionId, permissions } = parseResult.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Verify admission exists and belongs to this patient (IDOR protection)
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        doctor: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission record not found" }, { status: 404 });
    }

    if (admission.patientId !== patient.id) {
      return NextResponse.json(
        { error: "Security violation: Admission does not belong to the selected patient" },
        { status: 403 }
      );
    }

    const doctorName = admission.doctor
      ? `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}`
      : "Not Assigned";

    const permissionNamesEn = permissions.map((p) => PERMISSION_LABELS[p].en);
    const permissionNamesUr = permissions.map((p) => PERMISSION_LABELS[p].ur);

    // Transactionally create TimelineEvent and AuditLog
    await prisma.$transaction(async (tx) => {
      // 1. Record TimelineEvent on patient file
      await tx.timelineEvent.create({
        data: {
          patientId: patient.id,
          title: "Permission Documents Generated",
          eventType: "PERMISSION_DOCUMENT_GENERATED",
          description: `Generated ${permissions.length} unsigned permission form(s): ${permissionNamesUr.join("، ")} (${permissionNamesEn.join(", ")}) for Admission #${admission.admissionNumber}${admission.doctor ? ` under ${doctorName}` : ""}. Document marked UNSIGNED / FOR SIGNATURE.`,
          entityId: admission.id,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      // 2. Record AuditLog
      await createAuditLog(
        {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userRole: user.role,
          action: "PERMISSION_DOCUMENT_GENERATED",
          entity: "Patient",
          entityId: patient.id,
          newValue: JSON.stringify({
            admissionId: admission.id,
            admissionNumber: admission.admissionNumber,
            permissions,
            status: "UNSIGNED",
            watermark: "UNSIGNED / FOR SIGNATURE",
          }),
        },
        tx
      );
    });

    // Calculate patient age in years
    const dob = new Date(patient.dateOfBirth);
    const ageYears = new Date().getFullYear() - dob.getFullYear();

    return NextResponse.json({
      success: true,
      document: {
        hospitalName: "GIAS HOSPITAL PHALIA",
        regNumber: "REG NO. R-59488",
        generatedAt: new Date().toISOString(),
        generatedBy: `${user.firstName} ${user.lastName}`,
        isSigned: false,
        status: "UNSIGNED",
        watermarkText: "UNSIGNED / FOR SIGNATURE",
        selectedPermissions: permissions,
        patient: {
          id: patient.id,
          patientNumber: patient.patientNumber,
          mrNumber: patient.mrNumber || patient.patientNumber,
          fullName: `${patient.firstName} ${patient.lastName}`,
          firstName: patient.firstName,
          lastName: patient.lastName,
          gender: patient.gender,
          ageYears,
          bloodGroup: patient.bloodGroup,
          phone: patient.phone,
          cnic: patient.cnic || "",
          relationType: patient.relationType || "",
          relatedPersonName: patient.relatedPersonName || "",
          address: patient.address || "",
          emergencyContactName: patient.emergencyContactName,
          emergencyContactPhone: patient.emergencyContactPhone,
          emergencyContactRelation: patient.emergencyContactRelation || "",
        },
        admission: {
          id: admission.id,
          admissionNumber: admission.admissionNumber,
          admissionDate: admission.admissionDate.toISOString().split("T")[0],
          admissionTime: admission.admissionTime || "",
          roomBedNo: admission.roomBedNo,
          admissionSource: admission.admissionSource,
          status: admission.status,
          provisionalDiagnosis: admission.provisionalDiagnosis || "",
          treatmentPlan: admission.treatmentPlan || "",
        },
        doctor: admission.doctor
          ? {
              id: admission.doctor.id,
              doctorNumber: admission.doctor.doctorNumber,
              fullName: `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}`,
              firstName: admission.doctor.firstName,
              lastName: admission.doctor.lastName,
              specialization: admission.doctor.specialization,
              departmentName: admission.doctor.department?.name || "",
              roomNumber: admission.doctor.roomNumber || "",
            }
          : null,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("Error generating permission document:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while generating permission document" },
      { status: 500 }
    );
  }
}
