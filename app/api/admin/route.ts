import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";
import { getSafeMeetingLink } from "@/lib/utils";
import { getAuthenticatedUser, hashPassword } from "@/lib/auth";
import { getBundles, saveBundles } from "@/lib/bundles";
import { Role, CourseLevel, CourseStatus, EventType, EventStatus, TrialStatus } from "@prisma/client";

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
          tokenWallet: {
            include: {
              transactions: {
                orderBy: { createdAt: "desc" },
                take: 10,
              },
            },
          },
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

    let pendingClasses: any[] = [];
    let pendingTrials: any[] = [];
    let pendingCourses: any[] = [];

    try {
      pendingClasses = await prisma.event.findMany({
        where: { status: EventStatus.PENDING_APPROVAL },
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (pcErr) {
      console.error("Error fetching pending classes:", pcErr);
      pendingClasses = [];
    }

    try {
      pendingTrials = await prisma.trialRequest.findMany({
        where: { status: TrialStatus.PENDING_APPROVAL },
        include: {
          course: {
            include: { tutor: true },
          },
          tutor: true,
          student: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    } catch (ptErr) {
      console.error("Error fetching pending trials:", ptErr);
      pendingTrials = [];
    }

    try {
      pendingCourses = await prisma.course.findMany({
        where: { status: CourseStatus.PENDING_REVIEW },
        include: {
          tutor: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    } catch (pcrErr) {
      console.error("Error fetching pending courses:", pcrErr);
      pendingCourses = [];
    }

    const candidates = allUsers.filter((u) => u.role === Role.STUDENT);
    const faculty = allUsers.filter((u) => u.role === Role.TUTOR || (u.role as any) === "INSTRUCTOR");
    const admins = allUsers.filter((u) => u.role === Role.ADMIN);

    const totalPendingApprovals = pendingClasses.length + pendingTrials.length + pendingCourses.length;

    return NextResponse.json({
      allUsers,
      candidates,
      faculty,
      admins,
      courses,
      events,
      privateFiles,
      pendingClasses,
      pendingTrials,
      pendingCourses,
      totalPendingApprovals,
      bundles: await getBundles(),
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

    if (action === "grant_tokens" || action === "give_credit" || action === "adjust_tokens") {
      const { userId, amount, reason, mode } = body;
      const parsedAmount = parseFloat(amount);

      if (!userId) {
        return NextResponse.json({ error: "Student user ID is required." }, { status: 400 });
      }

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: "Token / credit amount must be a positive number." }, { status: 400 });
      }

      const targetStudent = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetStudent) {
        return NextResponse.json({ error: "Student user account not found." }, { status: 404 });
      }

      let wallet = await prisma.tokenWallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await prisma.tokenWallet.create({
          data: {
            userId,
            balance: 0,
          },
        });
      }

      const description = reason?.trim() || `Admin Grant: ${parsedAmount} Free Learning Hours Credit`;

      const updatedWallet = await prisma.$transaction(async (tx) => {
        let newBalance = wallet.balance;
        let txAmount = parsedAmount;

        if (mode === "SET") {
          newBalance = parsedAmount;
          txAmount = parsedAmount - wallet.balance;
        } else if (mode === "DEDUCT") {
          newBalance = Math.max(0, wallet.balance - parsedAmount);
          txAmount = -parsedAmount;
        } else {
          // Default: GRANT / ADD
          newBalance = wallet.balance + parsedAmount;
          txAmount = parsedAmount;
        }

        const w = await tx.tokenWallet.update({
          where: { id: wallet.id },
          data: {
            balance: newBalance,
          },
        });

        await tx.tokenTransaction.create({
          data: {
            walletId: wallet.id,
            amount: txAmount,
            type: mode === "DEDUCT" ? "SPEND" : "BONUS",
            description,
          },
        });

        return w;
      });

      broadcastLMSEvent("USERS_CHANGED");
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId });

      return NextResponse.json({
        success: true,
        message: `Successfully granted ${parsedAmount} free learning hour tokens to ${targetStudent.name}! Updated balance: ${updatedWallet.balance} Hours.`,
        wallet: updatedWallet,
      });
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

    if (action === "approve_class") {
      const { eventId } = body;
      const existing = await prisma.event.findUnique({
        where: { id: eventId },
        include: { course: { include: { tutor: true } }, user: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Class event not found" }, { status: 404 });
      }

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.SCHEDULED,
          approvalStatus: "APPROVED",
          rejectionReason: null,
        },
        include: { course: { include: { tutor: true } }, user: true },
      });

      // Notify tutor
      const tutorId = existing.requestedBy || existing.course?.tutorId;
      if (tutorId) {
        await prisma.notification.create({
          data: {
            userId: tutorId,
            title: "✅ Live Class Approved!",
            message: `Your class session "${updated.title}" scheduled for ${new Date(updated.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} was approved by Admin and is now live on student calendars.`,
            type: "SUCCESS",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: tutorId });
      }

      // Notify enrolled students
      if (updated.courseId) {
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId: updated.courseId },
          select: { userId: true },
        });
        if (enrollments.length > 0) {
          await prisma.notification.createMany({
            data: enrollments.map((e) => ({
              userId: e.userId,
              title: "📅 New Live Class Scheduled",
              message: `"${updated.title}" has been approved and scheduled for ${new Date(updated.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.`,
              type: "INFO",
              link: "/dashboard",
            })),
          });
          enrollments.forEach((e) => broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: e.userId }));
        }
      } else if (updated.userId) {
        await prisma.notification.create({
          data: {
            userId: updated.userId,
            title: "📅 Live Session Scheduled",
            message: `"${updated.title}" has been approved and scheduled for ${new Date(updated.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.`,
            type: "INFO",
            link: "/dashboard",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.userId });
      }

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Live class approved and published successfully!", event: updated });
    }

    if (action === "reject_class") {
      const { eventId, reason } = body;
      const existing = await prisma.event.findUnique({
        where: { id: eventId },
        include: { course: { include: { tutor: true } } },
      });
      if (!existing) {
        return NextResponse.json({ error: "Class event not found" }, { status: 404 });
      }

      const rejectionReason = reason?.trim() || "Class session proposal was declined by administrator.";
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.REJECTED,
          approvalStatus: "REJECTED",
          rejectionReason,
        },
      });

      const tutorId = existing.requestedBy || existing.course?.tutorId;
      if (tutorId) {
        await prisma.notification.create({
          data: {
            userId: tutorId,
            title: "❌ Live Class Request Declined",
            message: `Your schedule request for "${existing.title}" was declined by Admin. Reason: ${rejectionReason}`,
            type: "ALERT",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: tutorId });
      }

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Class session declined.", event: updated });
    }

    if (action === "approve_trial") {
      const { trialId } = body;
      const existing = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true, tutor: true, student: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Trial request not found" }, { status: 404 });
      }

      const updated = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: TrialStatus.CONFIRMED,
          approvalStatus: "APPROVED",
          rejectionReason: null,
        },
        include: { course: true, tutor: true, student: true },
      });

      const courseTitle = updated.course?.title || "London A/L Tutorial Masterclass";
      const courseCode = updated.course?.subjectCode || "";
      const eventTitle = `30-Min Free Trial: ${courseTitle} (${updated.studentName})`;
      const link = updated.meetingLink || "https://meet.google.com/new";
      const eventDescription = [
        `🎯 30-Minute 1-on-1 Online Free Trial Session with Senior Faculty.`,
        `Subject / Course: ${courseTitle} ${courseCode ? `(${courseCode})` : ""}`,
        `Topic / Focus: ${updated.topic || "30-Min Free Trial & Syllabus Overview"}`,
        `Student: ${updated.studentName} (${updated.studentEmail})`,
        `Classroom Link: ${link}`,
        updated.notes ? `Faculty Notes: ${updated.notes}` : "",
      ].filter(Boolean).join("\n\n");

      if (updated.courseId) {
        await prisma.event.deleteMany({
          where: {
            courseId: updated.courseId,
            title: { contains: updated.studentName },
          },
        });
      }

      await prisma.event.create({
        data: {
          title: eventTitle,
          description: eventDescription,
          dueDate: updated.preferredDate,
          type: EventType.LIVE_SEMINAR,
          status: EventStatus.SCHEDULED,
          approvalStatus: "APPROVED",
          meetingLink: link,
          courseId: updated.courseId || null,
          userId: updated.studentId || updated.tutorId || null,
        },
      });

      if (updated.studentId) {
        const dateStr = new Date(updated.preferredDate).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        await prisma.notification.create({
          data: {
            userId: updated.studentId,
            title: "🎉 Free Trial Confirmed!",
            message: `Your trial session for "${courseTitle}" has been approved and confirmed for ${dateStr}. Google Meet link is ready on your calendar!`,
            type: "SUCCESS",
            link: "/dashboard",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.studentId });
      }

      if (updated.tutorId) {
        await prisma.notification.create({
          data: {
            userId: updated.tutorId,
            title: "✅ Trial Session Approved by Admin",
            message: `Trial session with ${updated.studentName} has been approved and scheduled on the student's calendar.`,
            type: "SUCCESS",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.tutorId });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Trial session approved and scheduled successfully!", trial: updated });
    }

    if (action === "reject_trial") {
      const { trialId, reason } = body;
      const existing = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true, tutor: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Trial request not found" }, { status: 404 });
      }

      const rejectionReason = reason?.trim() || "Trial session declined by administrator.";
      const updated = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: TrialStatus.REJECTED,
          approvalStatus: "REJECTED",
          rejectionReason,
        },
      });

      if (existing.tutorId) {
        await prisma.notification.create({
          data: {
            userId: existing.tutorId,
            title: "❌ Trial Request Declined",
            message: `Trial request for ${existing.studentName} was declined by Admin. Reason: ${rejectionReason}`,
            type: "ALERT",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: existing.tutorId });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      return NextResponse.json({ success: true, message: "Trial request declined.", trial: updated });
    }

    if (action === "approve_course") {
      const { courseId } = body;
      const updated = await prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.PUBLISHED },
        include: { tutor: true },
      });
      if (updated.tutorId) {
        await prisma.notification.create({
          data: {
            userId: updated.tutorId,
            title: "🎉 Course Approved & Published!",
            message: `Your course "${updated.title}" has been approved and is now live for student enrollments.`,
            type: "SUCCESS",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.tutorId });
      }
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Course published successfully!", course: updated });
    }

    if (action === "reject_course") {
      const { courseId, reason } = body;
      const updated = await prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.DRAFT },
        include: { tutor: true },
      });
      if (updated.tutorId) {
        await prisma.notification.create({
          data: {
            userId: updated.tutorId,
            title: "📝 Course Review Feedback",
            message: `Your course "${updated.title}" requires revisions before publishing. Feedback: ${reason || "Please review syllabus content."}`,
            type: "ALERT",
            link: "/tutor",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: updated.tutorId });
      }
      broadcastLMSEvent("COURSES_CHANGED");
      return NextResponse.json({ success: true, message: "Course returned to draft status.", course: updated });
    }

    if (action === "update_bundles") {
      const { bundles } = body;
      if (!Array.isArray(bundles) || bundles.length === 0) {
        return NextResponse.json({ error: "Invalid bundles data. Must be a non-empty array." }, { status: 400 });
      }
      // Validate each bundle has required fields
      for (const b of bundles) {
        if (!b.id || !b.name || typeof b.price !== "number" || typeof b.tokens !== "number") {
          return NextResponse.json({ error: "Each bundle must have id, name, price, and tokens." }, { status: 400 });
        }
      }
      await saveBundles(bundles);
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", {});
      return NextResponse.json({ success: true, message: "Token bundle packages updated successfully!", bundles });
    }
  } catch (error) {
    console.error("Admin API POST error:", error);
    return NextResponse.json({ error: "Failed to process admin action" }, { status: 500 });
  }
}
