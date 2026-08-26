import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { getSafeMeetingLink } from "@/lib/utils";
import { getAuthenticatedUser } from "@/lib/auth";
import { EventType, Role, TrialStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.INSTRUCTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const tutor = auth.user;

    let courses: any[] = await prisma.course.findMany({
      where: { instructorId: tutor.id },
      include: {
        modules: {
          include: { lessons: true },
        },
        materials: true,
        enrollments: {
          include: {
            user: true,
          },
          orderBy: { enrolledAt: "desc" },
        },
      },
    });

    if (courses.length === 0) {
      courses = await prisma.course.findMany({
        include: {
          modules: {
            include: { lessons: true },
          },
          materials: true,
          enrollments: {
            include: {
              user: true,
            },
            orderBy: { enrolledAt: "desc" },
          },
        },
      });
    }

    const courseIds = courses.map((c) => c.id);

    const studentMap = new Map<string, any>();

    courses.forEach((course) => {
      (course.enrollments || []).forEach((enrollment: any) => {
        const student = enrollment.user;
        if (!student) return;
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            id: student.id,
            name: student.name,
            email: student.email,
            phone: student.phone || "Not provided",
            avatar: student.avatar,
            headline: student.headline || "London A/L Student",
            enrolledCourses: [
              {
                courseId: course.id,
                courseTitle: course.title,
                subjectCode: course.subjectCode,
                enrolledAt: enrollment.enrolledAt,
              },
            ],
            latestEnrollment: enrollment.enrolledAt,
          });
        } else {
          const existing = studentMap.get(student.id);
          existing.enrolledCourses.push({
            courseId: course.id,
            courseTitle: course.title,
            subjectCode: course.subjectCode,
            enrolledAt: enrollment.enrolledAt,
          });
        }
      });
    });

    const students = Array.from(studentMap.values());

    const events = await prisma.event.findMany({
      where: {
        OR: [
          { userId: tutor.id },
          { courseId: { in: courseIds } },
          { course: { instructorId: tutor.id } },
        ],
      },
      include: {
        course: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    const trials = await prisma.trialRequest.findMany({
      where: {
        OR: [
          { tutorId: tutor.id },
          { courseId: { in: courseIds } },
        ],
      },
      include: {
        course: true,
        student: true,
      },
      orderBy: {
        preferredDate: "asc",
      },
    });

    return NextResponse.json({
      tutor: {
        id: tutor.id,
        name: tutor.name,
        email: tutor.email,
        headline: tutor.headline || "Senior Faculty Lecturer",
        bio: tutor.bio || "Subject Lead with specialized expertise in London A/L & O/L specifications.",
        phone: tutor.phone || "",
        avatar: tutor.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        role: tutor.role,
        createdAt: tutor.createdAt,
      },
      courses,
      students,
      events,
      trials,
    });
  } catch (error) {
    console.error("Tutor API GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tutor dashboard data." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.INSTRUCTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "update_profile") {
      const { tutorId, name, headline, bio, phone, avatar } = body;

      if (!tutorId) {
        return NextResponse.json(
          { error: "Tutor ID is required" },
          { status: 400 }
        );
      }

      const updatedTutor = await prisma.user.update({
        where: { id: tutorId },
        data: {
          name: name ? name.trim() : undefined,
          headline: headline ? headline.trim() : undefined,
          bio: bio ? bio.trim() : undefined,
          phone: phone ? phone.trim() : null,
          avatar: avatar || undefined,
        },
      });

      broadcastLMSEvent("USERS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Tutor profile and qualifications updated successfully.",
        tutor: updatedTutor,
      });
    }

    if (action === "schedule_class") {
      const {
        title,
        description,
        meetingLink,
        scheduledDate,
        courseId,
        tutorId,
        studentId,
        type,
      } = body;

      if (!title || !scheduledDate) {
        return NextResponse.json(
          { error: "Class title and scheduled date are required." },
          { status: 400 }
        );
      }

      let meetLink = getSafeMeetingLink(meetingLink);

      const fullDescription = [
        description?.trim() || "Live curriculum masterclass with Senior Faculty.",
        `\n\nGoogle Meet Classroom: ${meetLink}`,
      ]
        .join("")
        .trim();

      const newClassEvent = await prisma.event.create({
        data: {
          title: title.trim(),
          description: fullDescription,
          meetingLink: meetLink,
          dueDate: new Date(scheduledDate),
          status: "SCHEDULED",
          type: (type as EventType) || EventType.LIVE_SEMINAR,
          courseId: courseId || null,
          userId: studentId || null,
        },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Live class session scheduled successfully.",
        event: newClassEvent,
        meetingLink: meetLink,
      });
    }

    if (action === "start_class") {
      const { eventId, meetingLink } = body;
      if (!eventId) {
        return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
      }

      const existing = await prisma.event.findUnique({ where: { id: eventId } });
      if (!existing) {
        return NextResponse.json({ error: "Class event not found" }, { status: 404 });
      }

      const meetLink = getSafeMeetingLink(meetingLink || existing.meetingLink);

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: "LIVE",
          startedAt: new Date(),
          meetingLink: meetLink,
        },
        include: { course: true, user: true },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      if (updated.courseId) {
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId: updated.courseId },
          select: { userId: true },
        });

        if (enrollments.length > 0) {
          await prisma.notification.createMany({
            data: enrollments.map((e) => ({
              userId: e.userId,
              title: "🔴 Class is Live Now!",
              message: `"${updated.title}" has started. Join your live session now.`,
              type: "INFO",
              link: meetLink,
            })),
          });

          enrollments.forEach((e) => {
            broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: e.userId });
          });

          broadcastLMSEvent("EVENTS_CHANGED", {
            classLive: true,
            eventId: updated.id,
            title: updated.title,
            meetingLink: meetLink,
            courseId: updated.courseId,
          });
        }
      } else {
        broadcastLMSEvent("EVENTS_CHANGED", {
          classLive: true,
          eventId: updated.id,
          title: updated.title,
          meetingLink: meetLink,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Live class session has been started!",
        event: updated,
        meetingLink: meetLink,
      });
    }

    if (action === "end_class") {
      const { eventId } = body;
      if (!eventId) {
        return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
      }

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
        },
        include: { course: true, user: true },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Class session ended successfully.",
        event: updated,
      });
    }

    if (action === "delete_class") {
      const { eventId } = body;

      if (!eventId) {
        return NextResponse.json(
          { error: "Event ID is required." },
          { status: 400 }
        );
      }

      await prisma.event.delete({
        where: { id: eventId },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Class session cancelled successfully.",
      });
    }

    if (action === "reschedule_class") {
      const { eventId, scheduledDate, meetingLink, description, title } = body;
      if (!eventId || !scheduledDate) {
        return NextResponse.json(
          { error: "Event ID and new scheduled date & time are required." },
          { status: 400 }
        );
      }

      const parsedDate = new Date(scheduledDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format provided." },
          { status: 400 }
        );
      }

      const existing = await prisma.event.findUnique({ where: { id: eventId } });
      if (!existing) {
        return NextResponse.json({ error: "Class session not found." }, { status: 404 });
      }

      let updatedDesc = description !== undefined ? description.trim() : existing.description;

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          dueDate: parsedDate,
          title: title ? title.trim() : undefined,
          meetingLink: meetingLink ? meetingLink.trim() : undefined,
          description: updatedDesc,
          status: "SCHEDULED",
          endedAt: null,
        },
        include: { course: true, user: true },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Class session rescheduled successfully.",
        event: updated,
      });
    }

    if (action === "confirm_trial") {
      const { trialId, confirmedDate, scheduledDate, meetingLink, notes } = body;
      if (!trialId) {
        return NextResponse.json({ error: "Trial ID is required." }, { status: 400 });
      }

      const existingTrial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true, tutor: true, student: true },
      });

      if (!existingTrial) {
        return NextResponse.json({ error: "Trial not found." }, { status: 404 });
      }

      const rawDate = confirmedDate || scheduledDate;
      const targetDate = rawDate ? new Date(rawDate) : existingTrial.preferredDate;
      const link = getSafeMeetingLink(meetingLink || existingTrial.meetingLink);

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          preferredDate: targetDate,
          meetingLink: link,
          notes: notes !== undefined ? notes?.trim() || null : existingTrial.notes,
          status: TrialStatus.CONFIRMED,
        },
        include: { course: true, tutor: true, student: true },
      });

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

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Trial session confirmed and scheduled on the calendar!",
        trial: updatedTrial,
      });
    }

    if (action === "decline_trial") {
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
          notes: reason?.trim() ? `[Declined: ${reason.trim()}]` : existingTrial.notes,
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
            message: `Your trial request for "${existingTrial.course?.title || "London A/L"}" was declined. ${reason ? `Reason: ${reason}` : "Please request another session slot."}`,
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
        message: "Trial session has been declined.",
        trial: updatedTrial,
      });
    }

    if (action === "reschedule_trial") {
      const { trialId, preferredDate, notes } = body;
      if (!trialId || !preferredDate) {
        return NextResponse.json(
          { error: "Trial ID and preferred date & time are required." },
          { status: 400 }
        );
      }

      const parsedDate = new Date(preferredDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format provided." },
          { status: 400 }
        );
      }

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          preferredDate: parsedDate,
          notes: notes !== undefined ? notes.trim() : undefined,
          status: TrialStatus.CONFIRMED,
        },
        include: { course: true, tutor: true, student: true },
      });

      if (updatedTrial.courseId) {
        await prisma.event.updateMany({
          where: {
            courseId: updatedTrial.courseId,
            title: { contains: updatedTrial.studentName },
          },
          data: {
            dueDate: parsedDate,
            status: "SCHEDULED",
            endedAt: null,
          },
        });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "1-on-1 consultation rescheduled successfully.",
        trial: updatedTrial,
      });
    }

    if (action === "unenroll_student") {
      const { studentId, courseId, enrollmentId } = body;

      if (enrollmentId) {
        await prisma.enrollment.delete({ where: { id: enrollmentId } });
      } else if (studentId && courseId) {
        await prisma.enrollment.deleteMany({
          where: { userId: studentId, courseId },
        });
      } else {
        return NextResponse.json(
          { error: "Student ID and Course ID are required to unenroll student." },
          { status: 400 }
        );
      }

      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Student successfully removed from the course.",
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Tutor API POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process tutor action." },
      { status: 500 }
    );
  }
}
