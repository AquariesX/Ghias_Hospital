import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const allowedRoles = ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "STAFF"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to hospital authorized personnel" },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const priorityParam = searchParams.get("priority");
    const triageLevelParam = searchParams.get("triageLevel");
    const searchParam = searchParams.get("search")?.trim() || "";
    const allDays = searchParams.get("allDays") === "true";

    const conditions: Record<string, unknown>[] = [];

    // Unless viewing all history, show all currently undischarged emergency patients
    // PLUS any cases triaged within the last 48 hours (eliminates timezone boundary issues)
    if (!allDays) {
      const past48Hours = new Date(Date.now() - 48 * 60 * 60 * 1000);
      conditions.push({
        OR: [
          { dischargeDateTime: null },
          { triagedAt: { gte: past48Hours } },
        ],
      });
    }

    if (triageLevelParam && triageLevelParam !== "ALL") {
      conditions.push({ triageLevel: triageLevelParam });
    } else if (priorityParam && ["CRITICAL", "HIGH", "URGENT", "NORMAL"].includes(priorityParam)) {
      conditions.push({ priority: priorityParam });
    }

    if (searchParam) {
      conditions.push({
        OR: [
          { patient: { firstName: { contains: searchParam, mode: "insensitive" } } },
          { patient: { lastName: { contains: searchParam, mode: "insensitive" } } },
          { patient: { mrNumber: { contains: searchParam, mode: "insensitive" } } },
          { patient: { patientNumber: { contains: searchParam, mode: "insensitive" } } },
          { patient: { cnic: { contains: searchParam, mode: "insensitive" } } },
          { patient: { phone: { contains: searchParam, mode: "insensitive" } } },
          { chiefComplaint: { contains: searchParam, mode: "insensitive" } },
          { provisionalDiagnosis: { contains: searchParam, mode: "insensitive" } },
          { finalDiagnosis: { contains: searchParam, mode: "insensitive" } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const triages = await prisma.emergencyTriage.findMany({
      where,
      orderBy: [{ triagedAt: "desc" }],
      include: {
        admission: {
          select: {
            id: true,
            admissionNumber: true,
            roomBedNo: true,
            status: true,
            admissionDate: true,
            admissionTime: true,
            dischargeDate: true,
            dischargeTime: true,
          },
        },
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
            bloodGroup: true,
            cnic: true,
            maritalStatus: true,
            relationType: true,
            relatedPersonName: true,
            address: true,
            allergies: true,
            chronicConditions: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            vitalSigns: {
              orderBy: { recordedAt: "desc" },
              take: 3,
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: triages,
    });
  } catch (error: any) {
    console.error("Error in GET /api/staff/emergency/queue:", error);
    return NextResponse.json(
      { error: "Failed to retrieve Emergency nursing queue" },
      { status: 500 }
    );
  }
}
