/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role, AttendanceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = auth.user;
    const searchParams = request.nextUrl.searchParams;
    const requestedEventId = searchParams.get("eventId");
    const requestedCourseId = searchParams.get("courseId");
    const requestedStudentId = searchParams.get("studentId");
    const requestedTutorId = searchParams.get("tutorId");
    const viewMode = searchParams.get("view") || (user.role === Role.STUDENT ? "student" : user.role === Role.TUTOR ? "tutor" : "admin");

    // 1. SPECIFIC CLASS ROSTER VIEW (Tutors & Admins)
    if (requestedEventId) {
      const event = await prisma.event.findUnique({
        where: { id: requestedEventId },
        include: {
          course: {
            include: {
              tutor: { select: { id: true, name: true, email: true } },
              enrollments: {
                include: {
                  user: { select: { id: true, name: true, email: true, avatar: true, studentId: true } },
                },
              },
            },
          },
          attendanceRecords: {
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true, studentId: true, role: true } },
            },
          },
        },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      // Authorization check
      const isOwnerTutor = event.course?.tutorId === user.id || event.requestedBy === user.id;
      const isAdmin = user.role === Role.ADMIN;
      if (!isOwnerTutor && !isAdmin && user.role !== Role.STUDENT) {
        return NextResponse.json({ error: "Forbidden: You cannot view attendance for this class" }, { status: 403 });
      }

      // Map enrolled students to their attendance record
      const attendanceMap = new Map<string, any>();
      for (const att of event.attendanceRecords) {
        attendanceMap.set(att.userId, att);
      }

      const enrolledStudents = (event.course?.enrollments || []).map((enr) => {
        const student = enr.user;
        const record = attendanceMap.get(student.id);
        return {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          studentAvatar: student.avatar,
          studentRegId: student.studentId,
          status: record ? record.status : "ABSENT",
          joinedAt: record?.joinedAt || null,
          durationMinutes: record?.durationMinutes || 0,
          markedBy: record?.markedBy || "PENDING",
          notes: record?.notes || "",
          attendanceId: record?.id || null,
        };
      });

      // Also include any students who attended but weren't strictly enrolled (e.g. guests / approved invites)
      for (const att of event.attendanceRecords) {
        if (att.userRole === Role.STUDENT && !enrolledStudents.some((s) => s.studentId === att.userId)) {
          enrolledStudents.push({
            studentId: att.user.id,
            studentName: att.user.name,
            studentEmail: att.user.email,
            studentAvatar: att.user.avatar,
            studentRegId: (att.user as any).studentId,
            status: att.status,
            joinedAt: att.joinedAt,
            durationMinutes: att.durationMinutes || 0,
            markedBy: att.markedBy || "AUTO_ONLINE_JOIN",
            notes: att.notes || "",
            attendanceId: att.id,
          });
        }
      }

      // Tutor attendance record
      const tutorRecord = event.attendanceRecords.find(
        (a) => a.userRole === Role.TUTOR || a.userId === event.course?.tutorId
      );

      return NextResponse.json({
        event: {
          id: event.id,
          title: event.title,
          dueDate: event.dueDate,
          type: event.type,
          status: event.status,
          courseTitle: event.course?.title || "Online Class",
          courseId: event.courseId,
          tutorName: event.course?.tutor?.name || "Instructor",
          tutorAttendance: tutorRecord
            ? {
                status: tutorRecord.status,
                joinedAt: tutorRecord.joinedAt,
                durationMinutes: tutorRecord.durationMinutes,
                notes: tutorRecord.notes,
              }
            : null,
        },
        roster: enrolledStudents,
        stats: {
          totalEnrolled: enrolledStudents.length,
          presentCount: enrolledStudents.filter((s) => s.status === "PRESENT").length,
          lateCount: enrolledStudents.filter((s) => s.status === "LATE").length,
          absentCount: enrolledStudents.filter((s) => s.status === "ABSENT").length,
          excusedCount: enrolledStudents.filter((s) => s.status === "EXCUSED").length,
          attendanceRate: enrolledStudents.length > 0
            ? Math.round(
                (enrolledStudents.filter((s) => s.status === "PRESENT" || s.status === "LATE").length /
                  enrolledStudents.length) *
                  100
              )
            : 0,
        },
      });
    }

    // 2. STUDENT ATTENDANCE HISTORY
    if (viewMode === "student" || user.role === Role.STUDENT) {
      const targetUserId = (user.role === Role.ADMIN || user.role === Role.TUTOR) && requestedStudentId
        ? requestedStudentId
        : user.id;

      // Find all courses user is enrolled in
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: targetUserId },
        select: { courseId: true },
      });
      const enrolledCourseIds = enrollments.map((e) => e.courseId);

      // Find all scheduled/completed live class events for those courses
      const allEvents = await prisma.event.findMany({
        where: {
          courseId: { in: enrolledCourseIds },
          status: { in: ["SCHEDULED", "LIVE", "COMPLETED"] },
        },
        include: {
          course: {
            include: {
              tutor: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
        orderBy: { dueDate: "desc" },
      });

      // Get user attendance records
      const userRecords = await prisma.classAttendance.findMany({
        where: { userId: targetUserId },
        include: {
          event: {
            include: {
              course: {
                include: {
                  tutor: { select: { id: true, name: true, avatar: true } },
                },
              },
            },
          },
          trial: {
            include: {
              tutor: { select: { id: true, name: true, avatar: true } },
              course: true,
            },
          },
          course: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const attendanceMap = new Map<string, any>();
      for (const rec of userRecords) {
        if (rec.eventId) {
          attendanceMap.set(rec.eventId, rec);
        }
      }

      const now = new Date();
      // Combine all events with attendance
      const historyItems = allEvents.map((ev) => {
        const att = attendanceMap.get(ev.id);
        const isPast = new Date(ev.dueDate) < now;
        const status = att
          ? att.status
          : isPast
          ? "ABSENT"
          : "SCHEDULED";

        return {
          id: att?.id || `virtual-${ev.id}`,
          eventId: ev.id as string | null,
          classTitle: ev.title,
          courseId: ev.courseId,
          courseTitle: ev.course?.title || "Accredited Class",
          tutorName: ev.course?.tutor?.name || "Instructor",
          classDate: ev.dueDate,
          type: ev.type,
          status,
          joinedAt: att?.joinedAt || null,
          durationMinutes: att?.durationMinutes || 0,
          markedBy: att?.markedBy || (att ? "AUTO_ONLINE_JOIN" : "SYSTEM"),
          notes: att?.notes || "",
          meetingLink: ev.meetingLink || `/api/meetings/join?eventId=${ev.id}`,
        };
      });

      // Also append trials user attended
      for (const rec of userRecords) {
        if (rec.trialId && rec.trial) {
          historyItems.push({
            id: rec.id,
            eventId: null,
            classTitle: `1-on-1 Consultation: ${rec.trial.course?.title || "Trial"}`,
            courseId: rec.trial.courseId,
            courseTitle: rec.trial.course?.title || "1-on-1 Consultation",
            tutorName: rec.trial.tutor?.name || "Tutor",
            classDate: rec.trial.preferredDate,
            type: "TRIAL" as any,
            status: rec.status,
            joinedAt: rec.joinedAt,
            durationMinutes: rec.durationMinutes || 30,
            markedBy: rec.markedBy || "AUTO_ONLINE_JOIN",
            notes: rec.notes || "1-on-1 trial session",
            meetingLink: rec.trial.meetingLink || `/api/meetings/join?trialId=${rec.trial.id}`,
          });
        }
      }

      // Sort by date descending
      historyItems.sort((a, b) => new Date(b.classDate).getTime() - new Date(a.classDate).getTime());

      // Filter by requestedCourseId if provided
      const filteredItems = requestedCourseId
        ? historyItems.filter((i) => i.courseId === requestedCourseId)
        : historyItems;

      const pastClasses = filteredItems.filter((i) => i.status !== "SCHEDULED");
      const presentCount = pastClasses.filter((i) => i.status === "PRESENT" || i.status === "LATE").length;
      const absentCount = pastClasses.filter((i) => i.status === "ABSENT").length;
      const lateCount = pastClasses.filter((i) => i.status === "LATE").length;
      const excusedCount = pastClasses.filter((i) => i.status === "EXCUSED").length;
      const attendanceRate = pastClasses.length > 0
        ? Math.round((presentCount / pastClasses.length) * 100)
        : 100;

      return NextResponse.json({
        stats: {
          totalScheduled: filteredItems.length,
          pastClassesCount: pastClasses.length,
          presentCount,
          lateCount,
          absentCount,
          excusedCount,
          attendanceRate,
        },
        records: filteredItems,
      });
    }

    // 3. TUTOR ATTENDANCE & TEACHING LOGS
    if (viewMode === "tutor" || user.role === Role.TUTOR) {
      const targetTutorId = user.role === Role.ADMIN && requestedTutorId ? requestedTutorId : user.id;

      // Find all courses taught by this tutor
      const courses = await prisma.course.findMany({
        where: { tutorId: targetTutorId },
        select: { id: true, title: true, subjectCode: true },
      });
      const courseIds = courses.map((c) => c.id);

      // Find all events for these courses
      const events = await prisma.event.findMany({
        where: {
          courseId: { in: courseIds },
        },
        include: {
          course: { select: { id: true, title: true } },
          attendanceRecords: {
            include: {
              user: { select: { id: true, name: true, role: true } },
            },
          },
        },
        orderBy: { dueDate: "desc" },
      });

      const teachingLogs = events.map((ev) => {
        const studentAttendees = ev.attendanceRecords.filter((a) => a.userRole === Role.STUDENT);
        const tutorAtt = ev.attendanceRecords.find(
          (a) => a.userId === targetTutorId || a.userRole === Role.TUTOR
        );

        return {
          eventId: ev.id,
          classTitle: ev.title,
          courseId: ev.courseId,
          courseTitle: ev.course?.title || "Accredited Course",
          dueDate: ev.dueDate,
          type: ev.type,
          status: ev.status,
          tutorStatus: tutorAtt ? tutorAtt.status : (new Date(ev.dueDate) < new Date() ? "ABSENT" : "SCHEDULED"),
          tutorJoinedAt: tutorAtt?.joinedAt || null,
          studentAttendeesCount: studentAttendees.filter((s) => s.status === "PRESENT" || s.status === "LATE").length,
          meetingLink: ev.meetingLink || `/api/meetings/join?eventId=${ev.id}`,
        };
      });

      const totalConducted = teachingLogs.filter((t) => t.tutorStatus === "PRESENT" || t.tutorJoinedAt).length;
      const totalStudentAttendees = teachingLogs.reduce((acc, curr) => acc + curr.studentAttendeesCount, 0);

      return NextResponse.json({
        stats: {
          totalClassesScheduled: teachingLogs.length,
          totalConducted,
          tutorDeliveryRate: teachingLogs.length > 0 ? Math.round((totalConducted / teachingLogs.length) * 100) : 100,
          totalStudentAttendees,
          avgAttendeesPerClass: totalConducted > 0 ? Math.round(totalStudentAttendees / totalConducted) : 0,
        },
        courses,
        sessions: teachingLogs,
      });
    }

    // 4. ADMIN INSTITUTION-WIDE OVERVIEW
    const allRecords = await prisma.classAttendance.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true, studentId: true, tutorId: true } },
        event: {
          include: {
            course: { select: { id: true, title: true, tutor: { select: { name: true } } } },
          },
        },
        trial: {
          include: {
            tutor: { select: { name: true } },
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const totalRecords = await prisma.classAttendance.count();
    const studentPresentCount = await prisma.classAttendance.count({
      where: { userRole: Role.STUDENT, status: "PRESENT" },
    });
    const tutorPresentCount = await prisma.classAttendance.count({
      where: { userRole: Role.TUTOR, status: "PRESENT" },
    });

    return NextResponse.json({
      stats: {
        totalRecords,
        studentPresentCount,
        tutorPresentCount,
      },
      recentAttendance: allRecords.map((r) => ({
        id: r.id,
        userName: r.user.name,
        userEmail: r.user.email,
        userRole: r.userRole,
        identifier: r.user.studentId || r.user.tutorId || r.user.id.slice(-6),
        sessionTitle: r.event?.title || (r.trial ? `1-on-1: ${r.trial.course?.title || "Trial"}` : "Online Class"),
        courseTitle: r.event?.course?.title || r.trial?.course?.title || "General",
        tutorName: r.event?.course?.tutor?.name || r.trial?.tutor?.name || "Tutor",
        status: r.status,
        joinedAt: r.joinedAt,
        durationMinutes: r.durationMinutes,
        markedBy: r.markedBy,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[Attendance API Error]:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch attendance records" }, { status: 500 });
  }
}

// POST: Mark / Update Attendance (Tutors & Admins)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.ADMIN, Role.TUTOR, Role.INSTRUCTOR]);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, updates, attendanceId, userId, status, notes, durationMinutes } = body;

    // Single item update
    if (attendanceId || (eventId && userId)) {
      const validStatus: AttendanceStatus = status && ["PRESENT", "LATE", "ABSENT", "EXCUSED"].includes(status)
        ? (status as AttendanceStatus)
        : AttendanceStatus.PRESENT;

      let record;
      if (attendanceId) {
        record = await prisma.classAttendance.update({
          where: { id: attendanceId },
          data: {
            status: validStatus,
            notes: notes !== undefined ? notes : undefined,
            durationMinutes: durationMinutes !== undefined ? durationMinutes : undefined,
            markedBy: `MANUAL_${auth.user.role}`,
          },
        });
      } else {
        const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        record = await prisma.classAttendance.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId,
            },
          },
          update: {
            status: validStatus,
            notes: notes !== undefined ? notes : undefined,
            durationMinutes: durationMinutes !== undefined ? durationMinutes : undefined,
            markedBy: `MANUAL_${auth.user.role}`,
          },
          create: {
            eventId,
            userId,
            userRole: targetUser?.role || Role.STUDENT,
            status: validStatus,
            notes: notes || "Manually marked by tutor/admin",
            durationMinutes: durationMinutes || 0,
            markedBy: `MANUAL_${auth.user.role}`,
          },
        });
      }

      // Update event attendance count if student
      if (eventId) {
        const count = await prisma.classAttendance.count({
          where: { eventId, userRole: Role.STUDENT, status: { in: ["PRESENT", "LATE"] } },
        });
        await prisma.event.update({
          where: { id: eventId },
          data: { attendanceCount: count },
        });
      }

      return NextResponse.json({ success: true, record });
    }

    // Batch update roster for a class event
    if (eventId && Array.isArray(updates)) {
      const results = [];
      for (const item of updates) {
        if (!item.userId) continue;
        const validStatus: AttendanceStatus = ["PRESENT", "LATE", "ABSENT", "EXCUSED"].includes(item.status)
          ? item.status
          : AttendanceStatus.PRESENT;

        const targetUser = await prisma.user.findUnique({ where: { id: item.userId }, select: { role: true } });
        const res = await prisma.classAttendance.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId: item.userId,
            },
          },
          update: {
            status: validStatus,
            notes: item.notes !== undefined ? item.notes : undefined,
            durationMinutes: item.durationMinutes !== undefined ? item.durationMinutes : undefined,
            markedBy: `MANUAL_${auth.user.role}`,
          },
          create: {
            eventId,
            userId: item.userId,
            userRole: targetUser?.role || Role.STUDENT,
            status: validStatus,
            notes: item.notes || "Batch marked by instructor",
            durationMinutes: item.durationMinutes || 0,
            markedBy: `MANUAL_${auth.user.role}`,
          },
        });
        results.push(res);
      }

      const count = await prisma.classAttendance.count({
        where: { eventId, userRole: Role.STUDENT, status: { in: ["PRESENT", "LATE"] } },
      });
      await prisma.event.update({
        where: { id: eventId },
        data: { attendanceCount: count },
      });

      return NextResponse.json({ success: true, count: results.length, records: results });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error: any) {
    console.error("[Attendance Update Error]:", error);
    return NextResponse.json({ error: error?.message || "Failed to update attendance" }, { status: 500 });
  }
}
