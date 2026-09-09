import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  requireAppointmentAccess,
  requireAppointmentManage,
} from "@/lib/appointment-auth";
import { generateNextAppointmentNumber } from "@/lib/appointment-number";
import { generatePatientAndMRNumbers } from "@/lib/patient-number";
import { createAuditLog } from "@/lib/audit";
import {
  AppointmentType,
  AppointmentStatus,
  EmergencyPriority,
} from "@prisma/client";

const createAppointmentSchema = z.object({
  patientId: z.string().uuid("Invalid patient identifier").optional().nullable(),
  patientName: z.string().min(1, "Patient name is required").optional().nullable(),
  patientPhone: z.string().min(3, "Phone number is required").optional().nullable(),
  doctorId: z.string().uuid("Invalid doctor identifier"),
  departmentId: z.string().uuid("Invalid department identifier").optional().nullable(),
  appointmentType: z.nativeEnum(AppointmentType).default(AppointmentType.REGULAR),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
  appointmentTime: z.string().optional(),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isEmergency: z.boolean().optional().default(false),
  emergencyPriority: z.nativeEnum(EmergencyPriority).optional().nullable(),
  emergencyReason: z.string().max(500).optional().nullable(),
  immediateAttentionRequired: z.boolean().optional().default(false),
  status: z.nativeEnum(AppointmentStatus).optional(),
}).refine((data) => data.patientId || (data.patientName && data.patientPhone), {
  message: "Either existing patient selection or Patient Name & Phone Number is required",
  path: ["patientName"],
});

