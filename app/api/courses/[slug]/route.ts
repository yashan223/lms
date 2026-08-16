import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        instructor: true,
        modules: {
          include: {
            lessons: {
              orderBy: { position: "asc" },
            },
          },
          orderBy: { position: "asc" },
        },
        enrollments: true,
        reviews: {
          include: { user: true },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Course Detail API error:", error);
    return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 });
  }
}
