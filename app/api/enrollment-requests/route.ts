import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { broadcastLMSEvent } from "@/lib/events";
import { createBBBMeeting, getUniversalJoinLink, isBigBlueButtonConfigured } from "@/lib/bigbluebutton";
import { getSafeMeetingLink } from "@/lib/utils";
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

    // Verify token wallet balance
    const user = auth.user;
    const isOL =
      (user as any).academicLevel === "OL" ||
      user.headline?.includes("O/L") ||
      user.headline?.includes("IGCSE");

    const coursePrice =
      isOL && (course as any).olPrice !== null && (course as any).olPrice !== undefined && Number((course as any).olPrice) >= 0
        ? Number((course as any).olPrice)
        : (course.price !== null && course.price !== undefined && !isNaN(Number(course.price))
            ? Number(course.price)
            : 0);

    const wallet = await prisma.tokenWallet.findUnique({
      where: { userId: user.id },
    });

    if (coursePrice > 0 && user.role !== "ADMIN" && (!wallet || wallet.balance < coursePrice)) {
      return NextResponse.json(
        {
          error: `Insufficient tokens in your academic wallet. You have ${wallet?.balance || 0} Tokens, but this course requires ${coursePrice} Tokens.`,
          required: coursePrice,
          available: wallet?.balance || 0,
        },
        { status: 400 }
      );
    }

    // Create the enrollment request
    const newRequest = await prisma.classEnrollmentRequest.create({
      data: {
        studentId: user.id,
        tutorId: resolvedTutorId,
        courseId: course.id,
        classType: chosenClassType,
        hoursPerWeek: parsedHours,
        duration: chosenDuration,
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
      let numWeeks = 4; // default 1 month
      if (enrollmentRequest.duration === "Repeat for 2 months") {
        numWeeks = 8;
      } else if (enrollmentRequest.duration === "Continuous") {
        numWeeks = 12; // Baseline 12 weeks for continuous
      }

      // Deduct tokens and enroll student if not enrolled already
      const student = enrollmentRequest.student;
      const course = enrollmentRequest.course;

      const isOL =
        (student as any).academicLevel === "OL" ||
        student.headline?.includes("O/L") ||
        student.headline?.includes("IGCSE");

      const coursePrice =
        isOL && (course as any).olPrice !== null && (course as any).olPrice !== undefined && Number((course as any).olPrice) >= 0
          ? Number((course as any).olPrice)
          : (course.price !== null && course.price !== undefined && !isNaN(Number(course.price))
              ? Number(course.price)
              : 0);

      // Perform transaction: update wallet, ensure enrollment, update request, generate recurring events
      const result = await prisma.$transaction(async (tx) => {
        // 1. Check & spend tokens if student not already enrolled
        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: student.id,
              courseId: course.id,
            },
          },
        });

        if (!existingEnrollment) {
          if (coursePrice > 0 && student.role !== Role.ADMIN) {
            let wallet = await tx.tokenWallet.findUnique({
              where: { userId: student.id },
            });
            if (!wallet || wallet.balance < coursePrice) {
              throw new Error(
                `Student has insufficient tokens (${wallet?.balance || 0} available, ${coursePrice} required).`
              );
            }
            await tx.tokenWallet.update({
              where: { id: wallet.id },
              data: { balance: { decrement: coursePrice } },
            });
            await tx.tokenTransaction.create({
              data: {
                walletId: wallet.id,
                amount: -coursePrice,
                type: "SPEND",
                description: `Permanent Enrollment: ${course.title} (${coursePrice} Tokens)`,
                referenceId: course.id,
              },
            });
          }

          await tx.enrollment.create({
            data: {
              userId: student.id,
              courseId: course.id,
            },
          });
        }

        // 2. Mark enrollment request as CONFIRMED with accepted slots
        const updatedRequest = await tx.classEnrollmentRequest.update({
          where: { id: enrollmentRequest.id },
          data: {
            status: EnrollmentRequestStatus.CONFIRMED,
            acceptedSlots: acceptedSlots,
          },
        });

        // 3. Generate recurring 1-hour sessions on both calendars weekly
        const createdEvents = [];
        for (const slot of acceptedSlots) {
          const baseStart = new Date(slot.startTime);

          for (let week = 0; week < numWeeks; week++) {
            const sessionStart = new Date(baseStart.getTime() + week * 7 * 24 * 60 * 60 * 1000);
            const sessionEnd = new Date(sessionStart.getTime() + 60 * 60 * 1000); // Strict 1-hour slot

            const title = `${course.title} - ${enrollmentRequest.classType}`;
            const desc = [
              `📚 1-Hour Permanent Class Session (${enrollmentRequest.classType})`,
              `Curriculum: ${course.title} ${course.subjectCode ? `(${course.subjectCode})` : ""}`,
              `Student: ${student.name} (${student.email})`,
              `Tutor: ${enrollmentRequest.tutor.name}`,
              `Duration Track: ${enrollmentRequest.duration} (Session ${week + 1} of ${numWeeks})`,
              `Enrollment Request ID: ${enrollmentRequest.id}`,
            ].join("\n");

            // Meeting Link
            let meetingLink: string | null = null;
            let meetingSpaceId: string | null = null;
            if (isBigBlueButtonConfigured()) {
              const bbbId = `class-${course.id}-${sessionStart.getTime()}`.substring(0, 50);
              const bbb = await createBBBMeeting({
                meetingId: bbbId,
                name: `${course.title} Live Class`,
                attendeePW: "student123",
                moderatorPW: "tutor123",
                welcome: `Welcome to ${course.title}! 1-on-1 permanent session.`,
                record: true,
                autoStartRecording: true,
              });
              if (bbb.success) {
                meetingLink = `/api/meetings/join?courseId=${course.id}&slot=${sessionStart.getTime()}`;
                meetingSpaceId = bbbId;
              }
            }
            if (!meetingLink) {
              meetingLink = `/api/meetings/join?courseId=${course.id}&slot=${sessionStart.getTime()}`;
            }

            const ev = await tx.event.create({
              data: {
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
                meetingLink: getSafeMeetingLink(meetingLink),
                meetingSpaceId,
                timezone: student.timezone || enrollmentRequest.tutor.timezone || "Asia/Colombo",
                reminderSent: false,
                enrollmentRequestId: enrollmentRequest.id,
              },
            });

            createdEvents.push(ev);
          }
        }

        // 4. In-App Notification to Student
        await tx.notification.create({
          data: {
            userId: student.id,
            title: "🎉 Enrollment Confirmed & Schedule Finalized!",
            message: `${enrollmentRequest.tutor.name} accepted your enrollment in "${course.title}". ${createdEvents.length} weekly 1-hour sessions have been populated on your study calendar.`,
            type: "SUCCESS",
            link: "/dashboard",
          },
        });

        // 5. In-App Notification to Tutor
        await tx.notification.create({
          data: {
            userId: enrollmentRequest.tutorId,
            title: "✓ Permanent Schedule Finalized",
            message: `You finalized ${student.name}'s schedule for "${course.title}". ${createdEvents.length} class sessions are now scheduled on your teaching roster.`,
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

    if (action === "reject" || action === "decline") {
      const reason = rejectionReason ? String(rejectionReason).trim() : "Schedule could not be accommodated at this time.";

      const updatedRequest = await prisma.classEnrollmentRequest.update({
        where: { id: enrollmentRequest.id },
        data: {
          status: EnrollmentRequestStatus.REJECTED,
          rejectionReason: reason,
        },
      });

      // Notify Student
      await prisma.notification.create({
        data: {
          userId: enrollmentRequest.studentId,
          title: "Enrollment Request Update",
          message: `${enrollmentRequest.tutor.name} could not accommodate the requested schedule for "${enrollmentRequest.course.title}". Note: ${reason}`,
          type: "WARNING",
          link: `/classes/${enrollmentRequest.course.slug}`,
        },
      });

      broadcastLMSEvent("ENROLLMENT_REQUESTS_CHANGED");
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: enrollmentRequest.studentId });

      return NextResponse.json({
        success: true,
        message: "Enrollment request declined.",
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
