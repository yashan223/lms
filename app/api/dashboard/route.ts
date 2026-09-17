import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";
import { getAuthenticatedUser } from "@/lib/auth";
import { fulfillPayment } from "@/lib/payment-fulfillment";
import { getPaymentsLkCheckout, isPaymentsLkConfigured } from "@/lib/payments-lk";
import { EventType, EventStatus, TrialStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    const searchParams = request.nextUrl.searchParams;
    const roleParam = searchParams.get("role");
    const emailCookie = request.cookies.get("edupulse_user_email")?.value;
    const roleCookie = request.cookies.get("edupulse_user_role")?.value;

    let targetWhere: any = {};
    if (auth.user) {
      targetWhere = { id: auth.user.id };
    } else if (emailCookie) {
      targetWhere = { email: emailCookie.toLowerCase() };
    } else if (roleParam) {
      targetWhere = { role: roleParam };
    } else if (roleCookie) {
      targetWhere = { role: roleCookie };
    } else {
      targetWhere = { role: "STUDENT" };
    }

    let user = await prisma.user.findFirst({
      where: targetWhere,
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
        badges: {
          orderBy: { awardedAt: "desc" },
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
          badges: {
            orderBy: { awardedAt: "desc" },
          },
          events: {
            orderBy: { dueDate: "asc" },
          },
        },
      });
    }

    if (user) {
      // Auto-reconcile: ensure any successful payments have credited the wallet and created transaction rows
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

      // Also check recent PENDING payments in Payments.lk in case webhook was blocked/delayed
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

    // For students, ensure all confirmed 1-on-1 trials are included in timeline events
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
          course: true,
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      for (const trial of confirmedTrials) {
        // Link studentId on trial if missing
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
          const courseTitle = trial.course?.title || "London A/L Tutorial Masterclass";
          const courseCode = trial.course?.subjectCode || "";
          const eventTitle = `1-on-1 Trial: ${courseTitle} (${trial.studentName || user.name})`;
          const link = trial.meetingLink || "https://meet.google.com/new";
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
              courseId: trial.courseId || null,
              userId: user.id,
              requestedBy: trial.tutorId || null,
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

          timelineEvents.push(syncedEvent);
        }
      }

      // Attach trialId to timeline events matching confirmed trials
      timelineEvents = timelineEvents.map((ev: any) => {
        const matchingTrial = confirmedTrials.find(
          (t) =>
            (ev.description && ev.description.includes(t.id)) ||
            (t.courseId && ev.courseId === t.courseId)
        );
        return matchingTrial ? { ...ev, trialId: matchingTrial.id } : ev;
      });

      // Re-sort timelineEvents by dueDate ascending
      timelineEvents.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    return NextResponse.json({
      user,
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
    const body = await request.json();
    const { action } = body;

    if (action === "create_event") {
      const roleCookie = request.cookies.get("edupulse_user_role")?.value;
      if (roleCookie === "STUDENT") {
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

      await prisma.event.delete({
        where: { id: eventId },
      });

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Event deleted successfully." });
    }

    if (action === "add_private_file") {
      const auth = await getAuthenticatedUser(request);
      const { fileName, fileSize, fileType, fileUrl, userId } = body;
      const targetUserId = auth.user ? auth.user.id : userId;

      if (!targetUserId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
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
      const auth = await getAuthenticatedUser(request);
      const { fileId } = body;

      const existing = await prisma.privateFile.findUnique({ where: { id: fileId } });
      if (existing) {
        if (auth.user && auth.user.role !== "ADMIN" && existing.userId !== auth.user.id) {
          return NextResponse.json({ error: "Forbidden: You cannot delete another user's file" }, { status: 403 });
        }

        if (existing.fileUrl && existing.fileUrl.startsWith("/api/files/")) {
          const fileKey = existing.fileUrl.replace("/api/files/", "");
          await deleteStorageFile(fileKey);
        }
        await prisma.privateFile.delete({ where: { id: fileId } });
        broadcastLMSEvent("MATERIALS_CHANGED");
      }
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
      if (auth.user && auth.user.role === "STUDENT") {
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

      const { eventId, scheduledDate, reason } = body;
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
        return NextResponse.json({ error: "Session event not found." }, { status: 404 });
      }

      let updatedDesc = existing.description || "";
      if (reason && reason.trim()) {
        updatedDesc = `${updatedDesc}\n\n[Rescheduled by Student: ${reason.trim()}]`.trim();
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          dueDate: parsedDate,
          description: updatedDesc,
          status: "SCHEDULED",
          endedAt: null,
        },
        include: {
          course: true,
          user: true,
        },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Class session rescheduled successfully.",
        event: updatedEvent,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Dashboard POST error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
