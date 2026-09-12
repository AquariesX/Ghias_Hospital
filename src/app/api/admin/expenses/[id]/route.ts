import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/billing-auth";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateExpenseSchema = z.object({
  title: z.string().min(2, "Expense title must be at least 2 characters").max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  amount: z.union([z.number().positive("Amount must be greater than 0"), z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount")]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  category: z.string().min(1, "Category is required").optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAccess(request);
    const { id } = await context.params;
    const body = await request.json();
    const validated = updateExpenseSchema.parse(body);

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense record not found" }, { status: 404 });
    }

    const dataToUpdate: Record<string, any> = {};
    if (validated.title !== undefined) dataToUpdate.title = validated.title.trim();
    if (validated.description !== undefined) dataToUpdate.description = validated.description?.trim() || null;
    if (validated.amount !== undefined) dataToUpdate.amount = validated.amount;
    if (validated.date !== undefined) dataToUpdate.date = new Date(`${validated.date}T00:00:00.000Z`);
    if (validated.category !== undefined) dataToUpdate.category = validated.category.toUpperCase().trim();

    const updated = await prisma.expense.update({
      where: { id },
      data: dataToUpdate,
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "UPDATE_EXPENSE",
      entity: "EXPENSE",
      entityId: updated.id,
      oldValue: JSON.stringify({
        title: existing.title,
        amount: existing.amount,
        category: existing.category,
      }),
      newValue: JSON.stringify({
        title: updated.title,
        amount: updated.amount,
        category: updated.category,
      }),
    });

    return NextResponse.json({
      message: "Expense updated successfully",
      expense: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        amount: Number(updated.amount),
        date: updated.date.toISOString().split("T")[0],
        category: updated.category,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Validation failed" }, { status: 400 });
    }
    console.error("Error updating expense:", err);
    return NextResponse.json({ error: "Failed to update expense record" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAccess(request);
    const { id } = await context.params;

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense record not found" }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id },
    });

    await createAuditLog({
      userId: admin.id,
      userName: `${admin.firstName} ${admin.lastName}`,
      userRole: admin.role,
      action: "DELETE_EXPENSE",
      entity: "EXPENSE",
      entityId: id,
      oldValue: JSON.stringify({
        title: existing.title,
        amount: existing.amount,
        category: existing.category,
        date: existing.date,
      }),
    });

    return NextResponse.json({ message: "Expense record deleted successfully" });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    console.error("Error deleting expense:", err);
    return NextResponse.json({ error: "Failed to delete expense record" }, { status: 500 });
  }
}
