import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "ALL";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") || "50", 10)));

    const whereClause: any = {};

    if (category !== "ALL") {
      whereClause.category = category;
    }

    if (search.trim()) {
      whereClause.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { targetLabel: { contains: search, mode: "insensitive" } },
        { adminEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalCount, logs, last24hCount, userCount, courseCount, classTrialCount, financePricingCount] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.auditLog.count({ where: { category: "USER" } }),
      prisma.auditLog.count({ where: { category: "COURSE" } }),
      prisma.auditLog.count({ where: { category: { in: ["CLASS", "TRIAL"] } } }),
      prisma.auditLog.count({ where: { category: { in: ["FINANCE", "PRICING"] } } }),
    ]);

    return NextResponse.json({
      logs,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      stats: {
        last24hCount,
        userCount,
        courseCount,
        classTrialCount,
        financePricingCount,
      },
    });
  } catch (error: any) {
    console.error("Audit log GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
