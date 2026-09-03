import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";
import { getSafeMeetingLink } from "@/lib/utils";
import { getAuthenticatedUser, hashPassword } from "@/lib/auth";
import { Role, CourseLevel, CourseStatus, EventType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    let allUsers: any[] = [];
    let courses: any[] = [];
    let events: any[] = [];
    let privateFiles: any[] = [];

    try {
      allUsers = await prisma.user.findMany({
        include: {
          enrollments: {
            include: { course: true },
          },
          createdCourses: true,
          events: true,
          badges: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (uErr) {
      console.error("Error fetching users with relations:", uErr);
      allUsers = await prisma.user.findMany().catch(() => []);
    }

    try {
      courses = await prisma.course.findMany({
        include: {
          tutor: true,
          modules: {
            include: { lessons: true },
            orderBy: { position: "asc" },
          },
          materials: {
            orderBy: { createdAt: "desc" },
          },
          enrollments: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (cErr) {
      console.error("Error fetching courses with relations:", cErr);
      courses = await prisma.course.findMany().catch(() => []);
    }

    try {
      events = await prisma.event.findMany({
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
        orderBy: { dueDate: "asc" },
      });
    } catch (eErr) {
      console.error("Error fetching events:", eErr);
      events = await prisma.event.findMany().catch(() => []);
    }

    try {
      privateFiles = await prisma.privateFile.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (fErr) {
      console.error("Error fetching private files in admin:", fErr);
      privateFiles = [];
    }

    const candidates = allUsers.filter((u) => u.role === Role.STUDENT);
    const faculty = allUsers.filter((u) => u.role === Role.TUTOR || (u.role as any) === "INSTRUCTOR");
    const admins = allUsers.filter((u) => u.role === Role.ADMIN);

    return NextResponse.json({
      allUsers,
      candidates,
      faculty,
      admins,
      courses,
      events,
      privateFiles,
    });
  } catch (error: any) {
    console.error("Admin API GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "create_user" || action === "create_candidate") {
      const { name, email, password, phone, role, headline, bio, initialCourseId } = body;
      const assignedRole = (role as Role) || Role.STUDENT;

      const rawPassword = password || (assignedRole === Role.ADMIN ? "AdminPass123!" : assignedRole === Role.TUTOR || (assignedRole as any) === "INSTRUCTOR" ? "TutorPass123!" : "StudentPass123!");
      const hashedPassword = hashPassword(rawPassword);

      const newUser = await prisma.user.create({
        data: {
          name,
          email: email.trim().toLowerCase(),
          passwordHash: hashedPassword,
          role: assignedRole,
          phone: phone ? phone.trim() : null,
          headline: headline || (assignedRole === Role.ADMIN ? "System Administrator" : assignedRole === Role.TUTOR || (assignedRole as any) === "INSTRUCTOR" ? "Senior Faculty Tutor" : "London A/L Student"),
          bio: bio || `Registered academic member of EduPulse Academy.`,
          avatar: assignedRole === Role.ADMIN
            ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            : assignedRole === Role.TUTOR || (assignedRole as any) === "INSTRUCTOR"
            ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
            : "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
        },
      });

      if (initialCourseId && assignedRole === Role.STUDENT) {
        await prisma.enrollment.create({
          data: {
            userId: newUser.id,
            courseId: initialCourseId,
          },
        });
      }

      broadcastLMSEvent("USERS_CHANGED");
      if (initialCourseId && assignedRole === Role.STUDENT) {
        broadcastLMSEvent("ENROLLMENTS_CHANGED");
        broadcastLMSEvent("COURSES_CHANGED");
      }
      return NextResponse.json({ success: true, user: newUser });
    }

    if (action === "update_user") {
      const { userId, name, email, phone, role, headline, bio, password } = body;
      const updateData: any = {
        name,
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        role: (role as Role) || Role.STUDENT,
        headline,
        bio,
      };
      if (password) {
        updateData.passwordHash = password;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      broadcastLMSEvent("USERS_CHANGED");
      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === "delete_user" || action === "delete_candidate") {
      const { userId, candidateId } = body;
      const targetId = userId || candidateId;
      await prisma.user.delete({ where: { id: targetId } });
      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "enroll_user") {
      const { userId, courseId } = body;
      const existing = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      if (!existing) {
        await prisma.enrollment.create({
          data: { userId, courseId },
        });
      }
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "unenroll_user") {
      const { enrollmentId, userId, courseId } = body;
      if (enrollmentId) {
        await prisma.enrollment.delete({ where: { id: enrollmentId } });
      } else if (userId && courseId) {
        await prisma.enrollment.deleteMany({
          where: { userId, courseId },
        });
      }
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Student unenrolled successfully." });
    }

    if (action === "create_course") {
      const { title, slug, subtitle, description, category, subjectCode, price, tokens, tutorId, instructorId, level, status } = body;

      let finalTutorId = tutorId || instructorId;
      if (!finalTutorId) {
        const firstTutor = await prisma.user.findFirst({ where: { role: Role.TUTOR } }) || await prisma.user.findFirst({ where: { role: (Role as any).INSTRUCTOR } });
        finalTutorId = firstTutor?.id;
      }

      const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${Date.now()}`;
      const tokenValue = tokens !== undefined ? parseFloat(tokens) : (price !== undefined ? parseFloat(price) : 10.0);

      const newCourse = await prisma.course.create({
        data: {
          title,
          slug: generatedSlug,
          subtitle: subtitle || "Official Academic Curriculum Masterclass.",
          description: description || "Comprehensive lecture walkthroughs, unit proofs, and coursework solutions.",
          category: category || "School of Mathematics & Computing",
          subjectCode: subjectCode || "MATH-101",
          price: isNaN(tokenValue) ? 10.0 : tokenValue,
          level: (level as CourseLevel) || CourseLevel.ADVANCED,
          status: (status as CourseStatus) || CourseStatus.PUBLISHED,
          tutorId: finalTutorId,
          modules: {
            create: [
              {
                title: "Module 1: Foundations & Theoretical Proofs",
                position: 1,
                lessons: {
                  create: [
                    { title: "Lesson 1: Syllabus Breakdown & Unit Overview", durationMin: 25, position: 1, isFreePreview: true },
                    { title: "Lesson 2: Core Proofs & Method Masterclass", durationMin: 35, position: 2, isFreePreview: true },
                  ],
                },
              },
            ],
          },
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, course: newCourse });
    }

    if (action === "update_course") {
      const { courseId, title, subtitle, description, category, subjectCode, price, tokens, level, status, tutorId, instructorId } = body;
      const tokenValue = tokens !== undefined ? parseFloat(tokens) : (price !== undefined ? parseFloat(price) : 10.0);
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          title,
          subtitle,
          description,
          category,
          subjectCode,
          price: isNaN(tokenValue) ? 10.0 : tokenValue,
          level: (level as CourseLevel) || CourseLevel.ADVANCED,
          status: (status as CourseStatus) || CourseStatus.PUBLISHED,
          tutorId: tutorId || instructorId || undefined,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, course: updatedCourse });
    }

    if (action === "delete_course") {
      const { courseId } = body;
      await prisma.course.delete({ where: { id: courseId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "add_module") {
      const { courseId, title, position } = body;
      const newModule = await prisma.module.create({
        data: {
          courseId,
          title,
          position: position || 2,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, module: newModule });
    }

    if (action === "delete_module") {
      const { moduleId } = body;
      await prisma.module.delete({ where: { id: moduleId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "add_lesson") {
      const { moduleId, title, durationMin, isFreePreview, videoUrl } = body;
      const count = await prisma.lesson.count({ where: { moduleId } });
      const newLesson = await prisma.lesson.create({
        data: {
          moduleId,
          title,
          durationMin: parseInt(durationMin) || 30,
          position: count + 1,
          isFreePreview: Boolean(isFreePreview),
          videoUrl: videoUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, lesson: newLesson });
    }

    if (action === "delete_lesson") {
      const { lessonId } = body;
      await prisma.lesson.delete({ where: { id: lessonId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "create_mock_paper" || action === "create_assessment") {
      const { title, description, dueDate, courseId, paperCode, durationMins, totalMarks } = body;
      const newMock = await prisma.event.create({
        data: {
          title: title || `Workshop: ${paperCode || "Curriculum Unit Practice"}`,
          description: description || `Interactive academic session (${durationMins || 90} mins).`,
          type: EventType.DEADLINE,
          dueDate: new Date(dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
          courseId: courseId || null,
        },
      });
      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, mock: newMock });
    }

    if (action === "delete_assessment" || action === "delete_event") {
      const { eventId } = body;
      await prisma.event.delete({ where: { id: eventId } });
      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "add_course_material") {
      const { courseId, title, description, fileUrl, fileSize, fileType, category } = body;
      if (!courseId || !title || !fileUrl) {
        return NextResponse.json({ error: "Course, title, and file are required" }, { status: 400 });
      }
      const material = await prisma.courseMaterial.create({
        data: {
          courseId,
          title,
          description: description || null,
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
      const existing = await prisma.courseMaterial.findUnique({ where: { id: materialId } });
      if (existing && existing.fileUrl.startsWith("/api/files/")) {
        const fileKey = existing.fileUrl.replace("/api/files/", "");
        await deleteStorageFile(fileKey);
      }
      await prisma.courseMaterial.delete({ where: { id: materialId } });
      broadcastLMSEvent("MATERIALS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "start_class") {
      const { eventId, meetingLink } = body;
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
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Live class session has been started!",
        event: updated,
        meetingLink: meetLink,
      });
    }

    if (action === "end_class") {
      const { eventId } = body;
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
        },
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Live class session marked as completed.",
        event: updated,
      });
    }

    if (action === "schedule_class") {
      const { title, description, meetingLink, scheduledDate, courseId, tutorId, studentId, type } = body;
      if (!title || !scheduledDate) {
        return NextResponse.json({ error: "Class title and scheduled date are required." }, { status: 400 });
      }

      const meetLink = getSafeMeetingLink(meetingLink);

      const fullDescription = [
        description?.trim() || "Live curriculum masterclass with Faculty.",
        `\n\nGoogle Meet Classroom: ${meetLink}`,
      ].join("").trim();

      const newEvent = await prisma.event.create({
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
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Live Google Meet class session scheduled successfully.",
        event: newEvent,
        meetingLink: meetLink,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin API POST error:", error);
    return NextResponse.json({ error: "Failed to process admin action" }, { status: 500 });
  }
}
