import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rawCourses = await prisma.course.findMany({
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
    });

    const courses = rawCourses.map((c) => ({
      ...c,
      instructor: c.tutor,
    }));

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Courses API error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
