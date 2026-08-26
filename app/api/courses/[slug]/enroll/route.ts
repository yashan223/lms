import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { getAuthenticatedUser } from "@/lib/auth";

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
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in or register to purchase this course." },
        { status: 401 }
      );
    }

    const course = await findCourseBySlugOrId(slug);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const user = auth.user;

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
        message: "You are already enrolled in this course.",
        courseId: course.id,
      });
    }

    const newEnrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
      },
    });

    await prisma.event.create({
      data: {
        title: `Welcome to ${course.title}`,
        description: `You have successfully purchased and enrolled in ${course.title}. All lecture modules and study handbooks are now unlocked.`,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        courseId: course.id,
        userId: user.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "🎉 Course Unlocked & Enrolled",
        message: `Your purchase of "${course.title}" was successful. All study materials and classes are now accessible.`,
        type: "INFO",
        link: `/courses/${course.slug}`,
      },
    });

    broadcastLMSEvent("ENROLLMENTS_CHANGED");
    broadcastLMSEvent("COURSES_CHANGED");
    broadcastLMSEvent("EVENTS_CHANGED");
    broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: user.id });

    return NextResponse.json({
      success: true,
      alreadyEnrolled: false,
      enrollment: newEnrollment,
      message: `Successfully purchased and enrolled in ${course.title}!`,
    });
  } catch (error) {
    console.error("Course Enrollment API error:", error);
    return NextResponse.json({ error: "Failed to process enrollment" }, { status: 500 });
  }
}
