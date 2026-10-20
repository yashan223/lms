/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role, AttendanceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET: Attendance Tracker data (Admin Only)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json(
        { error: "Forbidden: Attendance tracker is restricted to administrators only." },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const requestedEventId = searchParams.get("eventId");
    const requestedCourseId = searchParams.get("courseId");
    const requestedRole = searchParams.get("role"); // "STUDENT" | "TUTOR" | null
    const requestedStatus = searchParams.get("status");
    const searchQuery = (searchParams.get("q") || "").trim().toLowerCase();

    // 1. SPECIFIC CLASS ROSTER VIEW
    if (requestedEventId) {
      const event = await prisma.event.findUnique({
        where: { id: requestedEventId },
        include: {
          course: {
            include: {
              tutor: { select: { id: true, name: true, email: true, tutorId: true } },
              enrollments: {
                include: {
                  user: { select: { id: true, name: true, email: true, avatar: true, studentId: true } },
                },
              },
            },
          },
          attendanceRecords: {
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true, studentId: true, role: true, tutorId: true } },
            },
          },
        },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      const attendanceMap = new Map<string, any>();
      for (const att of event.attendanceRecords) {
        attendanceMap.set(att.userId, att);
      }

      const enrolledStudents = (event.course?.enrollments || []).map((enr) => {
        const student = enr.user;
        const record = attendanceMap.get(student.id);
        const isPast = new Date(event.dueDate) < new Date();
        const status = record ? record.status : isPast ? "ABSENT" : "SCHEDULED";

        return {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          studentAvatar: student.avatar,
          studentRegId: student.studentId,
          status,
          joinedAt: record?.joinedAt || null,
          durationMinutes: record?.durationMinutes || 0,
          markedBy: record?.markedBy || "PENDING",
          notes: record?.notes || "",
          attendanceId: record?.id || null,
        };
      });

      // Also include any guest attendees who joined
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
          tutorEmail: event.course?.tutor?.email || "",
          tutorId: event.course?.tutor?.id || "",
          tutorRegId: event.course?.tutor?.tutorId || "",
          meetingLink: event.meetingLink,
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

    // 2. OVERALL ATTENDANCE LOGS (STUDENTS & TUTORS)
    const whereClause: any = {};
    if (requestedCourseId) {
      whereClause.courseId = requestedCourseId;
    }
    if (requestedRole && (requestedRole === "STUDENT" || requestedRole === "TUTOR")) {
      whereClause.userRole = requestedRole as Role;
    }
    if (requestedStatus) {
      whereClause.status = requestedStatus as AttendanceStatus;
    }

    const attendanceRecords = await prisma.classAttendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            studentId: true,
            tutorId: true,
          },
        },
        event: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                tutor: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        trial: {
          include: {
            tutor: { select: { id: true, name: true, email: true } },
            course: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    // Also get all scheduled events for session view
    const allEvents = await prisma.event.findMany({
      include: {
        course: {
          select: {
            id: true,
            title: true,
            tutor: { select: { id: true, name: true } },
          },
        },
        attendanceRecords: {
          select: {
            id: true,
            userRole: true,
            status: true,
            joinedAt: true,
            userId: true,
          },
        },
      },
      orderBy: { dueDate: "desc" },
      take: 100,
    });

    const sessions = allEvents.map((ev) => {
      const studentAtt = ev.attendanceRecords.filter((a) => a.userRole === Role.STUDENT);
      const tutorAtt = ev.attendanceRecords.find((a) => a.userRole === Role.TUTOR);
      return {
        eventId: ev.id,
        title: ev.title,
        dueDate: ev.dueDate,
        courseTitle: ev.course?.title || "Class",
        courseId: ev.courseId,
        tutorName: ev.course?.tutor?.name || "Tutor",
        meetingLink: ev.meetingLink || `/api/meetings/join?eventId=${ev.id}`,
        status: ev.status,
        tutorStatus: tutorAtt ? tutorAtt.status : (new Date(ev.dueDate) < new Date() ? "ABSENT" : "SCHEDULED"),
        tutorJoinedAt: tutorAtt?.joinedAt || null,
        studentAttendeesCount: studentAtt.filter((s) => s.status === "PRESENT" || s.status === "LATE").length,
      };
    });

    // Overall stats
    const totalRecords = await prisma.classAttendance.count();
    const studentPresent = await prisma.classAttendance.count({
      where: { userRole: Role.STUDENT, status: { in: ["PRESENT", "LATE"] } },
    });
    const tutorPresent = await prisma.classAttendance.count({
      where: { userRole: Role.TUTOR, status: { in: ["PRESENT", "LATE"] } },
    });
    const totalLiveSessions = allEvents.length;

    // Filter by search query if present
    const filteredRecords = attendanceRecords
      .map((r) => ({
        id: r.id,
        userName: r.user.name,
        userEmail: r.user.email,
        userRole: r.userRole,
        regId: r.user.studentId || r.user.tutorId || r.user.id.slice(-6),
        classTitle: r.event?.title || (r.trial ? `1-on-1: ${r.trial.course?.title || "Consultation"}` : "Online Class"),
        courseTitle: r.event?.course?.title || r.trial?.course?.title || "Curriculum",
        courseId: r.courseId || r.event?.courseId || r.trial?.courseId || null,
        tutorName: r.event?.course?.tutor?.name || r.trial?.tutor?.name || "Faculty Tutor",
        status: r.status,
        joinedAt: r.joinedAt,
        durationMinutes: r.durationMinutes || 0,
        markedBy: r.markedBy,
        notes: r.notes || "",
        createdAt: r.createdAt,
      }))
      .filter((r) => {
        if (!searchQuery) return true;
        return (
          r.userName.toLowerCase().includes(searchQuery) ||
          r.userEmail.toLowerCase().includes(searchQuery) ||
          r.regId.toLowerCase().includes(searchQuery) ||
          r.classTitle.toLowerCase().includes(searchQuery) ||
          r.courseTitle.toLowerCase().includes(searchQuery) ||
          r.tutorName.toLowerCase().includes(searchQuery)
        );
      });

    return NextResponse.json({
      stats: {
        totalRecords,
        studentPresent,
        tutorPresent,
        totalLiveSessions,
      },
      records: filteredRecords,
      sessions,
    });
  } catch (error: any) {
    console.error("[Attendance API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch attendance records" },
      { status: 500 }
    );
  }
}

// POST: Update Attendance (Admin Only)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json(
        { error: "Forbidden: Attendance updates are restricted to administrators only." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { eventId, updates, attendanceId, userId, status, notes, durationMinutes } = body;

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
            markedBy: "MANUAL_ADMIN",
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
            markedBy: "MANUAL_ADMIN",
          },
          create: {
            eventId,
            userId,
            userRole: targetUser?.role || Role.STUDENT,
            status: validStatus,
            notes: notes || "Manually marked by admin",
            durationMinutes: durationMinutes || 0,
            markedBy: "MANUAL_ADMIN",
          },
        });
      }

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
            markedBy: "MANUAL_ADMIN",
          },
          create: {
            eventId,
            userId: item.userId,
            userRole: targetUser?.role || Role.STUDENT,
            status: validStatus,
            notes: item.notes || "Batch marked by admin",
            durationMinutes: item.durationMinutes || 0,
            markedBy: "MANUAL_ADMIN",
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
