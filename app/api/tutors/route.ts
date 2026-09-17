import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const rawTutors = await prisma.user.findMany({
      where: {
        role: { in: ["TUTOR", "INSTRUCTOR"] },
      },
      include: {
        createdCourses: {
          where: { status: "PUBLISHED" },
        },
        events: {
          where: {
            status: { in: ["SCHEDULED", "LIVE", "COMPLETED"] },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const tutors = (rawTutors as any[]).map((t: any) => ({
      ...t,
      classesCount: (t.createdCourses?.length || 0) + (t.events?.length || 0),
      subjects: Array.from(
        new Set(
          (t.createdCourses || [])
            .map((c: any) => c.category)
            .concat(t.headline ? [t.headline] : [])
            .filter(Boolean)
        )
      ),
    }));

    return NextResponse.json({ tutors });
  } catch (error) {
    console.error("Tutors API error:", error);
    return NextResponse.json({ error: "Failed to fetch tutors" }, { status: 500 });
  }
}
