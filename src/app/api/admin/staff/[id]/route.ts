import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { UserRole, UserStatus } from "@prisma/client";

const updateStaffSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum([
    "HEAD_NURSE", "STAFF_NURSE", "RECEPTIONIST", "LAB_TECHNICIAN",
    "RADIOLOGY_TECHNICIAN", "PHARMACIST", "SUPPORT_STAFF", "ACCOUNTANT", "ADMINISTRATOR",
  ]).optional(),
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  qualification: z.string().optional().nullable(),
  shift: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SHIFT_OFF", "INACTIVE"]).optional(),
  nurseDepartment: z.enum(["OPD", "EMERGENCY"]).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),

  // Password update / Portal access setup
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")).nullable(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        department: true,
        user: { select: { id: true, email: true, username: true, role: true } },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ data: staff });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (parsed.data.email && parsed.data.email !== existing.email) {
      const conflict = await prisma.staff.findUnique({ where: { email: parsed.data.email } });
      if (conflict) {
        return NextResponse.json({ error: "A staff member with this email already exists" }, { status: 409 });
      }
    }

    const effectiveRole = parsed.data.role ?? existing.role;
    const effectiveEmail = parsed.data.email ?? existing.email;
    const effectiveFirstName = parsed.data.firstName ?? existing.firstName;
    const effectiveLastName = parsed.data.lastName ?? existing.lastName;
    const effectiveStatus = parsed.data.status ?? existing.status;

    const isNurse = effectiveRole === "HEAD_NURSE" || effectiveRole === "STAFF_NURSE";

    const passwordToSet = parsed.data.password?.trim() || null;
    const passwordHash = passwordToSet ? await hashPassword(passwordToSet) : null;

    const updated = await prisma.$transaction(async (tx) => {
      let linkedUserId = existing.userId;

      if (passwordHash) {
        if (existing.userId) {
          // Update existing user credentials and sync role/name
          await tx.user.update({
            where: { id: existing.userId },
            data: {
              passwordHash,
              email: effectiveEmail,
              firstName: effectiveFirstName,
              lastName: effectiveLastName,
              role: mapStaffRoleToUserRole(effectiveRole),
              status: effectiveStatus === "INACTIVE" ? UserStatus.INACTIVE : UserStatus.ACTIVE,
            },
          });
        } else {
          // Check if user with this email exists
          const userWithEmail = await tx.user.findUnique({ where: { email: effectiveEmail } });
          if (userWithEmail) {
            linkedUserId = userWithEmail.id;
            await tx.user.update({
              where: { id: userWithEmail.id },
              data: {
                passwordHash,
                firstName: effectiveFirstName,
                lastName: effectiveLastName,
                role: mapStaffRoleToUserRole(effectiveRole),
                status: effectiveStatus === "INACTIVE" ? UserStatus.INACTIVE : UserStatus.ACTIVE,
              },
            });
          } else {
            const newUser = await tx.user.create({
              data: {
                email: effectiveEmail,
                passwordHash,
                firstName: effectiveFirstName,
                lastName: effectiveLastName,
                role: mapStaffRoleToUserRole(effectiveRole),
                status: effectiveStatus === "INACTIVE" ? UserStatus.INACTIVE : UserStatus.ACTIVE,
              },
            });
            linkedUserId = newUser.id;
          }
        }
      } else if (existing.userId) {
        // Keep user in sync if email, name, role or status changed
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            email: effectiveEmail,
            firstName: effectiveFirstName,
            lastName: effectiveLastName,
            role: mapStaffRoleToUserRole(effectiveRole),
            status: effectiveStatus === "INACTIVE" ? UserStatus.INACTIVE : UserStatus.ACTIVE,
          },
        });
      }

      // Exclude password from staff model update
      const staffUpdateData = { ...parsed.data };
      delete staffUpdateData.password;

      const staffUpdated = await tx.staff.update({
        where: { id },
        data: {
          ...staffUpdateData,
          userId: linkedUserId,
          nurseDepartment: isNurse ? (parsed.data.nurseDepartment ?? existing.nurseDepartment) : null,
        },
        include: {
          department: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, username: true, role: true } },
        },
      });

      return staffUpdated;
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "UPDATE_STAFF",
      entity: "Staff",
      entityId: id,
      oldValue: JSON.stringify({ name: `${existing.firstName} ${existing.lastName}`, status: existing.status }),
      newValue: JSON.stringify({
        name: `${updated.firstName} ${updated.lastName}`,
        status: updated.status,
        passwordUpdated: !!passwordHash,
      }),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("PUT /api/admin/staff/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    const existing = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            _count: {
              select: {
                createdAppointments: true,
                createdAdmissions: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.staff.delete({ where: { id } });

      if (existing.userId && existing.user) {
        if (
          existing.user._count.createdAppointments > 0 ||
          existing.user._count.createdAdmissions > 0
        ) {
          await tx.user.update({
            where: { id: existing.userId },
            data: { status: UserStatus.INACTIVE },
          });
        } else {
          await tx.user.delete({ where: { id: existing.userId } });
        }
      }

      await createAuditLog({
        userId: admin.id,
        userName: `${admin.firstName} ${admin.lastName}`,
        userRole: admin.role,
        action: "DELETE_STAFF",
        entity: "Staff",
        entityId: id,
        oldValue: JSON.stringify({
          name: `${existing.firstName} ${existing.lastName}`,
          email: existing.email,
          role: existing.role,
          staffNumber: existing.staffNumber,
        }),
      });
    });

    return NextResponse.json({
      success: true,
      message: `Staff member ${existing.firstName} ${existing.lastName} deleted successfully.`,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("DELETE /api/admin/staff/[id]:", err);
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}
