import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateNextPrescriptionNumber } from "@/lib/prescription-number";

// High alert medications prohibited from verbal orders by hospital SOP
const HIGH_ALERT_DRUGS = [
  "potassium chloride",
  "kcl",
  "insulin",
  "chemotherapy",
  "cytotoxic",
  "methotrexate",
  "warfarin",
  "heparin",
  "morphine",
  "fentanyl",
  "pethidine",
  "propofol",
  "atracurium",
  "rocuronium",
  "vecuronium",
  "concentrated sodium chloride",
  "3% nacl",
];

const doctorOrderItemSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().default("STAT"),
  route: z.string().default("Oral"),
  duration: z.string().default("1 day"),
  instructions: z.string().optional().nullable(),
});

const doctorOrderSchema = z.object({
  doctorId: z.string().optional().nullable(),
  doctorName: z.string().optional().nullable(),
  orderType: z.enum([
    "MEDICATION",
    "INVESTIGATION",
    "NURSING_CARE",
    "DIET",
    "PROCEDURE",
    "MONITORING",
    "GENERAL",
  ]).default("MEDICATION"),
  urgency: z.enum(["ROUTINE", "URGENT", "STAT"]).default("ROUTINE"),
  diagnosis: z.string().optional().nullable(),
  orderText: z.string().min(1, "Order instructions are required"),
  clinicalNotes: z.string().optional().nullable(),
  items: z.array(doctorOrderItemSchema).optional().default([]),

  // Verbal Order / Doctor Permission Fields
  isVerbalOrder: z.boolean().default(false),
  verbalOrderReason: z.string().optional().nullable(),
  receivingNurseName: z.string().optional().nullable(),
  secondNurseName: z.string().optional().nullable(),
  isReadBackConfirmed: z.boolean().default(false),
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

    const { id: admissionId } = await params;

    const admission = await prisma.admission.findFirst({
      where: { OR: [{ id: admissionId }, { admissionNumber: admissionId }] },
      select: { id: true, patientId: true },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { admissionId: admission.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
            roomNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: prescriptions,
    });
  } catch (error: any) {
    console.error("Error in GET /api/staff/inpatients/[id]/doctor-orders:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve doctor orders" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const allowedRoles = ["DOCTOR", "ADMIN", "NURSE", "STAFF"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Unauthorized access" }, { status: 403 });
    }

    const { id: admissionId } = await params;
    const body = await request.json();
    const parseResult = doctorOrderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const admission = await prisma.admission.findFirst({
      where: { OR: [{ id: admissionId }, { admissionNumber: admissionId }] },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    if (admission.status === "DISCHARGED") {
      return NextResponse.json(
        { error: "Patient has been discharged. New doctor orders cannot be recorded." },
        { status: 400 }
      );
    }

    // Role-based verbal order rules
    const isNurseOrStaff = user.role === "NURSE" || user.role === "STAFF";

    if (isNurseOrStaff && !data.isVerbalOrder) {
      return NextResponse.json(
        {
          error:
            "Nurses and staff may only record doctor orders with Doctor Permission as a Verbal Order (زبانی احکامات). Please check 'Verbal Order with Doctor Permission'.",
        },
        { status: 403 }
      );
    }

    // Strict Verbal Order Policy Validations
    if (data.isVerbalOrder) {
      if (!data.secondNurseName || data.secondNurseName.trim().length === 0) {
        return NextResponse.json(
          {
            error:
              "Hospital Verbal Order SOP Violation: A second nurse must verify, repeat back, and witness this order (دوسری نرس کے دستخط ضروری ہیں).",
          },
          { status: 400 }
        );
      }

      if (!data.isReadBackConfirmed) {
        return NextResponse.json(
          {
            error:
              "Hospital Verbal Order SOP Violation: Receiving nurse must confirm 'Read-Back & Verified' with the ordering physician before saving.",
          },
          { status: 400 }
        );
      }

      // Check High Alert / High Risk Drugs prohibition
      const combinedText = `${data.orderText} ${data.items.map((it) => it.medicineName).join(" ")}`.toLowerCase();
      for (const highAlert of HIGH_ALERT_DRUGS) {
        if (combinedText.includes(highAlert)) {
          return NextResponse.json(
            {
              error: `Hospital SOP Violation: '${highAlert.toUpperCase()}' is a High-Alert / High-Risk medication. High-alert medications are strictly PROHIBITED from verbal orders (ہائی الرٹ اور ہائی رسک ادویات کیلئے کوئی زبانی حکم قبول نہیں ہو گا). Doctor must write and sign a direct order.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Resolve Doctor
    let resolvedDoctorId = data.doctorId;
    if (!resolvedDoctorId && user.role === "DOCTOR") {
      const doc = await prisma.doctor.findFirst({
        where: { OR: [{ userId: user.id }, { email: user.email }] },
      });
      if (doc) resolvedDoctorId = doc.id;
    }

    if (!resolvedDoctorId) {
      resolvedDoctorId = admission.doctorId;
    }

    if (!resolvedDoctorId) {
      const activeDoc = await prisma.doctor.findFirst({ where: { status: "ACTIVE" } });
      resolvedDoctorId = activeDoc?.id || null;
    }

    if (!resolvedDoctorId) {
      return NextResponse.json(
        { error: "Attending doctor could not be resolved. Please select the ordering doctor." },
        { status: 400 }
      );
    }

    const doctorRecord = await prisma.doctor.findUnique({
      where: { id: resolvedDoctorId },
      select: { id: true, firstName: true, lastName: true, specialization: true },
    });

    const prescriptionNumber = await generateNextPrescriptionNumber();
    const performerName = `${user.firstName} ${user.lastName}`.trim();

    // Prepare metadata block for notes
    const metadata = {
      isDoctorOrder: true,
      orderType: data.orderType,
      urgency: data.urgency,
      orderText: data.orderText,
      clinicalNotes: data.clinicalNotes || null,
      isVerbalOrder: data.isVerbalOrder,
      verbalOrderReason: data.verbalOrderReason || null,
      receivingNurseName: data.isVerbalOrder
        ? (data.receivingNurseName?.trim() || performerName)
        : null,
      secondNurseName: data.secondNurseName?.trim() || null,
      isReadBackConfirmed: data.isReadBackConfirmed,
      isCountersigned: user.role === "DOCTOR" && !data.isVerbalOrder,
      countersignedAt:
        user.role === "DOCTOR" && !data.isVerbalOrder ? new Date().toISOString() : null,
      countersignedByName:
        user.role === "DOCTOR" && !data.isVerbalOrder
          ? `Dr. ${doctorRecord?.firstName} ${doctorRecord?.lastName}`
          : null,
      recordedByName: performerName,
      recordedByRole: user.role,
      recordedAt: new Date().toISOString(),
    };

    const formattedNotes = `[GIAS_DOCTOR_ORDER]:${JSON.stringify(metadata)}\n\n${data.orderText}${
      data.clinicalNotes ? `\n\nClinical Notes: ${data.clinicalNotes}` : ""
    }`;

    const newPrescription = await prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.create({
        data: {
          prescriptionNumber,
          patientId: admission.patientId,
          doctorId: resolvedDoctorId!,
          admissionId: admission.id,
          diagnosis: data.diagnosis?.trim() || admission.provisionalDiagnosis || "Inpatient Care",
          notes: formattedNotes,
          status: "ACTIVE",
          items: {
            create: data.items.map((it) => ({
              medicineName: it.medicineName.trim(),
              dosage: it.dosage.trim(),
              frequency: it.frequency.trim(),
              route: it.route.trim(),
              duration: it.duration.trim(),
              instructions: it.instructions?.trim() || null,
            })),
          },
        },
        include: {
          items: true,
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true,
              roomNumber: true,
            },
          },
        },
      });

      // Record Clinical Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId: admission.patientId,
          title: data.isVerbalOrder
            ? `Verbal Doctor Order Recorded (${prescriptionNumber})`
            : `Doctor Order Issued (${prescriptionNumber})`,
          description: `${data.orderType} [${data.urgency}]: ${data.orderText}. ${
            data.isVerbalOrder
              ? `Authorized by Dr. ${doctorRecord?.firstName} ${doctorRecord?.lastName}, taken by ${metadata.receivingNurseName}, witness: ${metadata.secondNurseName}`
              : `Ordered by Dr. ${doctorRecord?.firstName} ${doctorRecord?.lastName}`
          }`,
          eventType: "PRESCRIPTION_ISSUED",
          entityId: rx.id,
          performerName,
          performerRole: user.role,
        },
      });

      return rx;
    });

    return NextResponse.json(
      {
        success: true,
        message: data.isVerbalOrder
          ? "Verbal Doctor Order recorded in RED per hospital policy"
          : "Doctor order recorded successfully",
        data: newPrescription,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/staff/inpatients/[id]/doctor-orders:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record doctor order" },
      { status: 500 }
    );
  }
}
