import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/billing-auth";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createExpenseSchema = z.object({
  title: z.string().min(2, "Expense title must be at least 2 characters").max(200),
  description: z.string().max(1000).optional().nullable(),
  amount: z.union([z.number().positive("Amount must be greater than 0"), z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount")]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  category: z.string().min(1, "Category is required"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdminAccess(request);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const dateFrom = searchParams.get("dateFrom")?.trim() || "";
    const dateTo = searchParams.get("dateTo")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10)));

    const where: Record<string, unknown> = {};

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const [totalRecords, totalSumAgg, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.expense.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          addedBy: {
            select: { id: true, firstName: true, lastName: true, role: true, email: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        amount: Number(e.amount),
        date: e.date.toISOString().split("T")[0],
        category: e.category,
        addedBy: e.addedBy ? `${e.addedBy.firstName} ${e.addedBy.lastName}` : "System Admin",
        addedByEmail: e.addedBy?.email,
        createdAt: e.createdAt.toISOString(),
      })),
      totalExpenseAmount: Number(totalSumAgg._sum.amount || 0),
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
      },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error fetching expenses:", err);
    return NextResponse.json({ error: "Failed to load expenses list" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminAccess(request);
    const body = await request.json();
    const validated = createExpenseSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        title: validated.title.trim(),
        description: validated.description?.trim() || null,
        amount: validated.amount,
        date: new Date(`${validated.date}T00:00:00.000Z`),
        category: validated.category.toUpperCase().trim(),
        addedById: admin.id,
      },
      include: {
        addedBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "CREATE_EXPENSE",
      entity: "EXPENSE",
      entityId: expense.id,
      newValue: JSON.stringify({
        title: expense.title,
        amount: expense.amount,
        date: validated.date,
        category: expense.category,
      }),
    });

    return NextResponse.json(
      {
        message: "Expense recorded successfully",
        expense: {
          id: expense.id,
          title: expense.title,
          description: expense.description,
          amount: Number(expense.amount),
          date: expense.date.toISOString().split("T")[0],
          category: expense.category,
          addedBy: `${admin.firstName} ${admin.lastName}`,
          createdAt: expense.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Validation failed" }, { status: 400 });
    }
    console.error("Error creating expense:", err);
    return NextResponse.json({ error: "Failed to record expense" }, { status: 500 });
  }
}
