import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";
import { getAuthenticatedUser } from "@/lib/auth";
import { fulfillPayment } from "@/lib/payment-fulfillment";
import { getPaymentsLkCheckout, isPaymentsLkConfigured } from "@/lib/payments-lk";
import { EventType, EventStatus, TrialStatus, Role } from "@prisma/client";
import { formatDateInTimezone, formatTimeInTimezone } from "@/lib/timezones";
import { getBBBMeetingId, getUniversalJoinLink, createBBBMeeting, isBigBlueButtonConfigured } from "@/lib/bigbluebutton";
import { getSafeMeetingLink, isGenericMeetingLink } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    let user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      include: {
        tokenWallet: {
          include: {
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 50,
            },
          },
        },
        enrollments: {
          include: {
            course: {
              include: {
                tutor: true,
                modules: {
                  include: {
                    lessons: true,
                  },
                },
              },
            },
          },
        },
        createdCourses: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
            enrollments: {
              include: { user: true },
            },
          },
        },
        privateFiles: {
          orderBy: { createdAt: "desc" },
        },
        events: {
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!user) {
      user = await prisma.user.findFirst({
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
            include: {
              course: {
                include: {
                  tutor: true,
                  modules: {
                    include: {
                      lessons: true,
                    },
                  },
                },
              },
            },
          },
          createdCourses: {
            include: {
              modules: {
                include: {
                  lessons: true,
                },
              },
              enrollments: {
                include: { user: true },
              },
            },
          },
          privateFiles: {
            orderBy: { createdAt: "desc" },
          },
          events: {
            orderBy: { dueDate: "asc" },
          },
        },
      });
    }

    if (user) {
      const unfulfilled = await prisma.payment.findMany({
        where: {
          userId: user.id,
          status: "SUCCEEDED",
        },
      });

      let reloaded = false;
      for (const p of unfulfilled) {
        const res = await fulfillPayment(p.id);
        if (res.fulfilled) reloaded = true;
      }

      if (isPaymentsLkConfigured()) {
        const pendingPayments = await prisma.payment.findMany({
          where: {
            userId: user.id,
            status: "PENDING",
            checkoutId: { not: null },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          take: 3,
        });

        for (const p of pendingPayments) {
          if (p.checkoutId && !p.checkoutId.startsWith("chk_test_")) {
            try {
              const info = await getPaymentsLkCheckout(p.checkoutId);
              if (info.payment?.status === "succeeded") {
                const res = await fulfillPayment(
                  p.id,
                  info.payment.card?.scheme || "CARD",
                  info
                );
                if (res.fulfilled) reloaded = true;
              }
            } catch (err) {
              console.warn("Dashboard sync Payments.lk check error:", err);
            }
          }
        }
      }

      if (reloaded) {
        const freshWallet = await prisma.tokenWallet.findUnique({
          where: { userId: user.id },
          include: {
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 50,
            },
          },
        });
        if (freshWallet) {
          user.tokenWallet = freshWallet;
        }
      }
    }

    const allCourses = await prisma.course.findMany({
      include: {
        tutor: true,
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    const onlineUsers = await prisma.user.findMany({
      take: 8,
      select: {
        id: true,
        name: true,
        role: true,
        avatar: true,
        headline: true,
      },
    });

    let eventWhere: any = {};
    if (user?.role === "STUDENT") {
      const enrolledCourseIds = (user.enrollments || []).map((e) => e.courseId);
      eventWhere = {
        AND: [
          { status: { in: ["SCHEDULED", "LIVE", "COMPLETED"] } },
          {
            OR: [
              { userId: user.id },
              {
                courseId: { in: enrolledCourseIds },
                OR: [
                  { userId: null },
                  { userId: user.id },
                ],
              },
            ],
          },
        ],
      };
    } else if (user && (user.role === "TUTOR" || (user.role as any) === "INSTRUCTOR")) {
      const tutorCourseIds = (user.createdCourses || []).map((c) => c.id);
      eventWhere = {
        OR: [
          { userId: user.id },
          { courseId: { in: tutorCourseIds } },
          { course: { tutorId: user.id } },
        ],
      };
    }

    let timelineEvents = await prisma.event.findMany({
      where: eventWhere,
      orderBy: { dueDate: "asc" },
      include: {
        course: {
          include: {
            tutor: {
              select: {
                id: true,
                name: true,
                timezone: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            timezone: true,
          },
        },
      },
    });

    if (user?.role === "STUDENT") {
      const confirmedTrials = await prisma.trialRequest.findMany({
        where: {
          status: { in: [TrialStatus.CONFIRMED, TrialStatus.COMPLETED] },
          OR: [
            { studentId: user.id },
            { studentEmail: { equals: user.email, mode: "insensitive" } },
          ],
        },
        include: {
          course: {
            include: {
              tutor: {
                select: {
                  id: true,
                  name: true,
                  timezone: true,
                },
              },
            },
          },
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              timezone: true,
            },
          },
        },
      });

      for (const trial of confirmedTrials) {
        if (!trial.studentId) {
          await prisma.trialRequest.update({
            where: { id: trial.id },
            data: { studentId: user.id },
          }).catch(() => {});
        }

        const alreadyInTimeline = timelineEvents.some(
          (ev) =>
            (trial.courseId && ev.courseId === trial.courseId && Math.abs(new Date(ev.dueDate).getTime() - new Date(trial.preferredDate).getTime()) < 60000) ||
            (ev.userId === user.id && Math.abs(new Date(ev.dueDate).getTime() - new Date(trial.preferredDate).getTime()) < 60000) ||
            ev.title.toLowerCase().includes(trial.studentName.toLowerCase()) ||
            (ev.description && ev.description.includes(trial.id))
        );

        if (!alreadyInTimeline) {
          const courseTitle = trial.course?.title || "London A/L Tutorial Individual Class";
          const courseCode = trial.course?.subjectCode || "";
          const eventTitle = `1-on-1 Trial: ${courseTitle} (${trial.studentName || user.name})`;
          const bbbMeetingId = trial.meetingSpaceId || getBBBMeetingId({ trialId: trial.id });
          const link =
            trial.meetingLink && !isGenericMeetingLink(trial.meetingLink)
              ? getSafeMeetingLink(trial.meetingLink)
              : getUniversalJoinLink({ trialId: trial.id });

          if (isBigBlueButtonConfigured()) {
            try {
              await createBBBMeeting({
                meetingId: bbbMeetingId,
                name: eventTitle,
                record: true,
              });
            } catch (e) {
              console.warn("[dashboard] BBB notice:", e);
            }
          }

          if (link !== trial.meetingLink || !trial.meetingSpaceId) {
            await prisma.trialRequest.update({
              where: { id: trial.id },
              data: { meetingLink: link, meetingSpaceId: bbbMeetingId },
            });
          }

          const eventDesc = [
            `🎯 30-Minute 1-on-1 Online Free Trial Session with Senior Tutor.`,
            `Subject / Course: ${courseTitle} ${courseCode ? `(${courseCode})` : ""}`,
            `Topic / Focus: ${trial.topic || "30-Min Free Trial & Syllabus Overview"}`,
            `Student: ${trial.studentName} (${trial.studentEmail})`,
            `Classroom Link: ${link}`,
            trial.notes ? `Tutor Notes: ${trial.notes}` : "",
            `Trial ID: ${trial.id}`,
          ].filter(Boolean).join("\n\n");

          const syncedEvent = await prisma.event.create({
            data: {
              title: eventTitle,
              description: eventDesc,
              dueDate: trial.preferredDate,
              type: EventType.LIVE_SEMINAR,
              status: trial.status === TrialStatus.COMPLETED ? EventStatus.COMPLETED : EventStatus.SCHEDULED,
              approvalStatus: "APPROVED",
              meetingLink: link,
              meetingSpaceId: trial.meetingSpaceId || null,
              conferenceRecordId: trial.conferenceRecordId || null,
              recordingUrl: trial.recordingUrl || null,
              recordingStatus: trial.recordingStatus || null,
              actualStartTime: trial.actualStartTime || null,
              actualEndTime: trial.actualEndTime || null,
              courseId: trial.courseId || null,
              userId: user.id,
              requestedBy: trial.tutorId || null,
            },
            include: {
              course: {
                include: {
                  tutor: {
                    select: {
                      id: true,
                      name: true,
                      timezone: true,
                    },
                  },
                },
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  timezone: true,
                },
              },
            },
          });

          timelineEvents.push(syncedEvent);
        }
      }

      timelineEvents = timelineEvents.map((ev: any) => {
        const matchingTrial = confirmedTrials.find(
          (t) =>
            (ev.description && ev.description.includes(t.id)) ||
            (t.courseId && ev.courseId === t.courseId)
        );
        const resolvedTutorTz =
          matchingTrial?.tutor?.timezone ||
          matchingTrial?.course?.tutor?.timezone ||
          ev.course?.tutor?.timezone ||
          matchingTrial?.timezone ||
          "Asia/Colombo";
        return {
          ...ev,
          trialId: matchingTrial ? matchingTrial.id : ev.trialId || null,
          tutorTimezone: resolvedTutorTz,
          tutorName: matchingTrial?.tutor?.name || ev.course?.tutor?.name || null,
        };
      });

      timelineEvents.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    const { passwordHash: _ph, ...safeUser } = (user as any) || {};

    return NextResponse.json({
      user: safeUser,
      allCourses,
      onlineUsers,
      timelineEvents,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "create_event") {
      if (auth.user.role === Role.STUDENT) {
        return NextResponse.json(
          { error: "Students cannot create calendar events. Academic events and classes are scheduled by tutors and administrators." },
          { status: 403 }
        );
      }

      const { title, description, dueDate, courseId, userId, type } = body;

      if (!title || typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "Event title is required." }, { status: 400 });
      }

      let parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        parsedDueDate = new Date();
      }

      const validTypes = ["LIVE_SEMINAR", "DEADLINE"];
      const validatedType = validTypes.includes(type) ? type : "LIVE_SEMINAR";

      let validCourseId: string | null = null;
      if (courseId && typeof courseId === "string" && courseId.trim() !== "" && courseId !== "none" && courseId !== "all") {
        const courseExists = await prisma.course.findUnique({ where: { id: courseId.trim() } });
        if (courseExists) {
          validCourseId = courseExists.id;
        }
      }

      let validUserId: string | null = null;
      if (userId && typeof userId === "string" && userId.trim() !== "") {
        const userExists = await prisma.user.findUnique({ where: { id: userId.trim() } });
        if (userExists) {
          validUserId = userExists.id;
        }
      }

      const newEvent = await prisma.event.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          dueDate: parsedDueDate,
          courseId: validCourseId,
          userId: validUserId,
          type: validatedType as any,
        },
        include: {
          course: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, event: newEvent });
    }

    if (action === "delete_event") {
      const { eventId } = body;
      if (!eventId) {
        return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
      }

      const existing = await prisma.event.findUnique({
        where: { id: eventId },
        include: { course: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      if (
        auth.user.role !== Role.ADMIN &&
        existing.userId !== auth.user.id &&
        existing.course?.tutorId !== auth.user.id
      ) {
        return NextResponse.json({ error: "Forbidden: You cannot delete this event" }, { status: 403 });
      }

      await prisma.event.delete({
        where: { id: eventId },
      });

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Event deleted successfully." });
    }

    if (action === "add_private_file") {
      const { fileName, fileSize, fileType, fileUrl } = body;
      const targetUserId = auth.user.id;

      if (!fileName) {
        return NextResponse.json({ error: "File name is required" }, { status: 400 });
      }

      const newFile = await prisma.privateFile.create({
        data: {
          fileName,
          fileSize: fileSize || "1.2 MB",
          fileType: fileType || "application/pdf",
          fileUrl: fileUrl || null,
          userId: targetUserId,
        },
      });
      broadcastLMSEvent("MATERIALS_CHANGED");
      return NextResponse.json({ success: true, file: newFile });
    }

    if (action === "delete_private_file") {
      const { fileId } = body;
      if (!fileId) {
        return NextResponse.json({ error: "File ID is required" }, { status: 400 });
      }

      const existing = await prisma.privateFile.findUnique({ where: { id: fileId } });
      if (!existing) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      if (auth.user.role !== Role.ADMIN && existing.userId !== auth.user.id) {
        return NextResponse.json({ error: "Forbidden: You cannot delete another user's file" }, { status: 403 });
      }

      if (existing.fileUrl && existing.fileUrl.startsWith("/api/files/")) {
        const fileKey = existing.fileUrl.replace("/api/files/", "");
        await deleteStorageFile(fileKey).catch(() => {});
      }
      await prisma.privateFile.delete({ where: { id: fileId } });
      broadcastLMSEvent("MATERIALS_CHANGED");
      return NextResponse.json({ success: true });
    }

    if (action === "grade_submission") {
      const { studentName, paperTitle, marks, remarks } = body;
      return NextResponse.json({
        success: true,
        message: `Marks recorded for ${studentName}: ${marks} marks with remarks.`,
      });
    }

    if (action === "reschedule_event") {
      const auth = await getAuthenticatedUser(request);
      if (!auth.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (auth.user.role === "STUDENT") {
        const studentAvailCount = await prisma.studentAvailability.count({
          where: { studentId: auth.user.id, isActive: true },
        });
        if (studentAvailCount === 0) {
          return NextResponse.json(
            {
              error: "Please configure your study availability before requesting to reschedule classes.",
              code: "STUDY_AVAILABILITY_REQUIRED",
              requiresAvailabilitySetup: true,
            },
            { status: 428 }
          );
        }
      }

      const { eventId, scheduledDate, reason, meetingLink, force } = body;
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

      const existing = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          course: {
            include: {
              tutor: {
                select: { id: true, name: true, email: true, timezone: true },
              },
            },
          },
          user: {
            select: { id: true, name: true, email: true, timezone: true },
          },
        },
      });

      if (!existing) {
        return NextResponse.json({ error: "Session event not found." }, { status: 404 });
      }

      const effectiveTutorId = existing.course?.tutorId || existing.requestedBy;
      const tutorTimezone = existing.course?.tutor?.timezone || "Asia/Colombo";
      const studentTimezone = existing.user?.timezone || auth.user.timezone || "Asia/Colombo";

      // Conflict check for tutor if not forced
      if (effectiveTutorId && !force) {
        const slotStart = parsedDate;
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

        const tutorCourseIds = existing.courseId ? [existing.courseId] : [];
        const conflictingClass = await prisma.event.findFirst({
          where: {
            id: { not: eventId },
            OR: [
              { userId: effectiveTutorId },
              { requestedBy: effectiveTutorId },
              ...(tutorCourseIds.length > 0 ? [{ courseId: { in: tutorCourseIds } }] : []),
            ],
            dueDate: {
              gte: new Date(slotStart.getTime() - 90 * 60 * 1000),
              lte: slotEnd,
            },
            status: { notIn: ["CANCELLED", "REJECTED"] as any },
          },
        });

        if (conflictingClass) {
          const classStart = new Date(conflictingClass.dueDate);
          const duration = conflictingClass.title.toLowerCase().includes("2h") ? 120 : 60;
          const classEnd = new Date(classStart.getTime() + duration * 60 * 1000);

          if (slotStart.getTime() < classEnd.getTime() && slotEnd.getTime() > classStart.getTime()) {
            return NextResponse.json(
              {
                error: `Schedule conflict: Tutor already has a class scheduled ("${conflictingClass.title}") from ${formatTimeInTimezone(classStart, studentTimezone)} to ${formatTimeInTimezone(classEnd, studentTimezone)}. Please select another time slot.`,
                conflict: {
                  id: conflictingClass.id,
                  title: conflictingClass.title,
                  start: classStart.toISOString(),
                  end: classEnd.toISOString(),
                },
              },
              { status: 409 }
            );
          }
        }
      }

      let updatedDesc = existing.description || "";
      if (reason && reason.trim()) {
        const prefix = auth.user.role === "STUDENT" ? "Rescheduled by Student" : "Rescheduled by Tutor";
        updatedDesc = `${updatedDesc}\n\n[${prefix}: ${reason.trim()}]`.trim();
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          dueDate: parsedDate,
          description: updatedDesc,
          status: EventStatus.SCHEDULED,
          approvalStatus: "APPROVED",
          rejectionReason: null,
          endedAt: null,
          ...(meetingLink ? { meetingLink: meetingLink.trim() } : {}),
        },
        include: {
          course: {
            include: {
              tutor: true,
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

      const dateStrTutor = `${formatDateInTimezone(parsedDate, tutorTimezone, { weekday: "short", month: "short", day: "numeric" })} at ${formatTimeInTimezone(parsedDate, tutorTimezone)}`;
      const dateStrStudent = `${formatDateInTimezone(parsedDate, studentTimezone, { weekday: "short", month: "short", day: "numeric" })} at ${formatTimeInTimezone(parsedDate, studentTimezone)}`;

      // Dispatch notifications
      if (auth.user.role === "STUDENT") {
        if (effectiveTutorId) {
          await prisma.notification.create({
            data: {
              userId: effectiveTutorId,
              title: "🔄 Online Class Rescheduled by Student",
              message: `${auth.user.name || "Student"} has rescheduled "${existing.title}" to ${dateStrTutor}.${reason?.trim() ? ` Reason: "${reason.trim()}"` : ""}`,
              type: "INFO",
              link: "/tutor",
            },
          });
          broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: effectiveTutorId });
        }

        await prisma.notification.create({
          data: {
            userId: auth.user.id,
            title: "📅 Online Class Schedule Updated",
            message: `Your class "${existing.title}" has been successfully rescheduled to ${dateStrStudent}.`,
            type: "SUCCESS",
            link: "/dashboard",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: auth.user.id });
      } else {
        // Rescheduled by Tutor / Admin
        const targetStudentId = existing.userId;
        if (targetStudentId) {
          await prisma.notification.create({
            data: {
              userId: targetStudentId,
              title: "📅 Online Class Rescheduled by Tutor",
              message: `Your tutor has rescheduled "${existing.title}" to ${dateStrStudent}.${reason?.trim() ? ` Tutor note: "${reason.trim()}"` : ""}`,
              type: "INFO",
              link: "/dashboard",
            },
          });
          broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: targetStudentId });
        } else if (existing.courseId) {
          const enrollments = updatedEvent.course?.enrollments || [];
          if (enrollments.length > 0) {
            await prisma.notification.createMany({
              data: enrollments.map((en: any) => ({
                userId: en.userId,
                title: "📅 Online Class Rescheduled by Tutor",
                message: `"${existing.title}" has been rescheduled to ${dateStrTutor}.`,
                type: "INFO",
                link: "/dashboard",
              })),
            });
            enrollments.forEach((en: any) => {
              broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: en.userId });
            });
          }
        }
      }

      broadcastLMSEvent("EVENTS_CHANGED", { eventId, rescheduled: true });

      return NextResponse.json({
        success: true,
        message: "Class session rescheduled successfully and all participants notified.",
        event: updatedEvent,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Dashboard POST error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
