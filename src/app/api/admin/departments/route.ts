import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { createAuditLog } from "@/lib/audit";

const PAGE_SIZE = 20;

const createDepartmentSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(30)
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, numbers, or underscores"),
  name: z.string().min(2, "Name is required").max(150),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const all = searchParams.get("all") === "true";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;

    if (all) {
      // Return all for dropdowns (no pagination)
      const departments = await prisma.department.findMany({
        where,
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true, status: true },
      });
      return NextResponse.json({ data: departments });
    }

    const [total, departments] = await Promise.all([
      prisma.department.count({ where }),
      prisma.department.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          _count: {
            select: { doctors: true, staffMembers: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: departments,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const parsed = createDepartmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Uniqueness checks
    const [codeConflict, nameConflict] = await Promise.all([
      prisma.department.findUnique({ where: { code: data.code } }),
      prisma.department.findUnique({ where: { name: data.name } }),
    ]);

    if (codeConflict) {
      return NextResponse.json({ error: "A department with this code already exists" }, { status: 409 });
    }
    if (nameConflict) {
      return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 });
    }

    const department = await prisma.department.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description || null,
        status: data.status,
      },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "CREATE_DEPARTMENT",
      entity: "Department",
      entityId: department.id,
      newValue: JSON.stringify({ code: department.code, name: department.name }),
    });

    return NextResponse.json({ data: department }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("POST /api/admin/departments:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
