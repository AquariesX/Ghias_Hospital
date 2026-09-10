import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { UserRole, UserStatus } from "@prisma/client";

const PAGE_SIZE = 10;

const createStaffSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  role: z.enum([
    "HEAD_NURSE",
    "STAFF_NURSE",
    "RECEPTIONIST",
    "LAB_TECHNICIAN",
    "RADIOLOGY_TECHNICIAN",
    "PHARMACIST",
    "SUPPORT_STAFF",
    "ACCOUNTANT",
    "ADMINISTRATOR",
  ]),
  phone: z.string().min(6, "Phone is required").max(20),
  email: z.string().email("Invalid email address"),
  qualification: z.string().optional().nullable(),
  shift: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SHIFT_OFF", "INACTIVE"]).default("ACTIVE"),
  nurseDepartment: z.enum(["IPD", "EMERGENCY", "OPD"]).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),

  // Dashboard & Portal Access Fields
  createPortalAccount: z.boolean().default(true),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")).nullable(),
  username: z.string().min(3, "Username must be at least 3 characters").max(50).optional().or(z.literal("")).nullable(),
});

function mapStaffRoleToUserRole(staffRole: string): UserRole {
  switch (staffRole) {
    case "RECEPTIONIST":
      return UserRole.RECEPTIONIST;
    case "HEAD_NURSE":
    case "STAFF_NURSE":
      return UserRole.NURSE;
    case "ADMINISTRATOR":
      return UserRole.ADMIN;
    default:
      return UserRole.STAFF;
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const departmentId = searchParams.get("departmentId") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { staffNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const [total, staff] = await Promise.all([
      prisma.staff.count({ where }),
      prisma.staff.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          department: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, email: true, username: true, role: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: staff,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("GET /api/admin/staff:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Email uniqueness in staff table
    const existing = await prisma.staff.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "A staff member with this email already exists" }, { status: 409 });
    }

    const shouldCreateUser = data.createPortalAccount && !!data.password?.trim();

    // If portal account is to be created, check user table email/username collisions
    if (shouldCreateUser) {
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        return NextResponse.json(
          {
            error: "A system user account with this email address already exists",
            details: { email: ["Email is already registered for a portal user"] },
          },
          { status: 409 }
        );
      }

      if (data.username?.trim()) {
        const existingUsername = await prisma.user.findUnique({
          where: { username: data.username.trim() },
        });
        if (existingUsername) {
          return NextResponse.json(
            {
              error: "A system user account with this username already exists",
              details: { username: ["Username is already taken"] },
            },
            { status: 409 }
          );
        }
      }
    }

    // Generate next staff number
    const lastStaff = await prisma.staff.findFirst({
      orderBy: { staffNumber: "desc" },
      select: { staffNumber: true },
    });

    let nextNum = 1;
    if (lastStaff?.staffNumber) {
      const match = lastStaff.staffNumber.match(/STF-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const staffNumber = `STF-${String(nextNum).padStart(5, "0")}`;

    // Clear nurseDepartment if not a nurse role
    const isNurse = data.role === "HEAD_NURSE" || data.role === "STAFF_NURSE";

    // Hash password if portal account is enabled
    const passwordHash = shouldCreateUser && data.password ? await hashPassword(data.password) : null;

    const { staff, user } = await prisma.$transaction(async (tx) => {
      let createdUser = null;

      if (shouldCreateUser && passwordHash) {
        createdUser = await tx.user.create({
          data: {
            email: data.email,
            username: data.username?.trim() || null,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            role: mapStaffRoleToUserRole(data.role),
            status: data.status === "INACTIVE" ? UserStatus.INACTIVE : UserStatus.ACTIVE,
          },
        });
      }

      const newStaff = await tx.staff.create({
        data: {
          staffNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          phone: data.phone,
          email: data.email,
          qualification: data.qualification || null,
          shift: data.shift || null,
          status: data.status,
          nurseDepartment: isNurse ? (data.nurseDepartment || null) : null,
          departmentId: data.departmentId || null,
          userId: createdUser ? createdUser.id : (data.userId || null),
        },
        include: {
          department: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, username: true, role: true } },
        },
      });

      return { staff: newStaff, user: createdUser };
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "CREATE_STAFF",
      entity: "Staff",
      entityId: staff.id,
      newValue: JSON.stringify({
        staffNumber: staff.staffNumber,
        name: `${staff.firstName} ${staff.lastName}`,
        role: staff.role,
        hasPortalAccount: !!user,
        portalRole: user?.role,
      }),
    });

    return NextResponse.json({ data: staff }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("POST /api/admin/staff:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
