import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";

const updateDoctorSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  specialization: z.string().min(1).max(150).optional(),
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  qualifications: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  roomNumber: z.string().optional().nullable(),
  consultationFee: z.number().min(0).optional(),
  availability: z.enum(["AVAILABLE", "BUSY", "ON_LEAVE", "OFFLINE"]).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"]).optional(),
  departmentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        department: true,
        user: { select: { id: true, email: true, username: true } },
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({ data: doctor });
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
    const parsed = updateDoctorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    // Email uniqueness check if email is being changed
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const conflict = await prisma.doctor.findUnique({
        where: { email: parsed.data.email },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "A doctor with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Handle password update/setting
    let linkedUserId = existing.userId;
    if (parsed.data.password && parsed.data.password.trim().length >= 6) {
      const passwordHash = await hashPassword(parsed.data.password.trim());
      const targetEmail = parsed.data.email || existing.email;

      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: {
            passwordHash,
            role: "DOCTOR",
            status: "ACTIVE",
            email: targetEmail,
            firstName: parsed.data.firstName || existing.firstName,
            lastName: parsed.data.lastName || existing.lastName,
          },
        });
      } else {
        const existingUser = await prisma.user.findUnique({
          where: { email: targetEmail },
        });

        if (existingUser) {
          const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash,
              role: "DOCTOR",
              status: "ACTIVE",
            },
          });
          linkedUserId = updatedUser.id;
        } else {
          const newUser = await prisma.user.create({
            data: {
              email: targetEmail,
              passwordHash,
              firstName: parsed.data.firstName || existing.firstName,
              lastName: parsed.data.lastName || existing.lastName,
              role: "DOCTOR",
              status: "ACTIVE",
              permissions: ["DOCTOR_WORKSPACE"],
            },
          });
          linkedUserId = newUser.id;
        }
      }
    }

    const { password: _p, ...doctorUpdateData } = parsed.data;

    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        ...doctorUpdateData,
        userId: linkedUserId,
        consultationFee: parsed.data.consultationFee !== undefined
          ? parsed.data.consultationFee
          : undefined,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "UPDATE_DOCTOR",
      entity: "Doctor",
      entityId: id,
      oldValue: JSON.stringify({
        name: `${existing.firstName} ${existing.lastName}`,
        status: existing.status,
        availability: existing.availability,
      }),
      newValue: JSON.stringify({
        name: `${updated.firstName} ${updated.lastName}`,
        status: updated.status,
        availability: updated.availability,
      }),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("PUT /api/admin/doctors/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
