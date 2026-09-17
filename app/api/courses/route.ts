import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [rawCourses, rawTutors] = await Promise.all([
      prisma.course.findMany({
        where: { status: "PUBLISHED" },
        include: {
          tutor: true,
          modules: {
            include: {
              lessons: true,
            },
            orderBy: { position: "asc" },
          },
          enrollments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
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
      }),
    ]);

    const courses = rawCourses.map((c) => ({
      ...c,
      instructor: c.tutor,
    }));

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

    return NextResponse.json({ courses, tutors });
  } catch (error) {
    console.error("Courses API error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
