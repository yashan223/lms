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

    const coursePrice = Number(course.price) || 0;

    // Check student token wallet
    let wallet = await prisma.tokenWallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await prisma.tokenWallet.create({
        data: {
          userId: user.id,
          balance: 0,
        },
      });
    }

    if (coursePrice > 0 && user.role !== "ADMIN" && wallet.balance < coursePrice) {
      return NextResponse.json(
        {
          error: `Insufficient tokens in your academic wallet. You have ${wallet.balance} Tokens, but this course requires ${coursePrice} Tokens.`,
          required: coursePrice,
          available: wallet.balance,
        },
        { status: 400 }
      );
    }

    const { newEnrollment, updatedBalance } = await prisma.$transaction(async (tx) => {
      let currentBal = wallet.balance;
      if (coursePrice > 0 && (user.role !== "ADMIN" || wallet.balance >= coursePrice)) {
        const w = await tx.tokenWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: coursePrice },
          },
        });
        currentBal = w.balance;

        await tx.tokenTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -coursePrice,
            type: "SPEND",
            description: `Enrolled in Course: ${course.title} (${coursePrice} Tokens)`,
            referenceId: course.id,
          },
        });
      }

      const enrollment = await tx.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
        },
      });

      await tx.event.create({
        data: {
          title: `Welcome to ${course.title}`,
          description: `You have successfully enrolled in ${course.title} using ${coursePrice} Tokens. All class modules and study handbooks are now unlocked.`,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          courseId: course.id,
          userId: user.id,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          title: "🎉 Course Unlocked & Enrolled",
          message: `Your enrollment in "${course.title}" with ${coursePrice} Tokens was successful. All study materials and classes are now accessible.`,
          type: "INFO",
          link: `/courses/${course.slug}`,
        },
      });

      return { newEnrollment: enrollment, updatedBalance: currentBal };
    });

    broadcastLMSEvent("ENROLLMENTS_CHANGED");
    broadcastLMSEvent("COURSES_CHANGED");
    broadcastLMSEvent("EVENTS_CHANGED");
    broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: user.id });

    return NextResponse.json({
      success: true,
      alreadyEnrolled: false,
      enrollment: newEnrollment,
      newBalance: updatedBalance,
      message: `Successfully enrolled in ${course.title}!`,
    });
  } catch (error) {
    console.error("Course Enrollment API error:", error);
    return NextResponse.json({ error: "Failed to process enrollment" }, { status: 500 });
  }
}
