import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { EventType, Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const emailCookie = request.cookies.get("edupulse_user_email")?.value;

    let tutor = null;
    if (emailCookie) {
      tutor = await prisma.user.findFirst({
        where: {
          email: emailCookie.toLowerCase(),
          role: Role.INSTRUCTOR,
        },
      });
    }

    if (!tutor) {
      tutor = await prisma.user.findFirst({
        where: { role: Role.INSTRUCTOR },
      });
    }

    if (!tutor) {
      return NextResponse.json(
        { error: "No instructor account found." },
        { status: 404 }
      );
    }

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

      let meetLink = meetingLink?.trim();
      if (!meetLink) {
        meetLink = "https://meet.google.com/new";
      }

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

      let meetLink = meetingLink?.trim() || existing.meetingLink;
      if (!meetLink || meetLink.includes("edupulse-live")) {
        meetLink = "https://meet.google.com/new";
      }

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

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Tutor API POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process tutor action." },
      { status: 500 }
    );
  }
}
