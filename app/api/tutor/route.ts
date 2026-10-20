import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import {
  getSafeMeetingLink,
  isGenericMeetingLink,
  normalizeMeetingLink,
} from "@/lib/utils";
import { getAuthenticatedUser } from "@/lib/auth";
import { deleteStorageFile } from "@/lib/storage";
import {
  createBBBMeeting,
  getBBBJoinUrl,
  getBBBMeetingId,
  getUniversalJoinLink,
  endBBBMeeting,
  syncClassMeetingSession,
  syncTrialSession,
  isBigBlueButtonConfigured,
} from "@/lib/bigbluebutton";
import { CourseLevel, CourseStatus, EventType, EventStatus, Role, TrialStatus } from "@prisma/client";
import { parseDateTimeInputInTimezone, formatDateInTimezone, formatTimeInTimezone } from "@/lib/timezones";
import { ensureTutorIdForUser } from "@/lib/tutor-id";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const tutor = auth.user;

    if (!tutor.tutorId && (tutor.role === Role.TUTOR || (tutor.role as any) === "INSTRUCTOR")) {
      tutor.tutorId = await ensureTutorIdForUser(tutor.id);
    }

    const courseWhere =
      tutor.role === Role.ADMIN ? {} : { tutorId: tutor.id };

    let courses: any[] = await prisma.course.findMany({
      where: courseWhere,
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
            studentId: student.studentId || null,
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
          if (new Date(enrollment.enrolledAt) > new Date(existing.latestEnrollment)) {
            existing.latestEnrollment = enrollment.enrolledAt;
          }
        }
      });
    });

    const students = Array.from(studentMap.values());

    const eventsWhere =
      tutor.role === Role.ADMIN
        ? {}
        : {
            OR: [
              { userId: tutor.id },
              { requestedBy: tutor.id },
              { courseId: { in: courseIds } },
              { course: { tutorId: tutor.id } },
            ],
          };

    const events = await prisma.event.findMany({
      where: eventsWhere,
      include: {
        course: true,
        user: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    const trialsWhere =
      tutor.role === Role.ADMIN
        ? {}
        : {
            OR: [
              { tutorId: tutor.id },
              { courseId: { in: courseIds } },
            ],
          };

    const trials = await prisma.trialRequest.findMany({
      where: trialsWhere,
      include: {
        course: true,
        student: true,
      },
      orderBy: [
        { createdAt: "desc" },
        { preferredDate: "desc" },
      ],
    });

    return NextResponse.json(
      {
        tutor: {
          id: tutor.id,
          tutorId: tutor.tutorId || null,
          name: tutor.name,
          email: tutor.email,
          headline: tutor.headline || "Senior Tutor",
          bio: tutor.bio || "Subject Lead with specialized expertise in London A/L & O/L specifications.",
          phone: tutor.phone || "",
          avatar: tutor.avatar || null,
          role: tutor.role,
          timezone: tutor.timezone || "Asia/Colombo",
          createdAt: tutor.createdAt,
        },
        courses,
        students,
        events,
        trials,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
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
      const { courseId, title, slug, subtitle, description, category, subjectCode, price, olPrice, level, thumbnail, status } = body;
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
      const isAdmin = tutor.role === Role.ADMIN;
      const tokenPrice = Number(price);
      const olTokenPrice = olPrice !== undefined && olPrice !== null && olPrice !== "" && !isNaN(Number(olPrice)) ? Number(olPrice) : null;

      if (action === "update_course") {
        const existing = await prisma.course.findFirst({
          where: { id: courseId, ...(isAdmin ? {} : { tutorId: tutor.id }) },
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
            price: isAdmin && Number.isFinite(tokenPrice) ? tokenPrice : existing.price,
            olPrice: isAdmin ? (olPrice !== undefined ? olTokenPrice : (existing as any).olPrice) : (existing as any).olPrice,
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
          price: isAdmin && Number.isFinite(tokenPrice) ? tokenPrice : 0,
          olPrice: isAdmin ? olTokenPrice : null,
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

      const existingTutor = await prisma.user.findUnique({
        where: { id: tutorId },
        select: { bio: true },
      });

      let existingHourlyRate = "5000";
      let existingHourlyRateAL = "5000";
      let existingHourlyRateOL = "3500";
      if (existingTutor?.bio) {
        try {
          const parsedExisting = JSON.parse(existingTutor.bio);
          if (parsedExisting.hourlyRate) existingHourlyRate = String(parsedExisting.hourlyRate);
          existingHourlyRateAL = String(parsedExisting.hourlyRateAL || existingHourlyRate || "5000");
          existingHourlyRateOL = String(parsedExisting.hourlyRateOL || "3500");
        } catch {}
      }

      let finalBio = bio ? bio.trim() : undefined;
      if (finalBio) {
        try {
          const parsedBio = JSON.parse(finalBio);
          parsedBio.hourlyRate = existingHourlyRate;
          parsedBio.hourlyRateAL = existingHourlyRateAL;
          parsedBio.hourlyRateOL = existingHourlyRateOL;
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
        durationMinutes,
      } = body;

      if (!title || !scheduledDate) {
        return NextResponse.json(
          { error: "Class title and scheduled date are required." },
          { status: 400 }
        );
      }

      const operatingTimezone = body.timezone || tutor.timezone || "Asia/Colombo";
      let parsedDueDate: Date;
      if (typeof scheduledDate === "string" && !scheduledDate.includes("Z") && !scheduledDate.includes("+") && !scheduledDate.match(/-\d{2}:\d{2}$/)) {
        parsedDueDate = parseDateTimeInputInTimezone(scheduledDate, operatingTimezone);
      } else {
        parsedDueDate = new Date(scheduledDate);
      }
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: "Invalid scheduled date format." }, { status: 400 });
      }

      // Determine BigBlueButton meeting room
      let meetLink =
        meetingLink?.trim() && !isGenericMeetingLink(meetingLink)
          ? getSafeMeetingLink(meetingLink)
          : null;

      const placeholderSpaceId = `class-${Date.now()}`;
      let meetingSpaceId: string | null = meetLink ? null : placeholderSpaceId;

      if (!meetLink) {
        meetLink = getUniversalJoinLink({ eventId: placeholderSpaceId });
      }

      if (isBigBlueButtonConfigured() && meetingSpaceId) {
        try {
          await createBBBMeeting({
            meetingId: meetingSpaceId,
            name: title.trim(),
            record: true,
          });
        } catch (e) {
          console.warn("[schedule_class] BBB create error:", e);
        }
      }

      const fullDescription = [
        description?.trim() || "Live curriculum individual class with Tutor.",
        meetLink ? `\n\nBigBlueButton Classroom: ${meetLink}` : "",
      ]
        .join("")
        .trim();

      const newClassEvent = await prisma.event.create({
        data: {
          title: title.trim(),
          description: fullDescription,
          meetingLink: meetLink,
          meetingSpaceId,
          dueDate: parsedDueDate,
          status: EventStatus.SCHEDULED,
          approvalStatus: "APPROVED",
          requestedBy: tutor.id,
          rejectionReason: null,
          type: (type as EventType) || EventType.LIVE_SEMINAR,
          courseId: courseId || null,
          userId: studentId || null,
        },
      });

      // Update to canonical event ID join link if placeholder was used
      if (meetingSpaceId === placeholderSpaceId) {
        const canonicalSpaceId = getBBBMeetingId({ eventId: newClassEvent.id });
        const canonicalLink = getUniversalJoinLink({ eventId: newClassEvent.id });
        await prisma.event.update({
          where: { id: newClassEvent.id },
          data: {
            meetingLink: canonicalLink,
            meetingSpaceId: canonicalSpaceId,
            description: newClassEvent.description?.replace(placeholderSpaceId, newClassEvent.id) || null,
          },
        });
        meetLink = canonicalLink;
      }

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Live class session scheduled successfully.",
        event: newClassEvent,
        meetingLink: meetLink,
      });
    }

    if (action === "start_class" || action === "start_session") {
      const { eventId, trialId, meetingLink } = body;
      if (!eventId && !trialId) {
        return NextResponse.json({ error: "Event ID or Trial ID is required." }, { status: 400 });
      }

      let existingEvent: any = null;
      let existingTrial: any = null;

      if (trialId) {
        existingTrial = await prisma.trialRequest.findUnique({
          where: { id: trialId },
          include: { course: true, student: true },
        });
        if (!existingTrial) {
          return NextResponse.json({ error: "Trial consultation not found." }, { status: 404 });
        }
        existingEvent = await prisma.event.findFirst({
          where: {
            OR: [
              { description: { contains: trialId } },
              ...(existingTrial.studentId ? [{ userId: existingTrial.studentId, title: { contains: "Trial" } }] : []),
              ...(existingTrial.courseId ? [{ courseId: existingTrial.courseId, title: { contains: existingTrial.studentName } }] : []),
            ],
          },
        });
      } else if (eventId) {
        existingEvent = await prisma.event.findUnique({
          where: { id: eventId },
          include: { course: true, user: true },
        });
        if (!existingEvent) {
          return NextResponse.json({ error: "Class event not found" }, { status: 404 });
        }
        const match = existingEvent.description?.match(/Trial ID:\s*([a-zA-Z0-9_-]+)/);
        if (match?.[1]) {
          existingTrial = await prisma.trialRequest.findUnique({ where: { id: match[1] } });
        }
      }

      // Set up BigBlueButton classroom
      const bbbId =
        existingEvent?.meetingSpaceId ||
        existingTrial?.meetingSpaceId ||
        getBBBMeetingId({ eventId: existingEvent?.id, trialId: existingTrial?.id });

      const roomTitle = existingEvent?.title || existingTrial?.topic || "PulseEDU Live Session";

      if (isBigBlueButtonConfigured()) {
        try {
          await createBBBMeeting({
            meetingId: bbbId,
            name: roomTitle,
            record: true,
            autoStartRecording: true,
            allowStartStopRecording: false,
          });
        } catch (err: any) {
          console.warn("[start_class] createBBBMeeting notice:", err?.message || err);
        }
      }

      const defaultStudentJoinLink = getUniversalJoinLink({
        eventId: existingEvent?.id,
        trialId: existingTrial?.id,
      });

      const tutorModeratorUrl = getBBBJoinUrl({
        meetingId: bbbId,
        fullName: tutor.name,
        isModerator: true,
        userId: tutor.id,
      });

      const rawCandidate = meetingLink || existingEvent?.meetingLink || existingTrial?.meetingLink;
      const isCustomExternalLink =
        rawCandidate &&
        !isGenericMeetingLink(rawCandidate) &&
        !rawCandidate.includes("/api/meetings/join") &&
        !rawCandidate.includes("bigbluebutton");

      const effectiveStudentLink = isCustomExternalLink
        ? getSafeMeetingLink(rawCandidate)
        : defaultStudentJoinLink;

      const now = new Date();

      if (existingEvent) {
        existingEvent = await prisma.event.update({
          where: { id: existingEvent.id },
          data: {
            status: "LIVE",
            startedAt: now,
            meetingLink: effectiveStudentLink,
            meetingSpaceId: bbbId,
          },
          include: { course: true, user: true },
        });
      } else if (existingTrial) {
        existingEvent = await prisma.event.create({
          data: {
            title: `1-on-1 Trial: ${existingTrial.course?.title || "Class"} (${existingTrial.studentName})`,
            description: `Live 1-on-1 Consultation Session with Tutor.\nTrial ID: ${existingTrial.id}`,
            dueDate: existingTrial.preferredDate || now,
            type: EventType.LIVE_SEMINAR,
            status: EventStatus.LIVE,
            startedAt: now,
            approvalStatus: "APPROVED",
            meetingLink: effectiveStudentLink,
            meetingSpaceId: bbbId,
            courseId: existingTrial.courseId || null,
            userId: existingTrial.studentId || null,
            requestedBy: tutor.id,
          },
          include: { course: true, user: true },
        });
      }

      // Automatically record attendance for the tutor starting/joining the session
      try {
        if (existingEvent?.id) {
          const isLate =
            existingEvent.dueDate &&
            now.getTime() - new Date(existingEvent.dueDate).getTime() > 15 * 60 * 1000;
          const tutorStatus = isLate ? "LATE" : "PRESENT";

          await prisma.classAttendance.upsert({
            where: {
              eventId_userId: {
                eventId: existingEvent.id,
                userId: tutor.id,
              },
            },
            update: {
              joinedAt: now,
              status: tutorStatus,
              userRole: tutor.role || Role.TUTOR,
              courseId: existingEvent.courseId || null,
              trialId: existingTrial?.id || null,
              markedBy: "AUTO_ONLINE_JOIN",
              notes: "Instructor started and joined online live session",
            },
            create: {
              eventId: existingEvent.id,
              courseId: existingEvent.courseId || null,
              trialId: existingTrial?.id || null,
              userId: tutor.id,
              userRole: tutor.role || Role.TUTOR,
              status: tutorStatus,
              joinedAt: now,
              markedBy: "AUTO_ONLINE_JOIN",
              notes: "Instructor started and joined online live session",
            },
          });
        }

        if (existingTrial?.id) {
          const existingTrialAtt = await prisma.classAttendance.findFirst({
            where: { trialId: existingTrial.id, userId: tutor.id },
          });
          if (existingTrialAtt) {
            await prisma.classAttendance.update({
              where: { id: existingTrialAtt.id },
              data: {
                joinedAt: now,
                status: "PRESENT",
                userRole: tutor.role || Role.TUTOR,
                courseId: existingTrial.courseId || null,
                markedBy: "AUTO_ONLINE_JOIN",
                notes: "Instructor started and joined trial consultation",
              },
            });
          } else {
            await prisma.classAttendance.create({
              data: {
                trialId: existingTrial.id,
                courseId: existingTrial.courseId || null,
                userId: tutor.id,
                userRole: tutor.role || Role.TUTOR,
                status: "PRESENT",
                joinedAt: now,
                markedBy: "AUTO_ONLINE_JOIN",
                notes: "Instructor started and joined trial consultation",
              },
            });
          }
        }

        broadcastLMSEvent("ATTENDANCE_CHANGED", {
          eventId: existingEvent?.id,
          trialId: existingTrial?.id,
          userId: tutor.id,
          userRole: Role.TUTOR,
        });
      } catch (attErr) {
        console.warn("[start_class] Automated tutor attendance error:", attErr);
      }

      if (existingTrial) {
        existingTrial = await prisma.trialRequest.update({
          where: { id: existingTrial.id },
          data: {
            status: TrialStatus.CONFIRMED,
            actualStartTime: now,
            meetingLink: effectiveStudentLink,
            meetingSpaceId: bbbId,
          },
        });
        broadcastLMSEvent("TRIALS_CHANGED", { trialId: existingTrial.id, live: true, meetingLink: effectiveStudentLink });
      }

      broadcastLMSEvent("EVENTS_CHANGED", {
        classLive: true,
        eventId: existingEvent?.id,
        title: existingEvent?.title,
        meetingLink: effectiveStudentLink,
      });

      // Notify student(s) that session is now live
      const studentIdsToNotify: string[] = [];
      if (existingTrial?.studentId) {
        studentIdsToNotify.push(existingTrial.studentId);
      } else if (existingEvent?.userId) {
        studentIdsToNotify.push(existingEvent.userId);
      } else if (existingEvent?.courseId) {
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId: existingEvent.courseId },
          select: { userId: true },
        });
        enrollments.forEach((e) => studentIdsToNotify.push(e.userId));
      }

      if (studentIdsToNotify.length > 0) {
        await prisma.notification.createMany({
          data: studentIdsToNotify.map((uId) => ({
            userId: uId,
            title: "🔴 Your Session is Live Now!",
            message: `"${existingEvent?.title || "Your class"}" has started! Click to join your tutor on BigBlueButton.`,
            type: "SUCCESS",
            link: effectiveStudentLink,
          })),
        });
        studentIdsToNotify.forEach((uId) => {
          broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: uId });
        });
      }

      return NextResponse.json({
        success: true,
        message: "Live session started! BigBlueButton classroom is ready.",
        event: existingEvent,
        trial: existingTrial,
        meetingLink: tutorModeratorUrl,
      });
    }

    if (action === "end_class" || action === "end_session") {
      const { eventId, trialId, recordingUrl, manualStartTime, manualEndTime } = body;
      if (!eventId && !trialId) {
        return NextResponse.json({ error: "Event ID or Trial ID is required." }, { status: 400 });
      }

      const now = new Date();

      if (trialId) {
        const bbbId = getBBBMeetingId({ trialId });
        endBBBMeeting(bbbId).catch(() => {});

        await prisma.trialRequest.update({
          where: { id: trialId },
          data: {
            status: TrialStatus.COMPLETED,
            actualEndTime: manualEndTime ? new Date(manualEndTime) : now,
            ...(recordingUrl ? { recordingUrl: recordingUrl.trim(), recordingStatus: "AVAILABLE" } : {}),
          },
        }).catch(() => {});
        broadcastLMSEvent("TRIALS_CHANGED", { trialId, ended: true });

        syncTrialSession(trialId, {
          manualStartTime: manualStartTime ? new Date(manualStartTime) : undefined,
          manualEndTime: manualEndTime ? new Date(manualEndTime) : now,
          manualRecordingUrl: recordingUrl ? recordingUrl.trim() : undefined,
        }).catch(() => {});
      }

      let resolvedEventId = eventId;
      if (!resolvedEventId && trialId) {
        const linked = await prisma.event.findFirst({
          where: { description: { contains: trialId } },
          select: { id: true },
        });
        if (linked) resolvedEventId = linked.id;
      }

      if (resolvedEventId) {
        const bbbId = getBBBMeetingId({ eventId: resolvedEventId });
        endBBBMeeting(bbbId).catch(() => {});

        // Step 1: Immediately mark as COMPLETED with endedAt = now so the UI updates instantly
        await prisma.event.update({
          where: { id: resolvedEventId },
          data: {
            status: "COMPLETED",
            endedAt: manualEndTime ? new Date(manualEndTime) : now,
            ...(manualStartTime ? { startedAt: new Date(manualStartTime) } : {}),
            ...(recordingUrl ? { recordingUrl: recordingUrl.trim(), recordingStatus: "AVAILABLE" } : {}),
          },
        });
        broadcastLMSEvent("EVENTS_CHANGED", { eventId: resolvedEventId, ended: true });

        // Step 2: Sync with BigBlueButton
        try {
          await syncClassMeetingSession(resolvedEventId, {
            manualStartTime: manualStartTime ? new Date(manualStartTime) : undefined,
            manualEndTime: manualEndTime ? new Date(manualEndTime) : now,
            manualRecordingUrl: recordingUrl ? recordingUrl.trim() : undefined,
          });
        } catch (syncErr) {
          console.warn("[end_class] sync error:", syncErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Session ended successfully.",
      });
    }

    if (action === "update_meeting_link") {
      const { eventId, trialId, meetingLink } = body;
      const normalized = getSafeMeetingLink(meetingLink);
      if (!normalized) {
        return NextResponse.json({ error: "Please enter a valid meeting room link." }, { status: 400 });
      }

      if (eventId) {
        await prisma.event.update({ where: { id: eventId }, data: { meetingLink: normalized } });
        broadcastLMSEvent("EVENTS_CHANGED", { eventId, meetingLink: normalized });
      }
      if (trialId) {
        await prisma.trialRequest.update({ where: { id: trialId }, data: { meetingLink: normalized } });
        broadcastLMSEvent("TRIALS_CHANGED", { trialId, meetingLink: normalized });
      }

      return NextResponse.json({ success: true, meetingLink: normalized });
    }

    if (action === "update_recording") {
      const { eventId, trialId, recordingUrl } = body;
      const cleanUrl = typeof recordingUrl === "string" ? recordingUrl.trim() : null;

      if (!cleanUrl) {
        return NextResponse.json(
          { error: "Forbidden: Recordings can only be deleted or removed by an Administrator." },
          { status: 403 }
        );
      }

      const recordingStatus = "AVAILABLE";

      if (eventId) {
        const ev = await prisma.event.update({
          where: { id: eventId },
          data: {
            recordingUrl: cleanUrl,
            recordingStatus,
            ...(cleanUrl ? { status: "COMPLETED" } : {}),
          },
          include: { course: { include: { enrollments: true } } },
        });

        if (cleanUrl && ev.course?.enrollments) {
          await prisma.notification.createMany({
            data: ev.course.enrollments.map((en) => ({
              userId: en.userId,
              title: "🎥 Class Recording Available",
              message: `The recording for "${ev.title}" is now ready to watch.`,
              type: "SUCCESS",
              link: cleanUrl,
            })),
          }).catch(() => {});
          ev.course.enrollments.forEach((en) => broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: en.userId }));
        }

        broadcastLMSEvent("EVENTS_CHANGED", { eventId, recordingUrl: cleanUrl });
      }

      if (trialId) {
        const tr = await prisma.trialRequest.update({
          where: { id: trialId },
          data: {
            recordingUrl: cleanUrl,
            recordingStatus,
            ...(cleanUrl ? { status: TrialStatus.COMPLETED } : {}),
          },
        });

        await prisma.event.updateMany({
          where: { description: { contains: trialId } },
          data: {
            recordingUrl: cleanUrl,
            recordingStatus,
            ...(cleanUrl ? { status: "COMPLETED" } : {}),
          },
        }).catch(() => {});

        if (cleanUrl && tr.studentId) {
          await prisma.notification.create({
            data: {
              userId: tr.studentId,
              title: "🎥 1-on-1 Consultation Recording Available",
              message: `The recording for your consultation is ready to watch.`,
              type: "SUCCESS",
              link: cleanUrl,
            },
          }).catch(() => {});
          broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: tr.studentId });
        }

        broadcastLMSEvent("TRIALS_CHANGED", { trialId, recordingUrl: cleanUrl });
        broadcastLMSEvent("EVENTS_CHANGED");
      }

      return NextResponse.json({ success: true, recordingUrl: cleanUrl, recordingStatus });
    }

    if (action === "delete_class" || action === "delete_event" || action === "delete_trial") {
      const { eventId, trialId } = body;

      if (!eventId && !trialId) {
        return NextResponse.json(
          { error: "Event ID or Trial ID is required." },
          { status: 400 }
        );
      }

      if (trialId) {
        // Delete linked events
        await prisma.event.deleteMany({
          where: {
            OR: [
              { description: { contains: trialId } },
            ],
          },
        }).catch(() => {});

        await prisma.trialRequest.delete({
          where: { id: trialId },
        }).catch(() => {});

        broadcastLMSEvent("EVENTS_CHANGED");
        broadcastLMSEvent("TRIALS_CHANGED");

        return NextResponse.json({
          success: true,
          message: "Consultation session deleted successfully.",
        });
      }

      if (eventId) {
        const ev = await prisma.event.findUnique({
          where: { id: eventId },
          select: { id: true, description: true },
        });

        // If it was linked to a trial, also delete the trial
        const match = ev?.description?.match(/Trial ID:\s*([a-zA-Z0-9_-]+)/);
        if (match?.[1]) {
          await prisma.trialRequest.delete({
            where: { id: match[1] },
          }).catch(() => {});
          broadcastLMSEvent("TRIALS_CHANGED");
        }

        await prisma.event.delete({
          where: { id: eventId },
        });

        broadcastLMSEvent("EVENTS_CHANGED");

        return NextResponse.json({
          success: true,
          message: "Class session deleted successfully.",
        });
      }
    }

    if (action === "reschedule_class") {
      const { eventId, scheduledDate, meetingLink, description, title } = body;
      if (!eventId || !scheduledDate) {
        return NextResponse.json(
          { error: "Event ID and new scheduled date & time are required." },
          { status: 400 }
        );
      }

      const operatingTimezone = body.timezone || tutor.timezone || "Asia/Colombo";
      let parsedDate: Date;
      if (typeof scheduledDate === "string" && !scheduledDate.includes("Z") && !scheduledDate.includes("+") && !scheduledDate.match(/-\d{2}:\d{2}$/)) {
        parsedDate = parseDateTimeInputInTimezone(scheduledDate, operatingTimezone);
      } else {
        parsedDate = new Date(scheduledDate);
      }
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
        include: {
          course: {
            include: {
              enrollments: { select: { userId: true } },
            },
          },
          user: true,
        },
      });

      // Synchronize linked trial request if exists
      const trialMatch = existing.description?.match(/Trial ID:\s*([a-zA-Z0-9_-]+)/i);
      const linkedTrialId = trialMatch?.[1];
      if (linkedTrialId) {
        await prisma.trialRequest.update({
          where: { id: linkedTrialId },
          data: {
            preferredDate: parsedDate,
            status: TrialStatus.CONFIRMED,
            ...(meetingLink ? { meetingLink: meetingLink.trim() } : {}),
          },
        }).catch(() => {});
        broadcastLMSEvent("TRIALS_CHANGED", { trialId: linkedTrialId });
      }

      const formattedDate = `${formatDateInTimezone(parsedDate, operatingTimezone, { weekday: "short", month: "short", day: "numeric" })} at ${formatTimeInTimezone(parsedDate, operatingTimezone)}`;

      // Notify assigned student
      if (updated.userId) {
        await prisma.notification.create({
          data: {
            userId: updated.userId,
            title: "📅 Online Class Rescheduled by Tutor",
            message: `Your tutor has rescheduled "${updated.title}" to ${formattedDate}. Check your dashboard for details.`,
            type: "INFO",
            link: "/dashboard",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.userId });
      } else if (updated.courseId) {
        const enrollments = updated.course?.enrollments || [];
        if (enrollments.length > 0) {
          await prisma.notification.createMany({
            data: enrollments.map((en: any) => ({
              userId: en.userId,
              title: "📅 Online Class Rescheduled by Tutor",
              message: `"${updated.title}" has been rescheduled to ${formattedDate}.`,
              type: "INFO",
              link: "/dashboard",
            })),
          });
          enrollments.forEach((en: any) => {
            broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: en.userId });
          });
        }
      }

      broadcastLMSEvent("EVENTS_CHANGED", { eventId, rescheduled: true });

      return NextResponse.json({
        success: true,
        message: "Class session rescheduled successfully and students notified.",
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
      const bbbMeetingId = existingTrial.meetingSpaceId || getBBBMeetingId({ trialId: existingTrial.id });
      const link =
        meetingLink?.trim() && !isGenericMeetingLink(meetingLink)
          ? getSafeMeetingLink(meetingLink)
          : getUniversalJoinLink({ trialId: existingTrial.id });

      if (isBigBlueButtonConfigured()) {
        try {
          await createBBBMeeting({
            meetingId: bbbMeetingId,
            name: `1-on-1 Trial: ${existingTrial.course?.title || "Class"} (${existingTrial.studentName || "Student"})`,
            record: true,
          });
        } catch (e) {
          console.warn("[confirm_trial] BBB notice:", e);
        }
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
          preferredDate: targetDate,
          meetingLink: link,
          meetingSpaceId: bbbMeetingId,
          notes: notes !== undefined ? notes?.trim() || null : existingTrial.notes,
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
      const eventDescription = [
        `🎯 30-Minute 1-on-1 Online Free Trial Session with Tutor.`,
        `Subject / Course: ${courseTitle} ${courseCode ? `(${courseCode})` : ""}`,
        `Topic / Focus: ${updatedTrial.topic || "30-Min Free Trial & Syllabus Overview"}`,
        `Student: ${updatedTrial.studentName} (${updatedTrial.studentEmail})`,
        `Classroom Link: ${link}`,
        updatedTrial.notes ? `Tutor Notes: ${updatedTrial.notes}` : "",
        `Trial ID: ${updatedTrial.id}`,
      ].filter(Boolean).join("\n\n");

      const studentIdToMatch = resolvedStudentId || updatedTrial.studentId;

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
          meetingSpaceId: bbbMeetingId,
          courseId: updatedTrial.courseId || null,
          userId: studentIdToMatch || null,
          requestedBy: tutor.id,
        },
      });

      if (studentIdToMatch) {
        const dateStr = targetDate.toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
        await prisma.notification.create({
          data: {
            userId: studentIdToMatch,
            title: "🎉 Free Trial Confirmed!",
            message: `Your 30-min trial session for "${courseTitle}" has been confirmed for ${dateStr}. BigBlueButton link is ready on your dashboard!`,
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

      const operatingTimezone = body.timezone || tutor.timezone || "Asia/Colombo";
      let parsedDate: Date;
      if (typeof preferredDate === "string" && !preferredDate.includes("Z") && !preferredDate.includes("+") && !preferredDate.match(/-\d{2}:\d{2}$/)) {
        parsedDate = parseDateTimeInputInTimezone(preferredDate, operatingTimezone);
      } else {
        parsedDate = new Date(preferredDate);
      }
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
      const bbbMeetingId = updatedTrial.meetingSpaceId || getBBBMeetingId({ trialId: updatedTrial.id });
      const link =
        updatedTrial.meetingLink && !isGenericMeetingLink(updatedTrial.meetingLink)
          ? getSafeMeetingLink(updatedTrial.meetingLink)
          : getUniversalJoinLink({ trialId: updatedTrial.id });

      if (isBigBlueButtonConfigured()) {
        try {
          await createBBBMeeting({
            meetingId: bbbMeetingId,
            name: `1-on-1 Trial: ${courseTitle} (${updatedTrial.studentName || "Student"})`,
            record: true,
          });
        } catch (e) {
          console.warn("[reschedule_trial] BBB notice:", e);
        }
      }

      await prisma.trialRequest.update({
        where: { id: trialId },
        data: { meetingLink: link, meetingSpaceId: bbbMeetingId },
      }).catch(() => {});
      const eventDescription = [
        `🎯 30-Minute 1-on-1 Online Free Trial Session with Tutor.`,
        `Subject / Course: ${courseTitle} ${courseCode ? `(${courseCode})` : ""}`,
        `Topic / Focus: ${updatedTrial.topic || "30-Min Free Trial & Syllabus Overview"}`,
        `Student: ${updatedTrial.studentName} (${updatedTrial.studentEmail})`,
        `Classroom Link: ${link}`,
        updatedTrial.notes ? `Tutor Notes: ${updatedTrial.notes}` : "",
      ].filter(Boolean).join("\n\n");

      const studentIdToMatch = resolvedStudentId || updatedTrial.studentId;

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
