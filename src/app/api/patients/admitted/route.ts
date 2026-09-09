import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePatientAccess } from "@/lib/patient-auth";
import { AdmissionStatus, AdmissionSource } from "@prisma/client";

const ACTIVE_ADMISSION_STATUSES: AdmissionStatus[] = [
  AdmissionStatus.ADMITTED,
  AdmissionStatus.UNDER_TREATMENT,
  AdmissionStatus.DISCHARGE_PENDING,
];

export async function GET(request: NextRequest) {
  try {
    const user = await requirePatientAccess(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const doctorId = searchParams.get("doctorId") || "";
    const source = searchParams.get("source") || "";
    const status = searchParams.get("status") || "";
    const roomBedNo = searchParams.get("roomBedNo")?.trim() || "";
    const date = searchParams.get("date") || "";

    // Base condition: admissions query
    const where: Record<string, unknown> = {};

    if (status === "ALL") {
      // Show all admission statuses
    } else if (status === "DISCHARGED") {
      where.status = AdmissionStatus.DISCHARGED;
    } else if (status === "REFERRED") {
      where.status = AdmissionStatus.REFERRED;
    } else if (status === "DECEASED" || status === "EXPIRED") {
      where.OR = [
        { dischargeCondition: { contains: "Deceased", mode: "insensitive" } },
        { outcome: { contains: "Expired", mode: "insensitive" } },
        { patient: { status: "DECEASED" } },
      ];
    } else if (status && Object.values(AdmissionStatus).includes(status as AdmissionStatus)) {
      where.status = status as AdmissionStatus;
    } else {
      // Default: Active inpatient admissions
      where.status = {
        in: ACTIVE_ADMISSION_STATUSES,
      };
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    // Nurse department isolation enforced server-side
    if (user.role === "NURSE") {
      const staff = await prisma.staff.findFirst({
        where: { OR: [{ userId: user.id }, { email: user.email }] },
        select: { nurseDepartment: true, role: true },
      });
      if (staff?.nurseDepartment) {
        where.admissionSource = staff.nurseDepartment;
      }
    } else if (source && (source === "OPD" || source === "EMERGENCY")) {
      where.admissionSource = source as AdmissionSource;
    }

    if (roomBedNo) {
      where.roomBedNo = { contains: roomBedNo, mode: "insensitive" };
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      where.admissionDate = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      };
    }

    if (search) {
      where.OR = [
        { admissionNumber: { contains: search, mode: "insensitive" } },
        { roomBedNo: { contains: search, mode: "insensitive" } },
        { provisionalDiagnosis: { contains: search, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { mrNumber: { contains: search, mode: "insensitive" } },
              { patientNumber: { contains: search, mode: "insensitive" } },
              { cnic: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          doctor: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, admissions] = await Promise.all([
      prisma.admission.count({ where }),
      prisma.admission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ admissionDate: "desc" }, { createdAt: "desc" }],
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
              bloodGroup: true,
              cnic: true,
              relationType: true,
              relatedPersonName: true,
              emergencyContactName: true,
              emergencyContactPhone: true,
              emergencyContactRelation: true,
              address: true,
              status: true,
              allergies: true,
            },
          },
          doctor: {
            select: {
              id: true,
              doctorNumber: true,
              firstName: true,
              lastName: true,
              specialization: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
          _count: {
            select: {
              vitalSigns: true,
              nursingNotes: true,
              medicationAdministrations: true,
              prescriptions: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      admissions: admissions.map((adm) => ({
        id: adm.id,
        admissionNumber: adm.admissionNumber,
        admissionDate: adm.admissionDate.toISOString().split("T")[0],
        admissionTime: adm.admissionTime,
        admissionSource: adm.admissionSource,
        roomBedNo: adm.roomBedNo,
        status: adm.status,
        provisionalDiagnosis: adm.provisionalDiagnosis,
        treatmentPlan: adm.treatmentPlan,
        patient: adm.patient,
        doctor: adm.doctor,
        metrics: adm._count,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/patients/admitted error:", error);
    return NextResponse.json(
      { error: "Internal server error retrieving admitted patients" },
      { status: 500 }
    );
  }
}
