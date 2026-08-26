import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { EventType, Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const emailCookie = request.cookies.get("edupulse_user_email")?.value;

    // 1. Locate the active tutor
    let tutor = null;
    if (emailCookie) {
      tutor = await prisma.user.findFirst({
        where: {
          email: emailCookie.toLowerCase(),
          role: Role.INSTRUCTOR,
        },
      });
    }

    // Fallback to first instructor if cookie not set or not matching
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

    // 2. Fetch courses assigned/authored by this tutor (or all courses if tutor hasn't authored any yet)
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

    // If tutor has no direct courses, give access to academy courses
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

    // 3. Aggregate all enrolled students across the tutor's courses
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

    // 4. Fetch scheduled classes & calendar events for this tutor
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

    // 5. Fetch 30-min free trial requests for this tutor
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

    // 1. UPDATE TUTOR PROFILE & QUALIFICATIONS
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

    // 2. SCHEDULE NEW LIVE CLASS / SEMINAR FOR STUDENTS
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

    // 3. START LIVE CLASS (TUTOR TRIGGER)
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

      // Notify all enrolled students in the associated course
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

          // Broadcast to each student's feed
          enrollments.forEach((e) => {
            broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: e.userId });
          });

          // Also broadcast a CLASS_LIVE event with meeting info
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

    // 4. END LIVE CLASS
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

    // 5. DELETE / CANCEL SCHEDULED CLASS
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

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Tutor API POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process tutor action." },
      { status: 500 }
    );
  }
}
