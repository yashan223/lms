import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";
import { Role, CourseLevel, CourseStatus, EventType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
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
          instructor: true,
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
            include: {
              instructor: true,
              enrollments: {
                include: { user: true },
              },
            },
          },
          user: true,
        },
        orderBy: { dueDate: "asc" },
      });
    } catch (eErr) {
      console.error("Error fetching events:", eErr);
      events = [];
    }

    try {
      privateFiles = await prisma.privateFile.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
    } catch (fErr) {
      console.error("Error fetching privateFiles:", fErr);
      privateFiles = [];
    }

    const candidates = allUsers.filter((u) => u.role === Role.STUDENT);
    const faculty = allUsers.filter((u) => u.role === Role.INSTRUCTOR);
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. Create User (Any Role: Student, Instructor, Admin)
    if (action === "create_user" || action === "create_candidate") {
      const { name, email, password, phone, role, headline, bio, initialCourseId } = body;
      const assignedRole = (role as Role) || Role.STUDENT;

      const newUser = await prisma.user.create({
        data: {
          name,
          email: email.trim().toLowerCase(),
          passwordHash: password || (assignedRole === Role.ADMIN ? "AdminPass123!" : assignedRole === Role.INSTRUCTOR ? "InstructorPass123!" : "StudentPass123!"),
          role: assignedRole,
          phone: phone ? phone.trim() : null,
          headline: headline || (assignedRole === Role.ADMIN ? "System Administrator" : assignedRole === Role.INSTRUCTOR ? "Senior Faculty Lecturer" : "London A/L Scholar"),
          bio: bio || `Registered academic member of EduPulse Academy.`,
          avatar: assignedRole === Role.ADMIN
            ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            : assignedRole === Role.INSTRUCTOR
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

    // 2. Update User Details
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

    // 3. Delete User
    if (action === "delete_user" || action === "delete_candidate") {
      const { userId, candidateId } = body;
      const targetId = userId || candidateId;
      await prisma.user.delete({ where: { id: targetId } });
      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      return NextResponse.json({ success: true });
    }

    // 4. Enroll User in Course
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

    // 5. Unenroll User
    if (action === "unenroll_user") {
      const { enrollmentId } = body;
      await prisma.enrollment.delete({ where: { id: enrollmentId } });
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    // 6. Create Course
    if (action === "create_course") {
      const { title, slug, subtitle, description, category, subjectCode, price, instructorId, level, status } = body;
      
      let finalInstructorId = instructorId;
      if (!finalInstructorId) {
        const firstInst = await prisma.user.findFirst({ where: { role: Role.INSTRUCTOR } });
        finalInstructorId = firstInst?.id;
      }

      const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${Date.now()}`;

      const newCourse = await prisma.course.create({
        data: {
          title,
          slug: generatedSlug,
          subtitle: subtitle || "Official Academic Curriculum Masterclass.",
          description: description || "Comprehensive lecture walkthroughs, unit proofs, and coursework solutions.",
          category: category || "School of Mathematics & Computing",
          subjectCode: subjectCode || "MATH-101",
          price: parseFloat(price) || 85.0,
          level: (level as CourseLevel) || CourseLevel.ADVANCED,
          status: (status as CourseStatus) || CourseStatus.PUBLISHED,
          instructorId: finalInstructorId,
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

    // 7. Update Course Details
    if (action === "update_course") {
      const { courseId, title, subtitle, description, category, subjectCode, price, level, status, instructorId } = body;
      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          title,
          subtitle,
          description,
          category,
          subjectCode,
          price: parseFloat(price) || 85.0,
          level: (level as CourseLevel) || CourseLevel.ADVANCED,
          status: (status as CourseStatus) || CourseStatus.PUBLISHED,
          instructorId: instructorId || undefined,
        },
      });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, course: updatedCourse });
    }

    // 8. Delete Course
    if (action === "delete_course") {
      const { courseId } = body;
      await prisma.course.delete({ where: { id: courseId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    // 9. Add Module to Course
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

    // 10. Delete Module
    if (action === "delete_module") {
      const { moduleId } = body;
      await prisma.module.delete({ where: { id: moduleId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    // 11. Add Lesson to Module
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

    // 12. Delete Lesson
    if (action === "delete_lesson") {
      const { lessonId } = body;
      await prisma.lesson.delete({ where: { id: lessonId } });
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true });
    }

    // 13. Create Coursework Assessment Event
    if (action === "create_mock_paper" || action === "create_assessment") {
      const { title, description, dueDate, courseId, paperCode, durationMins, totalMarks } = body;
      const newMock = await prisma.event.create({
        data: {
          title: title || `Assessment: ${paperCode || "Unit Test"}`,
          description: description || `Standardized academic assessment (${durationMins || 90} mins, ${totalMarks || 75} marks).`,
          type: EventType.ASSIGNMENT,
          dueDate: new Date(dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
          courseId: courseId || null,
        },
      });
      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, mock: newMock });
    }

    // 14. Delete Coursework Assessment Event
    if (action === "delete_assessment" || action === "delete_event") {
      const { eventId } = body;
      await prisma.event.delete({ where: { id: eventId } });
      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true });
    }

    // 15. Add Course Material File
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

    // 16. Delete Course Material File
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

    // 17. Start Live Class (Admin or Tutor trigger)
    if (action === "start_class") {
      const { eventId, meetingLink } = body;
      const existing = await prisma.event.findUnique({ where: { id: eventId } });
      if (!existing) {
        return NextResponse.json({ error: "Class event not found" }, { status: 404 });
      }

      let meetLink = meetingLink?.trim() || existing.meetingLink;
      if (!meetLink) {
        const room = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
        meetLink = `https://meet.google.com/${room}`;
      }

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: "LIVE",
          startedAt: new Date(),
          meetingLink: meetLink,
        },
        include: {
          course: {
            include: { instructor: true },
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

    // 18. End Live Class
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
            include: { instructor: true },
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

    // 19. Schedule Live Class from Admin
    if (action === "schedule_class") {
      const { title, description, meetingLink, scheduledDate, courseId, tutorId, studentId, type } = body;
      if (!title || !scheduledDate) {
        return NextResponse.json({ error: "Class title and scheduled date are required." }, { status: 400 });
      }

      let meetLink = meetingLink?.trim();
      if (!meetLink) {
        const room = `${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
        meetLink = `https://meet.google.com/${room}`;
      }

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
          userId: studentId || tutorId || null,
        },
        include: {
          course: {
            include: { instructor: true },
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
