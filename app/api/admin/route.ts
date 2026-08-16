import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, CourseLevel, CourseStatus, EventType } from "@prisma/client";

export async function GET() {
  try {
    const [allUsers, courses, events, privateFiles] = await Promise.all([
      prisma.user.findMany({
        include: {
          enrollments: {
            include: { course: true },
          },
          createdCourses: true,
          events: true,
          badges: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.course.findMany({
        include: {
          instructor: true,
          modules: {
            include: { lessons: true },
            orderBy: { position: "asc" },
          },
          enrollments: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.event.findMany({
        include: {
          course: true,
          user: true,
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.privateFile.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

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
  } catch (error) {
    console.error("Admin API GET error:", error);
    return NextResponse.json({ error: "Failed to fetch admin data" }, { status: 500 });
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
          headline: headline || (assignedRole === Role.ADMIN ? "Academic Dean & Administrator" : assignedRole === Role.INSTRUCTOR ? "Senior Faculty Lecturer" : "London A/L Scholar"),
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

      return NextResponse.json({ success: true, user: updatedUser });
    }

    // 3. Delete User
    if (action === "delete_user" || action === "delete_candidate") {
      const { userId, candidateId } = body;
      const targetId = userId || candidateId;
      await prisma.user.delete({ where: { id: targetId } });
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
      return NextResponse.json({ success: true });
    }

    // 5. Unenroll User
    if (action === "unenroll_user") {
      const { enrollmentId } = body;
      await prisma.enrollment.delete({ where: { id: enrollmentId } });
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
      return NextResponse.json({ success: true, course: updatedCourse });
    }

    // 8. Delete Course
    if (action === "delete_course") {
      const { courseId } = body;
      await prisma.course.delete({ where: { id: courseId } });
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
      return NextResponse.json({ success: true, module: newModule });
    }

    // 10. Delete Module
    if (action === "delete_module") {
      const { moduleId } = body;
      await prisma.module.delete({ where: { id: moduleId } });
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
      return NextResponse.json({ success: true, lesson: newLesson });
    }

    // 12. Delete Lesson
    if (action === "delete_lesson") {
      const { lessonId } = body;
      await prisma.lesson.delete({ where: { id: lessonId } });
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
      return NextResponse.json({ success: true, mock: newMock });
    }

    // 14. Delete Coursework Assessment Event
    if (action === "delete_assessment" || action === "delete_event") {
      const { eventId } = body;
      await prisma.event.delete({ where: { id: eventId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin API POST error:", error);
    return NextResponse.json({ error: "Failed to process admin action" }, { status: 500 });
  }
}
