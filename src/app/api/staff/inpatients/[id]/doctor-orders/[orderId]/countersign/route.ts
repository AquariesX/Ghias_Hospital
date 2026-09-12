import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only an authorized attending physician or administrator can countersign verbal orders." },
        { status: 403 }
      );
    }

    const { id: admissionId, orderId } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id: orderId },
      include: {
        doctor: true,
        patient: true,
      },
    });

    if (!prescription) {
      return NextResponse.json({ error: "Doctor order not found" }, { status: 404 });
    }

    // Parse existing metadata
    let metadata: any = {};
    let orderText = prescription.notes || "";
    if (prescription.notes?.includes("[GIAS_DOCTOR_ORDER]:")) {
      try {
        const parts = prescription.notes.split("[GIAS_DOCTOR_ORDER]:");
        const jsonString = parts[1].split("\n\n")[0];
        metadata = JSON.parse(jsonString);
        orderText = parts[1].slice(jsonString.length).trim();
      } catch (e) {
        // ignore parse error
      }
    }

    const doctorName = `Dr. ${user.firstName} ${user.lastName}`;
    const now = new Date().toISOString();

    metadata.isCountersigned = true;
    metadata.countersignedAt = now;
    metadata.countersignedByName = doctorName;
    metadata.countersignedById = user.id;

    const updatedNotes = `[GIAS_DOCTOR_ORDER]:${JSON.stringify(metadata)}\n\n${orderText}\n\n[COUNTERSIGNED]: Verified and countersigned by ${doctorName} on ${new Date().toLocaleString()}`;

    const updatedPrescription = await prisma.$transaction(async (tx) => {
      const rx = await tx.prescription.update({
        where: { id: orderId },
        data: {
          notes: updatedNotes,
        },
        include: {
          items: true,
          doctor: true,
        },
      });

      // Record Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId: prescription.patientId,
          title: `Verbal Doctor Order Countersigned (${prescription.prescriptionNumber})`,
          description: `Countersigned and validated by ${doctorName} within 24h SOP compliance window.`,
          eventType: "PRESCRIPTION_ISSUED",
          entityId: rx.id,
          performerName: doctorName,
          performerRole: "DOCTOR",
        },
      });

      return rx;
    });

    return NextResponse.json({
      success: true,
      message: `Verbal order countersigned successfully by ${doctorName}`,
      data: updatedPrescription,
    });
  } catch (error: any) {
    console.error("Error in POST countersign doctor order:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to countersign verbal order" },
      { status: 500 }
    );
  }
}