export async function GET(request: NextRequest) {
  try {
    await requireAppointmentAccess(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));
    const date = searchParams.get("date"); // "today", "tomorrow", or "YYYY-MM-DD"
    const departmentId = searchParams.get("departmentId") || undefined;
    const doctorId = searchParams.get("doctorId") || undefined;
    const appointmentType = searchParams.get("appointmentType") as AppointmentType | undefined;
    const status = searchParams.get("status") as AppointmentStatus | undefined;
    const search = searchParams.get("search")?.trim() || "";

    const where: Record<string, unknown> = {};

    // Date filtering
    if (date === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.appointmentDate = today;
    } else if (date === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      where.appointmentDate = tomorrow;
    } else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const targetDate = new Date(`${date}T00:00:00.000Z`);
      where.appointmentDate = targetDate;
    }

    if (departmentId) where.departmentId = departmentId;
    if (doctorId) where.doctorId = doctorId;
    if (appointmentType) where.appointmentType = appointmentType;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { appointmentNumber: { contains: search, mode: "insensitive" } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { patientNumber: { contains: search, mode: "insensitive" } },
              { mrNumber: { contains: search, mode: "insensitive" } },
              { cnic: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        orderBy: [
          { appointmentDate: "desc" },
          { appointmentTime: "asc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              mrNumber: true,
              firstName: true,
              lastName: true,
              cnic: true,
              phone: true,
              gender: true,
              dateOfBirth: true,
              bloodGroup: true,
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
              roomNumber: true,
              consultationFee: true,
            },
          },
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error fetching appointments:", err);
    return NextResponse.json(
      { error: "Failed to retrieve appointments list" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAppointmentManage(request);
    const body = await request.json();

    const parseResult = createAppointmentSchema.safeParse(body);
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

    // 1. Resolve Patient: use existing patientId, search by phone, or create new basic patient
    let patient: {
      id: string;
      firstName: string;
      lastName: string;
      patientNumber: string;
      mrNumber: string | null;
      status: string;
    } | null = null;

    if (data.patientId) {
      patient = await prisma.patient.findUnique({
        where: { id: data.patientId },
        select: { id: true, firstName: true, lastName: true, patientNumber: true, mrNumber: true, status: true },
      });
      if (!patient) {
        return NextResponse.json({ error: "Patient record not found" }, { status: 404 });
      }
    } else if (data.patientPhone) {
      const cleanPhone = data.patientPhone.trim();
      const existing = await prisma.patient.findFirst({
        where: { phone: cleanPhone },
        select: { id: true, firstName: true, lastName: true, patientNumber: true, mrNumber: true, status: true },
      });

      if (existing) {
        patient = existing;
      } else {
        const { patientNumber, mrNumber } = await generatePatientAndMRNumbers();
        const trimmedName = (data.patientName || "Walk-in Patient").trim();
        const parts = trimmedName.split(/\s+/);
        const firstName = parts[0] || "Patient";
        const lastName = parts.slice(1).join(" ") || ".";

        patient = await prisma.patient.create({
          data: {
            patientNumber,
            mrNumber,
            firstName,
            lastName,
            gender: "MALE",
            dateOfBirth: new Date("1995-01-01"),
            phone: cleanPhone,
            bloodGroup: "B_POSITIVE",
            emergencyContactName: trimmedName,
            emergencyContactPhone: cleanPhone,
            status: "ACTIVE",
          },
          select: { id: true, firstName: true, lastName: true, patientNumber: true, mrNumber: true, status: true },
        });
      }
    }

    if (!patient) {
      return NextResponse.json({ error: "Could not identify or register patient" }, { status: 400 });
    }

    // 2. Verify Doctor exists and is active
    const doctor = await prisma.doctor.findUnique({
      where: { id: data.doctorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        consultationFee: true,
        status: true,
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Selected doctor not found" }, { status: 404 });
    }

    if (doctor.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Dr. ${doctor.firstName} ${doctor.lastName} is currently inactive/on-leave` },
        { status: 400 }
      );
    }

    // 3. Resolve Department (from data or doctor's assigned department, with active fallback)
    let targetDeptId = data.departmentId || doctor.departmentId;
    if (!targetDeptId) {
      const fallbackDept = await prisma.department.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      targetDeptId = fallbackDept?.id || null;
    }

    if (!targetDeptId) {
      return NextResponse.json({ error: "No active clinical department available for appointment" }, { status: 400 });
    }

    const department = await prisma.department.findUnique({
      where: { id: targetDeptId },
      select: { id: true, name: true, status: true },
    });

    if (!department || department.status !== "ACTIVE") {
      return NextResponse.json({ error: "Department is inactive or not found" }, { status: 400 });
    }

    // 4. Default Date, Time, and Reason (Time is automatically set to creation timestamp)
    const dateStr = data.appointmentDate || new Date().toISOString().split("T")[0];
    const appointmentDate = new Date(`${dateStr}T00:00:00.000Z`);

    const now = new Date();
    const automaticTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const appointmentTime = automaticTime;
    const appointmentReason = data.reason?.trim() || "Doctor Consultation";

    // 5. Determine Emergency fields
    const isEmergency = data.appointmentType === AppointmentType.EMERGENCY || data.isEmergency;
    const emergencyPriority = isEmergency
      ? data.emergencyPriority || EmergencyPriority.URGENT
      : null;
    const emergencyReason = isEmergency
      ? data.emergencyReason || appointmentReason
      : null;

    // Determine initial status: if today, defaults to WAITING (ready in queue); else SCHEDULED
    const todayStr = new Date().toISOString().split("T")[0];
    const isToday = dateStr === todayStr;
    const initialStatus = data.status || (isToday ? AppointmentStatus.WAITING : AppointmentStatus.SCHEDULED);

    // Prevent accidental duplicate appointments for the same patient, doctor, and date
    const existingDuplicateAppointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate,
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.WAITING,
            AppointmentStatus.IN_CONSULTATION,
          ],
        },
      },
      select: { appointmentNumber: true, tokenNumber: true, status: true },
    });

    if (existingDuplicateAppointment) {
      return NextResponse.json(
        {
          error: `Patient already has an active appointment with Dr. ${doctor.firstName} ${doctor.lastName} on this date (${existingDuplicateAppointment.appointmentNumber}, Token #${existingDuplicateAppointment.tokenNumber}, Status: ${existingDuplicateAppointment.status}).`,
        },
        { status: 409 }
      );
    }

    // 6. Generate sequential Appointment Number
    const appointmentNumber = await generateNextAppointmentNumber();

    // 7. Atomic transaction: create appointment + timeline event + audit log
    const appointment = await prisma.$transaction(async (tx) => {
      // Calculate daily token number for this doctor on this appointmentDate (starts at 1 each day)
      const latestApt = await tx.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          appointmentDate,
        },
        orderBy: { tokenNumber: "desc" },
        select: { tokenNumber: true },
      });

      const dayCount = await tx.appointment.count({
        where: {
          doctorId: doctor.id,
          appointmentDate,
        },
      });

      const tokenNumber = Math.max((latestApt?.tokenNumber ?? 0) + 1, dayCount + 1);

      const created = await tx.appointment.create({
        data: {
          appointmentNumber,
          tokenNumber,
          patient: { connect: { id: patient.id } },
          doctor: { connect: { id: doctor.id } },
          department: { connect: { id: department.id } },
          appointmentType: data.appointmentType,
          appointmentDate,
          appointmentTime,
          consultationFee: doctor.consultationFee,
          reason: appointmentReason,
          status: initialStatus,
          notes: data.notes,
          isEmergency,
          emergencyPriority,
          emergencyReason,
          immediateAttentionRequired: isEmergency && data.immediateAttentionRequired,
          createdBy: { connect: { id: user.id } },
        },
        include: {
          patient: true,
          doctor: true,
          department: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      });

      // Record patient longitudinal timeline event
      await tx.timelineEvent.create({
        data: {
          patientId: patient.id,
          eventType: "APPOINTMENT_SCHEDULED",
          title: `Token #${tokenNumber} Issued (${created.appointmentType})`,
          description: `Token #${tokenNumber} (${created.appointmentNumber}) booked for Dr. ${doctor.firstName} ${doctor.lastName} (${department.name}) on ${dateStr} at ${appointmentTime}. Fee: PKR ${doctor.consultationFee}. Reason: ${appointmentReason}`,
          entityId: created.id,
          performerName: `${user.firstName} ${user.lastName}`,
          performerRole: user.role,
        },
      });

      return created;
    });

    // Calculate queue position for today's appointment
    let queuePosition = 1;
    if (appointment.status === AppointmentStatus.WAITING || appointment.status === AppointmentStatus.SCHEDULED) {
      const activeQueue = await prisma.appointment.findMany({
        where: {
          doctorId: doctor.id,
          appointmentDate,
          status: { in: [AppointmentStatus.WAITING, AppointmentStatus.SCHEDULED] },
        },
        orderBy: [
          { isEmergency: "desc" },
          { createdAt: "asc" },
        ],
        select: { id: true },
      });
      const pos = activeQueue.findIndex((item) => item.id === appointment.id);
      if (pos !== -1) {
        queuePosition = pos + 1;
      }
    }

    // System Audit Log
    await createAuditLog({
      action: "CREATE",
      entity: "APPOINTMENT",
      entityId: appointment.id,
      userId: user.id,
      userRole: user.role,
      userName: `${user.firstName} ${user.lastName}`,
      newValue: JSON.stringify({
        appointmentNumber: appointment.appointmentNumber,
        patientNumber: patient.patientNumber,
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctor: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        department: department.name,
        type: appointment.appointmentType,
        date: data.appointmentDate,
        time: appointment.appointmentTime,
        fee: appointment.consultationFee.toString(),
        isEmergency,
        queuePosition,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        appointment,
        queuePosition,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error creating appointment:", err);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
