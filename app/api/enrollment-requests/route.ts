import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { broadcastLMSEvent } from "@/lib/events";
import { createBBBMeeting, getUniversalJoinLink, isBigBlueButtonConfigured } from "@/lib/bigbluebutton";
import { getSafeMeetingLink } from "@/lib/utils";
import { generateUniqueClassCode } from "@/lib/class-id";
import { mergeConsecutiveSlots } from "@/lib/scheduling";
import { EventType, EventStatus, Role, EnrollmentRequestStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const user = auth.user;
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get("status");

    let whereClause: any = {};

    if (user.role === Role.TUTOR || (user.role as any) === "INSTRUCTOR") {
      whereClause.tutorId = user.id;
    } else if (user.role === Role.STUDENT) {
      whereClause.studentId = user.id;
    } else if (user.role === Role.ADMIN) {
      // Admin can view all
    }

    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter as EnrollmentRequestStatus;
    }

    const requests = await prisma.classEnrollmentRequest.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
            timezone: true,
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            headline: true,
            timezone: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            subjectCode: true,
            thumbnail: true,
            price: true,
            olPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingCount = requests.filter((r) => r.status === EnrollmentRequestStatus.PENDING).length;
    const confirmedCount = requests.filter((r) => r.status === EnrollmentRequestStatus.CONFIRMED).length;

    return NextResponse.json({
      requests,
      counts: {
        total: requests.length,
        pending: pendingCount,
        confirmed: confirmedCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/enrollment-requests error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch enrollment requests." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: "Please log in to submit your enrollment request." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      courseId,
      tutorId: propTutorId,
      classType,
      hoursPerWeek,
      duration,
      selectedSlots,
      notes,
    } = body;

    if (!courseId) {
      return NextResponse.json({ error: "Class/Course ID is required." }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
            timezone: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const resolvedTutorId = propTutorId || course.tutorId;
    if (!resolvedTutorId) {
      return NextResponse.json({ error: "No tutor assigned to this course." }, { status: 400 });
    }

    const validClassTypes = ["Theory only", "Paper only", "Theory and Paper mix"];
    const chosenClassType = validClassTypes.includes(classType) ? classType : "Theory and Paper mix";

    const parsedHours = Math.max(1, Math.min(10, parseInt(hoursPerWeek || "1", 10)));
    const validDurations = ["Repeat for 1 month", "Repeat for 2 months"];
    const chosenDuration = validDurations.includes(duration) ? duration : "Repeat for 1 month";
    const recurrenceWeeks = chosenDuration === "Repeat for 2 months" ? 8 : 4;
    const tokensRequired = parsedHours * recurrenceWeeks;

    if (!Array.isArray(selectedSlots) || selectedSlots.length === 0) {
      return NextResponse.json(
        { error: "Please select your preferred 1-hour slots on the calendar." },
        { status: 400 }
      );
    }

    if (selectedSlots.length < parsedHours) {
      return NextResponse.json(
        {
          error: `You selected ${selectedSlots.length} slot(s), but requested ${parsedHours} hour(s) per week. Please select at least ${parsedHours} favorable slots.`,
        },
        { status: 400 }
      );
    }

    // 1. Upfront Token Escrow Verification: (Hours/week) × (Weeks)
    const user = auth.user;
    let wallet = await prisma.tokenWallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await prisma.tokenWallet.create({
        data: { userId: user.id, balance: 0, frozenBalance: 0 },
      });
    }

    if (user.role !== "ADMIN" && wallet.balance < tokensRequired) {
      return NextResponse.json(
        {
          error: `Insufficient tokens in your academic wallet. You have ${wallet.balance} Tokens, but this enrollment requires ${tokensRequired} Tokens (${parsedHours} hrs/wk × ${recurrenceWeeks} weeks).`,
          required: tokensRequired,
          available: wallet.balance,
          code: "INSUFFICIENT_TOKENS",
        },
        { status: 400 }
      );
    }

    // 2. Transaction: Deduct tokens into Escrow (Freeze) & Create Enrollment Request
    const escrowResult = await prisma.$transaction(async (tx) => {
      let tokensFrozen = 0;
      if (user.role !== "ADMIN" && tokensRequired > 0) {
        tokensFrozen = tokensRequired;
        await tx.tokenWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: tokensRequired },
            frozenBalance: { increment: tokensRequired },
          },
        });

        await tx.tokenTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -tokensRequired,
            type: "ESCROW_LOCK",
            description: `Escrow Hold: ${tokensRequired} Tokens frozen for permanent enrollment in ${course.title} (${parsedHours} hrs/wk × ${recurrenceWeeks} wks)`,
            referenceId: course.id,
          },
        });
      }

      const createdReq = await tx.classEnrollmentRequest.create({
        data: {
          studentId: user.id,
          tutorId: resolvedTutorId,
          courseId: course.id,
          classType: chosenClassType,
          hoursPerWeek: parsedHours,
          duration: chosenDuration,
          tokensInEscrow: tokensFrozen,
          recurrenceDurationWeeks: recurrenceWeeks,
          selectedSlots: selectedSlots,
          notes: notes ? String(notes).trim() : null,
          status: EnrollmentRequestStatus.PENDING,
        },
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
          tutor: {
            select: { id: true, name: true, email: true },
          },
          course: {
            select: { id: true, title: true, slug: true },
          },
        },
      });

      return createdReq;
    });

    const newRequest = escrowResult;

    // Notify Tutor
    await prisma.notification.create({
      data: {
        userId: resolvedTutorId,
        title: "📚 New Permanent Class Enrollment Request",
        message: `${user.name} requested permanent enrollment in "${course.title}" (${parsedHours} hrs/week, ${chosenClassType}). Please review their favorable slots and finalize the schedule.`,
        type: "INFO",
        link: "/tutor?tab=enrollments",
      },
    });

    // Notify Student
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "📋 Enrollment Schedule Request Sent",
        message: `Your scheduling request for "${course.title}" (${parsedHours} hrs/week, ${chosenDuration}) was sent to ${course.tutor?.name || "your tutor"}. They will confirm your final schedule shortly.`,
        type: "INFO",
        link: "/dashboard",
      },
    });

    broadcastLMSEvent("ENROLLMENT_REQUESTS_CHANGED");
    broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: resolvedTutorId });
    broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: user.id });

    return NextResponse.json({
      success: true,
      message: `Enrollment request submitted for ${course.title}! Your tutor will review and finalize your schedule.`,
      request: newRequest,
    });
  } catch (error: any) {
    console.error("POST /api/enrollment-requests error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit enrollment request." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const { action, requestId, acceptedSlots, rejectionReason } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required." }, { status: 400 });
    }

    const enrollmentRequest = await prisma.classEnrollmentRequest.findUnique({
      where: { id: requestId },
      include: {
        student: true,
        tutor: true,
        course: true,
      },
    });

    if (!enrollmentRequest) {
      return NextResponse.json({ error: "Enrollment request not found." }, { status: 404 });
    }

    const user = auth.user;
    const isTutor = enrollmentRequest.tutorId === user.id || enrollmentRequest.course.tutorId === user.id;
    const isAdmin = user.role === Role.ADMIN;

    if (!isTutor && !isAdmin) {
      return NextResponse.json(
        { error: "You are not authorized to respond to this enrollment request." },
        { status: 403 }
      );
    }

    if (action === "accept" || action === "confirm") {
      if (!Array.isArray(acceptedSlots)) {
        return NextResponse.json(
          { error: "Accepted slots must be provided." },
          { status: 400 }
        );
      }

      // Step 3 enforcement: Tutor must accept the EXACT number of slots required by Hours Per Week
      const requiredSlotsCount = enrollmentRequest.hoursPerWeek;
      if (acceptedSlots.length !== requiredSlotsCount) {
        return NextResponse.json(
          {
            error: `Please select exactly ${requiredSlotsCount} slot(s) as requested by the student (you selected ${acceptedSlots.length}).`,
          },
          { status: 400 }
        );
      }

      // Calculate number of recurrence weeks from student's selected duration
      let numWeeks = enrollmentRequest.recurrenceDurationWeeks || 4;
      if (enrollmentRequest.duration === "Repeat for 2 months") {
        numWeeks = 8;
      } else if (enrollmentRequest.duration === "Continuous") {
        numWeeks = 12;
      }

      const student = enrollmentRequest.student;
      const course = enrollmentRequest.course;
      const tokensInEscrow = enrollmentRequest.tokensInEscrow || 0;

      // Perform transaction: permanently consume escrowed tokens, ensure enrollment, update request, generate recurring events
      const result = await prisma.$transaction(async (tx) => {
        // 1. Permanently deduct frozen escrow tokens from student wallet
        let studentWallet = await tx.tokenWallet.findUnique({
          where: { userId: student.id },
        });

        if (tokensInEscrow > 0 && studentWallet) {
          await tx.tokenWallet.update({
            where: { id: studentWallet.id },
            data: {
              frozenBalance: { decrement: tokensInEscrow },
            },
          });

          await tx.tokenTransaction.create({
            data: {
              walletId: studentWallet.id,
              amount: -tokensInEscrow,
              type: "ESCROW_RELEASE",
              description: `Permanent Enrollment Confirmed: ${tokensInEscrow} Escrowed Tokens permanently consumed for ${course.title} (${enrollmentRequest.hoursPerWeek} hrs/wk × ${numWeeks} wks)`,
              referenceId: enrollmentRequest.id,
            },
          });
        }

        // 2. Ensure Enrollment record exists
        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: student.id,
              courseId: course.id,
            },
          },
        });

        if (!existingEnrollment) {
          await tx.enrollment.create({
            data: {
              userId: student.id,
              courseId: course.id,
            },
          });
        }

        // 3. Mark enrollment request as CONFIRMED with accepted slots and clear escrow
        const updatedRequest = await tx.classEnrollmentRequest.update({
          where: { id: enrollmentRequest.id },
          data: {
            status: EnrollmentRequestStatus.CONFIRMED,
            tokensInEscrow: 0,
            acceptedSlots: acceptedSlots,
          },
        });

        // 3. Generate recurring sessions on both calendars weekly
        // If consecutive slots are selected (e.g. 1:30-2:30 and 2:30-3:30), merge them into a single 2-hour class session
        const createdEvents = [];
        const allocatedClassCodes = new Set<string>();

        const timezoneForFormatting = student.timezone || enrollmentRequest.tutor.timezone || "Asia/Colombo";
        const mergedSlots = mergeConsecutiveSlots(
          acceptedSlots,
          timezoneForFormatting,
          enrollmentRequest.tutor.timezone || "Asia/Colombo"
        );

        for (const slotGroup of mergedSlots) {
          const baseStart = new Date(slotGroup.startTime);
          const durationHours = slotGroup.durationHours || 1;
          const durationMinutes = slotGroup.durationMinutes || Math.round(durationHours * 60);

          for (let week = 0; week < numWeeks; week++) {
            const sessionStart = new Date(baseStart.getTime() + week * 7 * 24 * 60 * 60 * 1000);
            const sessionEnd = new Date(sessionStart.getTime() + durationMinutes * 60 * 1000);

            const sessionClassCode = await generateUniqueClassCode(undefined, tx, allocatedClassCodes);
            allocatedClassCodes.add(sessionClassCode);
            const isMultiHour = durationHours > 1;
            const title = isMultiHour
              ? `${course.title} - ${enrollmentRequest.classType} (${durationHours}-Hour Class)`
              : `${course.title} - ${enrollmentRequest.classType}`;

            const desc = [
              `📚 ${durationHours}-Hour Permanent Class Session (${enrollmentRequest.classType})`,
              `Duration: ${durationHours} Hour${durationHours > 1 ? "s" : ""} (${durationMinutes} Minutes)`,
              `Tokens: ${durationHours} Token${durationHours > 1 ? "s" : ""}`,
              `Class ID: ${sessionClassCode}`,
              `Curriculum: ${course.title} ${course.subjectCode ? `(${course.subjectCode})` : ""}`,
              `Student: ${student.name} (${student.email})`,
              `Tutor: ${enrollmentRequest.tutor.name}`,
              `Duration Track: ${enrollmentRequest.duration} (Session ${week + 1} of ${numWeeks})`,
              `Enrollment Request ID: ${enrollmentRequest.id}`,
            ].join("\n");

            const ev = await tx.event.create({
              data: {
                classCode: sessionClassCode,
                title,
                description: desc,
                dueDate: sessionStart,
                startedAt: null,
                endedAt: null,
                actualStartTime: null,
                actualEndTime: null,
                type: EventType.LIVE_SEMINAR,
                status: EventStatus.SCHEDULED,
                approvalStatus: "APPROVED",
                courseId: course.id,
                userId: student.id,
                requestedBy: enrollmentRequest.tutorId,
                meetingLink: `/api/meetings/join?classCode=${sessionClassCode}`,
                meetingSpaceId: null,
                timezone: student.timezone || enrollmentRequest.tutor.timezone || "Asia/Colombo",
                reminderSent: false,
                tokenDeducted: true,
                tokenDeductedAt: new Date(),
                enrollmentRequestId: enrollmentRequest.id,
              },
            });

            // Set definitive BigBlueButton event room link and space ID
            const updatedEv = await tx.event.update({
              where: { id: ev.id },
              data: {
                meetingLink: `/api/meetings/join?eventId=${ev.id}`,
                meetingSpaceId: `class-${ev.id}`,
              },
            });

            createdEvents.push(updatedEv);
          }
        }

        const hasMergedSlots = mergedSlots.some((s) => s.isMerged);
        const sessionDescriptor = hasMergedSlots
          ? `${createdEvents.length} weekly sessions (including merged 2-hour continuous classes)`
          : `${createdEvents.length} weekly 1-hour sessions`;

        // 4. In-App Notification to Student
        await tx.notification.create({
          data: {
            userId: student.id,
            title: "🎉 Enrollment Confirmed & Schedule Finalized!",
            message: `${enrollmentRequest.tutor.name} accepted your enrollment in "${course.title}". ${sessionDescriptor} have been populated on your study calendar.`,
            type: "SUCCESS",
            link: "/dashboard",
          },
        });

        // 5. In-App Notification to Tutor
        await tx.notification.create({
          data: {
            userId: enrollmentRequest.tutorId,
            title: "✓ Permanent Schedule Finalized",
            message: `You finalized ${student.name}'s schedule for "${course.title}". ${sessionDescriptor} are now scheduled on your teaching roster.`,
            type: "SUCCESS",
            link: "/tutor?tab=classes",
          },
        });

        return { updatedRequest, createdEvents };
      });

      broadcastLMSEvent("ENROLLMENT_REQUESTS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: student.id });
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: enrollmentRequest.tutorId });

      return NextResponse.json({
        success: true,
        message: `Successfully accepted enrollment! ${result.createdEvents.length} weekly sessions scheduled.`,
        request: result.updatedRequest,
        eventsCount: result.createdEvents.length,
      });
    }

    if (action === "reject" || action === "decline" || action === "cancel" || action === "expire") {
      const reason = rejectionReason
        ? String(rejectionReason).trim()
        : action === "cancel"
        ? "Enrollment request was cancelled by the student."
        : action === "expire"
        ? "Enrollment request expired without tutor confirmation."
        : "Schedule could not be accommodated at this time.";

      const newStatus =
        action === "cancel"
          ? EnrollmentRequestStatus.CANCELLED
          : action === "expire"
          ? (EnrollmentRequestStatus as any).EXPIRED || EnrollmentRequestStatus.REJECTED
          : EnrollmentRequestStatus.REJECTED;

      const tokensInEscrow = enrollmentRequest.tokensInEscrow || 0;

      const updatedRequest = await prisma.$transaction(async (tx) => {
        // Refund frozen escrow tokens back to student active balance
        if (tokensInEscrow > 0) {
          const studentWallet = await tx.tokenWallet.findUnique({
            where: { userId: enrollmentRequest.studentId },
          });

          if (studentWallet) {
            await tx.tokenWallet.update({
              where: { id: studentWallet.id },
              data: {
                balance: { increment: tokensInEscrow },
                frozenBalance: { decrement: tokensInEscrow },
              },
            });

            await tx.tokenTransaction.create({
              data: {
                walletId: studentWallet.id,
                amount: tokensInEscrow,
                type: "REFUND",
                description: `Escrow Refund: ${tokensInEscrow} Tokens refunded to active balance (${
                  action === "cancel"
                    ? "Request Cancelled"
                    : action === "expire"
                    ? "Request Expired"
                    : "Declined by Tutor"
                } for ${enrollmentRequest.course.title})`,
                referenceId: enrollmentRequest.id,
              },
            });
          }
        }

        return await tx.classEnrollmentRequest.update({
          where: { id: enrollmentRequest.id },
          data: {
            status: newStatus,
            tokensInEscrow: 0,
            rejectionReason: reason,
          },
        });
      });

      // Notify Student
      await prisma.notification.create({
        data: {
          userId: enrollmentRequest.studentId,
          title:
            action === "cancel"
              ? "Enrollment Request Cancelled"
              : action === "expire"
              ? "Enrollment Request Expired"
              : "Enrollment Request Declined",
          message:
            tokensInEscrow > 0
              ? `${enrollmentRequest.course.title}: ${reason}. ${tokensInEscrow} Tokens have been refunded to your active wallet balance.`
              : `${enrollmentRequest.course.title}: ${reason}.`,
          type: action === "cancel" ? "INFO" : "WARNING",
          link: `/classes/${enrollmentRequest.course.slug}`,
        },
      });

      broadcastLMSEvent("ENROLLMENT_REQUESTS_CHANGED");
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: enrollmentRequest.studentId });
      broadcastLMSEvent("USERS_CHANGED");

      return NextResponse.json({
        success: true,
        message:
          tokensInEscrow > 0
            ? `Enrollment request ${action}ed. ${tokensInEscrow} Tokens refunded to student wallet.`
            : `Enrollment request ${action}ed.`,
        request: updatedRequest,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/enrollment-requests error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update enrollment request." },
      { status: 500 }
    );
  }
}
