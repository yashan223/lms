import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { getSafeMeetingLink } from "@/lib/utils";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { EventType, Role, TrialStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tutorId = searchParams.get("tutorId");
    const studentId = searchParams.get("studentId");
    const emailCookie = request.cookies.get("edupulse_user_email")?.value;
    const roleCookie = request.cookies.get("edupulse_user_role")?.value;

    let whereClause: any = {};

    if (tutorId) {
      whereClause.OR = [
        { tutorId: tutorId },
        { course: { tutorId: tutorId } },
      ];
    } else if (studentId) {
      whereClause.OR = [
        { studentId: studentId },
        { studentEmail: emailCookie?.toLowerCase() },
      ];
    } else if (emailCookie) {
      if (roleCookie === "TUTOR" || roleCookie === "INSTRUCTOR") {
        const user = await prisma.user.findUnique({
          where: { email: emailCookie.toLowerCase() },
        });
        if (user) {
          whereClause.OR = [
            { tutorId: user.id },
            { course: { tutorId: user.id } },
          ];
        }
      } else if (roleCookie === "STUDENT") {
        whereClause.OR = [
          { studentEmail: emailCookie.toLowerCase() },
          { student: { email: emailCookie.toLowerCase() } },
        ];
      }
    }

    const rawTrials = await prisma.trialRequest.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            subjectCode: true,
            thumbnail: true,
            tutor: {
              select: {
                id: true,
                name: true,
                avatar: true,
                headline: true,
              },
            },
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            headline: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        preferredDate: "asc",
      },
    });

    const trials = rawTrials.map((t) => ({
      ...t,
      course: t.course ? { ...t.course, instructor: (t.course as any).tutor } : null,
    }));

    return NextResponse.json({ trials });
  } catch (error) {
    console.error("Trials API GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trial requests." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "request_trial") {
      const ip = getClientIp(request);
      const rateLimit = checkRateLimit(`trial:${ip}`, 5, 60);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: `Too many booking requests. Please try again in ${rateLimit.resetSeconds} seconds.`,
          },
          { status: 429 }
        );
      }

      const {
        studentName,
        studentEmail,
        studentPhone,
        courseId,
        tutorId,
        studentId,
        preferredDate,
        topic,
        notes,
      } = body;

      const auth = await getAuthenticatedUser(request);

      const resolvedStudentName = (auth.user?.name || studentName || "").trim();
      const resolvedStudentEmail = (auth.user?.email || studentEmail || "").trim().toLowerCase();
      const resolvedStudentPhone = (auth.user?.phone || studentPhone || "").trim() || null;
      const resolvedStudentId = auth.user?.id || studentId || null;

      if (!resolvedStudentName || !resolvedStudentEmail) {
        return NextResponse.json(
          { error: "Please log in to your student account to request a free trial session." },
          { status: 401 }
        );
      }

      if (!preferredDate) {
        return NextResponse.json(
          { error: "Preferred date and time is required." },
          { status: 400 }
        );
      }

      let parsedDate = new Date(preferredDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format provided for preferred session time." },
          { status: 400 }
        );
      }

      let resolvedTutorId = tutorId || null;
      let courseTitle = "London A/L Tutorial Masterclass";
      let courseSubjectCode = "";
      if (courseId) {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { id: true, title: true, subjectCode: true, tutorId: true },
        });
        if (course) {
          if (!resolvedTutorId) resolvedTutorId = course.tutorId;
          courseTitle = course.title;
          courseSubjectCode = course.subjectCode || "";
        }
      }

      const meetingLink = getSafeMeetingLink(null);

      const trial = await prisma.trialRequest.create({
        data: {
          studentName: resolvedStudentName,
          studentEmail: resolvedStudentEmail,
          studentPhone: resolvedStudentPhone,
          courseId: courseId || null,
          tutorId: resolvedTutorId,
          studentId: resolvedStudentId,
          preferredDate: parsedDate,
          topic: topic?.trim() || "30-Min Free Trial & Syllabus Overview",
          notes: notes?.trim() || null,
          status: TrialStatus.PENDING,
          meetingLink,
        },
        include: {
          course: {
            include: {
              tutor: true,
            },
          },
          tutor: true,
          student: true,
        },
      });

      // Send in-app notification to tutor/faculty
      if (resolvedTutorId) {
        await prisma.notification.create({
          data: {
            userId: resolvedTutorId,
            title: "📅 New Free Trial Requested",
            message: `${resolvedStudentName} requested a 30-min free trial for "${courseTitle}". Review and confirm the session time.`,
            type: "INFO",
            link: "/tutor?tab=trials",
          },
        });
      }

      // Send in-app notification to student
      if (resolvedStudentId) {
        await prisma.notification.create({
          data: {
            userId: resolvedStudentId,
            title: "⏳ Trial Request Submitted",
            message: `Your 30-min trial request for "${courseTitle}" has been received. Your tutor will review and confirm your session time shortly.`,
            type: "INFO",
            link: "/dashboard",
          },
        });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      if (resolvedTutorId) broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: resolvedTutorId });
      if (resolvedStudentId) broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: resolvedStudentId });

      return NextResponse.json({
        success: true,
        message: "Your free trial request has been submitted! Your tutor will confirm the session date and time shortly.",
        trial,
      });
    }

    if (action === "confirm_trial" || action === "update_trial_status") {
      const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
      if (!auth.user) {
        return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
      }

      const { trialId, status, confirmedDate, scheduledDate, meetingLink, notes } = body;

      if (!trialId) {
        return NextResponse.json({ error: "Trial ID is required." }, { status: 400 });
      }

      const existingTrial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true, tutor: true, student: true },
      });

      if (!existingTrial) {
        return NextResponse.json({ error: "Trial session not found." }, { status: 404 });
      }

      const rawDate = confirmedDate || scheduledDate;
      const targetDate = rawDate ? new Date(rawDate) : existingTrial.preferredDate;
      const targetStatus = (status as TrialStatus) || TrialStatus.CONFIRMED;
      const link = getSafeMeetingLink(meetingLink || existingTrial.meetingLink);

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: targetStatus,
          preferredDate: targetDate,
          meetingLink: link,
          notes: notes !== undefined ? notes?.trim() || null : existingTrial.notes,
        },
        include: {
          course: {
            include: { tutor: true },
          },
          tutor: true,
          student: true,
        },
      });

      // If confirming, create or update the calendar event
      if (targetStatus === TrialStatus.CONFIRMED) {
        const courseTitle = updatedTrial.course?.title || "London A/L Tutorial Masterclass";
        const courseCode = updatedTrial.course?.subjectCode || "";
        const eventTitle = `30-Min Free Trial: ${courseTitle} (${updatedTrial.studentName})`;
        const eventDescription = [
          `🎯 30-Minute 1-on-1 Online Free Trial Session with Senior Faculty.`,
          `Subject / Course: ${courseTitle} ${courseCode ? `(${courseCode})` : ""}`,
          `Topic / Focus: ${updatedTrial.topic || "30-Min Free Trial & Syllabus Overview"}`,
          `Student: ${updatedTrial.studentName} (${updatedTrial.studentEmail})`,
          `Classroom Link: ${link}`,
          updatedTrial.notes ? `Faculty Notes: ${updatedTrial.notes}` : "",
        ].filter(Boolean).join("\n\n");

        // Remove old trial event if any to prevent duplicates
        if (updatedTrial.courseId) {
          await prisma.event.deleteMany({
            where: {
              courseId: updatedTrial.courseId,
              title: { contains: updatedTrial.studentName },
            },
          });
        }

        await prisma.event.create({
          data: {
            title: eventTitle,
            description: eventDescription,
            dueDate: targetDate,
            type: EventType.LIVE_SEMINAR,
            courseId: updatedTrial.courseId || null,
            userId: updatedTrial.studentId || updatedTrial.tutorId || null,
          },
        });

        // Notify student about confirmation
        if (updatedTrial.studentId) {
          const dateStr = targetDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          await prisma.notification.create({
            data: {
              userId: updatedTrial.studentId,
              title: "🎉 Free Trial Confirmed!",
              message: `Your 30-min trial session for "${courseTitle}" has been confirmed for ${dateStr}. Google Meet link is ready on your calendar!`,
              type: "SUCCESS",
              link: "/dashboard",
            },
          });
          broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updatedTrial.studentId });
        }
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: targetStatus === TrialStatus.CONFIRMED
          ? "Trial session date confirmed and scheduled on the calendar!"
          : "Trial session status updated successfully.",
        trial: updatedTrial,
      });
    }

    if (action === "decline_trial" || action === "cancel_trial") {
      const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
      if (!auth.user) {
        return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
      }

      const { trialId, reason } = body;
      if (!trialId) {
        return NextResponse.json({ error: "Trial ID is required." }, { status: 400 });
      }

      const existingTrial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true },
      });

      if (!existingTrial) {
        return NextResponse.json({ error: "Trial session not found." }, { status: 404 });
      }

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: TrialStatus.CANCELLED,
          notes: reason?.trim() ? `[Declined/Cancelled: ${reason.trim()}]` : existingTrial.notes,
        },
      });

      if (existingTrial.courseId) {
        await prisma.event.deleteMany({
          where: {
            courseId: existingTrial.courseId,
            title: { contains: existingTrial.studentName },
          },
        });
      }

      if (existingTrial.studentId) {
        await prisma.notification.create({
          data: {
            userId: existingTrial.studentId,
            title: "Trial Request Update",
            message: `Your trial request for "${existingTrial.course?.title || "London A/L"}" was declined or cancelled. ${reason ? `Reason: ${reason}` : "Please request a new session time."}`,
            type: "INFO",
            link: "/courses",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: existingTrial.studentId });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Trial session has been cancelled.",
        trial: updatedTrial,
      });
    }

    if (action === "reschedule_trial") {
      const { trialId, scheduledDate, meetingLink, notes } = body;
      if (!trialId || !scheduledDate) {
        return NextResponse.json(
          { error: "Trial ID and preferred date & time are required." },
          { status: 400 }
        );
      }

      const existing = await prisma.trialRequest.findUnique({ where: { id: trialId } });
      if (!existing) {
        return NextResponse.json({ error: "Trial not found." }, { status: 404 });
      }

      const link = getSafeMeetingLink(meetingLink || existing.meetingLink);

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          preferredDate: new Date(scheduledDate),
          meetingLink: link,
          notes: notes?.trim() || existing.notes,
          status: TrialStatus.CONFIRMED,
        },
        include: {
          course: {
            include: { tutor: true },
          },
          tutor: true,
          student: true,
        },
      });

      if (updatedTrial.courseId) {
        await prisma.event.updateMany({
          where: {
            courseId: updatedTrial.courseId,
            title: { contains: updatedTrial.studentName },
          },
          data: {
            dueDate: new Date(scheduledDate),
            meetingLink: link,
            status: "SCHEDULED",
            endedAt: null,
          },
        });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Trial session rescheduled successfully.",
        trial: updatedTrial,
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error: any) {
    console.error("Trials API POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process trial request." },
      { status: 500 }
    );
  }
}
