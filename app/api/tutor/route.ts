import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { getSafeMeetingLink } from "@/lib/utils";
import { getAuthenticatedUser } from "@/lib/auth";
import { deleteStorageFile } from "@/lib/storage";
import { CourseLevel, CourseStatus, EventType, EventStatus, Role, TrialStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const tutor = auth.user;

    let courses: any[] = await prisma.course.findMany({
      where: { tutorId: tutor.id },
      include: {
        modules: {
          include: { lessons: true },
          orderBy: { position: "asc" },
        },
        materials: {
          orderBy: { createdAt: "desc" },
        },
        enrollments: {
          include: {
            user: true,
          },
          orderBy: { enrolledAt: "desc" },
        },
        events: {
          orderBy: { dueDate: "desc" },
        },
        reviews: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (courses.length === 0) {
      courses = await prisma.course.findMany({
        include: {
          modules: {
            include: { lessons: true },
            orderBy: { position: "asc" },
          },
          materials: {
            orderBy: { createdAt: "desc" },
          },
          enrollments: {
            include: {
              user: true,
            },
            orderBy: { enrolledAt: "desc" },
          },
          events: {
            orderBy: { dueDate: "desc" },
          },
          reviews: {
            include: { user: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
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
          { requestedBy: tutor.id },
          { courseId: { in: courseIds } },
          { course: { tutorId: tutor.id } },
        ],
      },
      include: {
        course: true,
        user: true,
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
        headline: tutor.headline || "Senior Tutor",
        bio: tutor.bio || "Subject Lead with specialized expertise in London A/L & O/L specifications.",
        phone: tutor.phone || "",
        avatar: tutor.avatar || null,
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
    const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const tutor = auth.user;
    const body = await request.json();
    const { action } = body;

    if (action === "create_course" || action === "update_course") {
      const { courseId, title, slug, subtitle, description, category, subjectCode, price, level, thumbnail, status } = body;
      if (!title?.trim() || !description?.trim() || !category?.trim()) {
        return NextResponse.json(
          { error: "Course title, description, and category are required." },
          { status: 400 }
        );
      }

      const normalizedSlug = (slug?.trim() || title.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const tokenPrice = Number(price);

      if (action === "update_course") {
        const existing = await prisma.course.findFirst({
          where: { id: courseId, ...(tutor.role !== Role.ADMIN ? { tutorId: tutor.id } : {}) },
        });
        if (!existing) {
          return NextResponse.json({ error: "Course not found or not owned by this tutor." }, { status: 404 });
        }

        const updated = await prisma.course.update({
          where: { id: existing.id },
          data: {
            title: title.trim(),
            slug: normalizedSlug === existing.slug ? existing.slug : `${normalizedSlug}-${Date.now()}`,
            subtitle: subtitle?.trim() || null,
            description: description.trim(),
            category: category.trim(),
            subjectCode: subjectCode?.trim() || null,
            thumbnail: thumbnail !== undefined ? (thumbnail?.trim() || null) : existing.thumbnail,
            price: Number.isFinite(tokenPrice) ? tokenPrice : existing.price,
            level: (level as CourseLevel) || existing.level,
            status: status ? (status as CourseStatus) : existing.status,
          },
        });

        broadcastLMSEvent("COURSES_CHANGED");
        return NextResponse.json({
          success: true,
          message: "Course changes saved successfully.",
          course: updated,
        });
      }

      const created = await prisma.course.create({
        data: {
          title: title.trim(),
          slug: `${normalizedSlug}-${Date.now()}`,
          subtitle: subtitle?.trim() || null,
          description: description.trim(),
          category: category.trim(),
          subjectCode: subjectCode?.trim() || null,
          thumbnail: thumbnail?.trim() || null,
          price: Number.isFinite(tokenPrice) ? tokenPrice : 0,
          level: (level as CourseLevel) || CourseLevel.ADVANCED,
          status: CourseStatus.PENDING_REVIEW,
          tutorId: tutor.id,
          modules: {
            create: [
              {
                title: "Module 1: Foundations & Theoretical Proofs",
                position: 1,
                lessons: {
                  create: [
                    { title: "Lesson 1: Syllabus Breakdown & Unit Overview", durationMin: 25, position: 1, isFreePreview: true },
                  ],
                },
              },
            ],
          },
        },
      });

      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({
        success: true,
        message: "Course submitted for admin approval.",
        course: created,
      });
    }

    if (action === "delete_course") {
      const { courseId } = body;
      const existing = await prisma.course.findFirst({
        where: { id: courseId, ...(tutor.role !== Role.ADMIN ? { tutorId: tutor.id } : {}) },
      });
      if (!existing) {
        return NextResponse.json({ error: "Course not found or permission denied." }, { status: 404 });
      }
      await prisma.course.delete({ where: { id: courseId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Course deleted successfully." });
    }

    if (action === "add_module") {
      const { courseId, title, position } = body;
      const course = await prisma.course.findFirst({
        where: { id: courseId, ...(tutor.role !== Role.ADMIN ? { tutorId: tutor.id } : {}) },
      });
      if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
      const newModule = await prisma.module.create({
        data: {
          courseId,
          title: title.trim(),
          position: position || 2,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, module: newModule });
    }

    if (action === "update_module") {
      const { moduleId, title, position } = body;
      const updatedModule = await prisma.module.update({
        where: { id: moduleId },
        data: {
          title: title !== undefined ? title.trim() : undefined,
          position: position !== undefined ? parseInt(position) : undefined,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, module: updatedModule });
    }

    if (action === "delete_module") {
      const { moduleId } = body;
      await prisma.module.delete({ where: { id: moduleId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Module deleted." });
    }

    if (action === "add_lesson") {
      const { moduleId, title, durationMin, isFreePreview, videoUrl } = body;
      const count = await prisma.lesson.count({ where: { moduleId } });
      const newLesson = await prisma.lesson.create({
        data: {
          moduleId,
          title: title.trim(),
          durationMin: parseInt(durationMin) || 30,
          position: count + 1,
          isFreePreview: Boolean(isFreePreview),
          videoUrl: videoUrl ? videoUrl.trim() : null,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, lesson: newLesson });
    }

    if (action === "update_lesson") {
      const { lessonId, title, durationMin, isFreePreview, videoUrl, position } = body;
      const updatedLesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          title: title !== undefined ? title.trim() : undefined,
          durationMin: durationMin !== undefined ? (parseInt(durationMin) || 30) : undefined,
          isFreePreview: isFreePreview !== undefined ? Boolean(isFreePreview) : undefined,
          videoUrl: videoUrl !== undefined ? videoUrl : undefined,
          position: position !== undefined ? parseInt(position) : undefined,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, lesson: updatedLesson });
    }

    if (action === "delete_lesson") {
      const { lessonId } = body;
      await prisma.lesson.delete({ where: { id: lessonId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Lesson deleted." });
    }

    if (action === "add_course_material") {
      const { courseId, title, description, fileUrl, fileSize, fileType, category } = body;
      if (!courseId || !title || !fileUrl) {
        return NextResponse.json({ error: "Course, title, and file are required" }, { status: 400 });
      }
      const course = await prisma.course.findFirst({
        where: { id: courseId, ...(tutor.role !== Role.ADMIN ? { tutorId: tutor.id } : {}) },
      });
      if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

      const material = await prisma.courseMaterial.create({
        data: {
          courseId,
          title: title.trim(),
          description: description?.trim() || null,
          fileUrl,
          fileSize: fileSize || "1.5 MB",
          fileType: fileType || "application/pdf",
          category: category || "HANDOUT",
        },
      });
      broadcastLMSEvent("MATERIALS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, material });
    }

    if (action === "delete_course_material") {
      const { materialId } = body;
      const existing = await prisma.courseMaterial.findUnique({
        where: { id: materialId },
        include: { course: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
      }
      if (tutor.role !== Role.ADMIN && existing.course?.tutorId !== tutor.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (existing.fileUrl.startsWith("/api/files/")) {
        const fileKey = existing.fileUrl.replace("/api/files/", "");
        await deleteStorageFile(fileKey).catch(() => {});
      }
      await prisma.courseMaterial.delete({ where: { id: materialId } });
      broadcastLMSEvent("MATERIALS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Material deleted." });
    }

    if (action === "update_profile") {
      const { tutorId, name, headline, bio, phone, avatar } = body;

      if (!tutorId) {
        return NextResponse.json(
          { error: "Tutor ID is required" },
          { status: 400 }
        );
      }

      // Fetch existing tutor to preserve admin-configured hourly rate
      const existingTutor = await prisma.user.findUnique({
        where: { id: tutorId },
        select: { bio: true },
      });

      let existingHourlyRate = "65";
      if (existingTutor?.bio) {
        try {
          const parsedExisting = JSON.parse(existingTutor.bio);
          if (parsedExisting.hourlyRate) existingHourlyRate = String(parsedExisting.hourlyRate);
        } catch {}
      }

      // Ensure hourlyRate cannot be modified by tutor (must retain admin-set rate)
      let finalBio = bio ? bio.trim() : undefined;
      if (finalBio) {
        try {
          const parsedBio = JSON.parse(finalBio);
          parsedBio.hourlyRate = existingHourlyRate;
          finalBio = JSON.stringify(parsedBio);
        } catch {}
      }

      const updatedTutor = await prisma.user.update({
        where: { id: tutorId },
        data: {
          name: name ? name.trim() : undefined,
          headline: headline ? headline.trim() : undefined,
          bio: finalBio,
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
        description?.trim() || "Live curriculum individual class with Tutor.",
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
          status: EventStatus.SCHEDULED,
          approvalStatus: "APPROVED",
          requestedBy: tutor.id,
          rejectionReason: null,
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

    if (action === "delete_class" || action === "delete_event") {
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
          status: EventStatus.SCHEDULED,
          approvalStatus: "APPROVED",
          rejectionReason: null,
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

      // Resolve studentId if not yet set
      let resolvedStudentId = existingTrial.studentId;
      if (!resolvedStudentId && existingTrial.studentEmail) {
        const studentUser = await prisma.user.findUnique({
          where: { email: existingTrial.studentEmail },
          select: { id: true },
        });
        if (studentUser) {
          resolvedStudentId = studentUser.id;
        }
      }

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          preferredDate: targetDate,
          meetingLink: link,
          notes: notes !== undefined ? notes?.trim() || null : existingTrial.notes,
          status: TrialStatus.CONFIRMED,
          approvalStatus: "APPROVED",
          rejectionReason: null,
          studentId: resolvedStudentId || existingTrial.studentId,
        },
        include: { course: true, tutor: true, student: true },
      });

      // Create calendar event so student sees it on Timeline, Upcoming, and Calendar
      const courseTitle = updatedTrial.course?.title || "London A/L Tutorial Individual Class";
      const courseCode = updatedTrial.course?.subjectCode || "";
      const eventTitle = `1-on-1 Trial: ${courseTitle} (${updatedTrial.studentName || "Student"})`;
      const eventDescription = [
        `🎯 30-Minute 1-on-1 Online Free Trial Session with Tutor.`,
        `Subject / Course: ${courseTitle} ${courseCode ? `(${courseCode})` : ""}`,
        `Topic / Focus: ${updatedTrial.topic || "30-Min Free Trial & Syllabus Overview"}`,
        `Student: ${updatedTrial.studentName} (${updatedTrial.studentEmail})`,
        `Classroom Link: ${link}`,
        updatedTrial.notes ? `Tutor Notes: ${updatedTrial.notes}` : "",
      ].filter(Boolean).join("\n\n");

      const studentIdToMatch = resolvedStudentId || updatedTrial.studentId;

      // Delete any prior trial event for this student/course to prevent duplicates
      await prisma.event.deleteMany({
        where: {
          OR: [
            ...(updatedTrial.courseId ? [{ courseId: updatedTrial.courseId, title: { contains: updatedTrial.studentName } }] : []),
            ...(studentIdToMatch ? [{ userId: studentIdToMatch, title: { contains: "Trial" } }] : []),
          ],
        },
      });

      await prisma.event.create({
        data: {
          title: eventTitle,
          description: eventDescription,
          dueDate: targetDate,
          type: EventType.LIVE_SEMINAR,
          status: EventStatus.SCHEDULED,
          approvalStatus: "APPROVED",
          meetingLink: link,
          courseId: updatedTrial.courseId || null,
          userId: studentIdToMatch || null,
          requestedBy: tutor.id,
        },
      });

      // Notify student of confirmation
      if (studentIdToMatch) {
        const dateStr = targetDate.toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
        await prisma.notification.create({
          data: {
            userId: studentIdToMatch,
            title: "🎉 Free Trial Confirmed!",
            message: `Your 30-min trial session for "${courseTitle}" has been confirmed for ${dateStr}. Google Meet link is ready on your dashboard!`,
            type: "INFO",
            link: "/dashboard",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: studentIdToMatch });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Trial session confirmed and scheduled on calendar!",
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

      await prisma.event.deleteMany({
        where: {
          OR: [
            ...(existingTrial.courseId ? [{ courseId: existingTrial.courseId, title: { contains: existingTrial.studentName } }] : []),
            ...(existingTrial.studentId ? [{ userId: existingTrial.studentId, title: { contains: "Trial" } }] : []),
          ],
        },
      });

      if (existingTrial.studentId) {
        await prisma.notification.create({
          data: {
            userId: existingTrial.studentId,
            title: "Trial Request Update",
            message: `Your trial request for "${existingTrial.course?.title || "London A/L"}" was declined. ${reason ? `Reason: ${reason}` : "Please request another session slot."}`,
            type: "INFO",
            link: "/classes",
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

      const existingTrial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true, tutor: true, student: true },
      });

      if (!existingTrial) {
        return NextResponse.json({ error: "Trial session not found." }, { status: 404 });
      }

      let resolvedStudentId = existingTrial.studentId;
      if (!resolvedStudentId && existingTrial.studentEmail) {
        const studentUser = await prisma.user.findUnique({
          where: { email: existingTrial.studentEmail },
          select: { id: true },
        });
        if (studentUser) {
          resolvedStudentId = studentUser.id;
        }
      }

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          preferredDate: parsedDate,
          notes: notes !== undefined ? notes.trim() : undefined,
          status: TrialStatus.CONFIRMED,
          approvalStatus: "APPROVED",
          rejectionReason: null,
          studentId: resolvedStudentId || existingTrial.studentId,
        },
        include: { course: true, tutor: true, student: true },
      });

      const courseTitle = updatedTrial.course?.title || "London A/L Tutorial Individual Class";
      const courseCode = updatedTrial.course?.subjectCode || "";
      const eventTitle = `1-on-1 Trial: ${courseTitle} (${updatedTrial.studentName || "Student"})`;
      const link = updatedTrial.meetingLink || "https://meet.google.com/new";
      const eventDescription = [
        `🎯 30-Minute 1-on-1 Online Free Trial Session with Tutor.`,
        `Subject / Course: ${courseTitle} ${courseCode ? `(${courseCode})` : ""}`,
        `Topic / Focus: ${updatedTrial.topic || "30-Min Free Trial & Syllabus Overview"}`,
        `Student: ${updatedTrial.studentName} (${updatedTrial.studentEmail})`,
        `Classroom Link: ${link}`,
        updatedTrial.notes ? `Tutor Notes: ${updatedTrial.notes}` : "",
      ].filter(Boolean).join("\n\n");

      const studentIdToMatch = resolvedStudentId || updatedTrial.studentId;

      // Update existing event or create if not found
      const existingEvents = await prisma.event.findMany({
        where: {
          OR: [
            ...(updatedTrial.courseId ? [{ courseId: updatedTrial.courseId, title: { contains: updatedTrial.studentName } }] : []),
            ...(studentIdToMatch ? [{ userId: studentIdToMatch, title: { contains: "Trial" } }] : []),
          ],
        },
      });

      if (existingEvents.length > 0) {
        await prisma.event.updateMany({
          where: {
            id: { in: existingEvents.map((e) => e.id) },
          },
          data: {
            dueDate: parsedDate,
            description: eventDescription,
            status: EventStatus.SCHEDULED,
            endedAt: null,
          },
        });
      } else {
        await prisma.event.create({
          data: {
            title: eventTitle,
            description: eventDescription,
            dueDate: parsedDate,
            type: EventType.LIVE_SEMINAR,
            status: EventStatus.SCHEDULED,
            approvalStatus: "APPROVED",
            meetingLink: link,
            courseId: updatedTrial.courseId || null,
            userId: studentIdToMatch || null,
            requestedBy: tutor.id,
          },
        });
      }

      // Notify student of reschedule
      if (studentIdToMatch) {
        const dateStr = parsedDate.toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
        await prisma.notification.create({
          data: {
            userId: studentIdToMatch,
            title: "📅 Trial Session Rescheduled",
            message: `Your trial session for "${courseTitle}" has been rescheduled to ${dateStr}.`,
            type: "INFO",
            link: "/dashboard",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: studentIdToMatch });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "1-on-1 consultation rescheduled successfully.",
        trial: updatedTrial,
      });
    }

    if (action === "delete_trial") {
      const { trialId } = body;
      if (!trialId) {
        return NextResponse.json({ error: "Trial ID is required." }, { status: 400 });
      }
      const existingTrial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
      });
      if (!existingTrial) {
        return NextResponse.json({ error: "Trial not found." }, { status: 404 });
      }
      if (tutor.role !== Role.ADMIN && existingTrial.tutorId !== tutor.id) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
      }
      await prisma.trialRequest.delete({ where: { id: trialId } });
      broadcastLMSEvent("TRIALS_CHANGED");
      return NextResponse.json({ success: true, message: "Trial request deleted." });
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
