import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const search = searchParams.get("search") || "";
    const action = searchParams.get("action") || "";
    const entity = searchParams.get("entity") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { userName: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
      ];
    }
    if (action) where.action = { contains: action, mode: "insensitive" };
    if (entity) where.entity = entity;
    if (dateFrom || dateTo) {
      where.timestamp = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
      };
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          userId: true,
          userName: true,
          userRole: true,
          action: true,
          entity: true,
          entityId: true,
          oldValue: true,
          newValue: true,
          ipAddress: true,
          timestamp: true,
        },
      }),
    ]);

    // Distinct entity values for filter dropdown
    const entityTypes = await prisma.auditLog.findMany({
      distinct: ["entity"],
      select: { entity: true },
      orderBy: { entity: "asc" },
    });

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
      meta: {
        entityTypes: entityTypes.map((e) => e.entity).filter(Boolean),
      },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
