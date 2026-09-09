import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";

const PAGE_SIZE = 10;

const createDoctorSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  specialization: z.string().min(1, "Specialization is required").max(150),
  phone: z.string().min(6, "Phone is required").max(20),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  qualifications: z.string().optional(),
  experience: z.string().optional(),
  roomNumber: z.string().optional(),
  consultationFee: z
    .number({ message: "Fee must be a number" })
    .min(0, "Fee must be non-negative"),
  availability: z.enum(["AVAILABLE", "BUSY", "ON_LEAVE", "OFFLINE"]).default("AVAILABLE"),
  status: z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"]).default("ACTIVE"),
  departmentId: z.string().uuid("Invalid department").optional().nullable().or(z.literal("")),
  userId: z.string().uuid("Invalid user").optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId") || "";
    const status = searchParams.get("status") || "";
    const availability = searchParams.get("availability") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { doctorNumber: { contains: search, mode: "insensitive" } },
        { specialization: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (availability) where.availability = availability;

    const [total, doctors] = await Promise.all([
      prisma.doctor.count({ where }),
      prisma.doctor.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          department: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: doctors,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("GET /api/admin/doctors:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const parsed = createDoctorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check email uniqueness
    const existing = await prisma.doctor.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "A doctor with this email already exists" }, { status: 409 });
    }

    // Generate next doctor number
    const lastDoctor = await prisma.doctor.findFirst({
      orderBy: { doctorNumber: "desc" },
      select: { doctorNumber: true },
    });

    let nextNum = 1;
    if (lastDoctor?.doctorNumber) {
      const match = lastDoctor.doctorNumber.match(/DOC-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const doctorNumber = `DOC-${String(nextNum).padStart(5, "0")}`;

    // Handle User account creation if password provided
    let linkedUserId = data.userId || null;
    if (data.password) {
      const passwordHash = await hashPassword(data.password);
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            role: "DOCTOR",
            status: "ACTIVE",
            firstName: data.firstName,
            lastName: data.lastName,
          },
        });
        linkedUserId = updatedUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            role: "DOCTOR",
            status: "ACTIVE",
            permissions: ["DOCTOR_WORKSPACE"],
          },
        });
        linkedUserId = newUser.id;
      }
    }

    const doctor = await prisma.doctor.create({
      data: {
        doctorNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        specialization: data.specialization,
        phone: data.phone,
        email: data.email,
        qualifications: data.qualifications || null,
        experience: data.experience || null,
        roomNumber: data.roomNumber || null,
        consultationFee: data.consultationFee,
        availability: data.availability as "AVAILABLE" | "BUSY" | "ON_LEAVE" | "OFFLINE",
        status: data.status as "ACTIVE" | "ON_LEAVE" | "INACTIVE",
        departmentId: data.departmentId || null,
        userId: linkedUserId,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "CREATE_DOCTOR",
      entity: "Doctor",
      entityId: doctor.id,
      newValue: JSON.stringify({
        doctorNumber: doctor.doctorNumber,
        name: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specialization,
      }),
    });

    return NextResponse.json({ data: doctor }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("POST /api/admin/doctors:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
