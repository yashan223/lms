import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { cookies } from "next/headers";

async function findCourseBySlugOrId(rawSlug: string) {
  if (!rawSlug) return null;
  const decoded = decodeURIComponent(rawSlug).trim();
  const slugWithHyphens = decoded.replace(/[_\s]+/g, "-").toLowerCase();
  const slugWithUnderscores = decoded.replace(/[-\s]+/g, "_").toLowerCase();

  return await prisma.course.findFirst({
    where: {
      OR: [
        { slug: rawSlug },
        { slug: decoded },
        { slug: slugWithHyphens },
        { slug: slugWithUnderscores },
        { id: rawSlug },
        { id: decoded },
        { slug: { equals: rawSlug, mode: "insensitive" } },
        { slug: { equals: decoded, mode: "insensitive" } },
        { slug: { equals: slugWithHyphens, mode: "insensitive" } },
        { slug: { equals: slugWithUnderscores, mode: "insensitive" } },
      ],
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cookieStore = await cookies();
    const userRoleCookie = cookieStore.get("edupulse_user_role")?.value;

    // Find course
    const course = await findCourseBySlugOrId(slug);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Find active user (or default student)
    let user = await prisma.user.findFirst({
      where: { role: "STUDENT" },
    });

    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      return NextResponse.json({ error: "No student account available for enrollment" }, { status: 400 });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json({
        success: true,
        alreadyEnrolled: true,
        message: "Already enrolled in this course",
        courseId: course.id,
      });
    }

    // Create enrollment
    const newEnrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
      },
    });

    // Create timeline event for the course enrollment
    await prisma.event.create({
      data: {
        title: `Welcome to ${course.title}`,
        description: `You have successfully enrolled in ${course.title}. Explore the syllabus modules and study notes.`,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        courseId: course.id,
        userId: user.id,
      },
    });

    broadcastLMSEvent("ENROLLMENTS_CHANGED");
    broadcastLMSEvent("COURSES_CHANGED");
    broadcastLMSEvent("EVENTS_CHANGED");

    return NextResponse.json({
      success: true,
      alreadyEnrolled: false,
      enrollment: newEnrollment,
      message: "Successfully enrolled in course",
    });
  } catch (error) {
    console.error("Course Enrollment API error:", error);
    return NextResponse.json({ error: "Failed to process enrollment" }, { status: 500 });
  }
}
