/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { broadcastLMSEvent } from "@/lib/events";
import {
  createBBBMeeting,
  getBBBJoinUrl,
  getBBBMeetingId,
  isBigBlueButtonConfigured,
  getAppBaseUrl,
} from "@/lib/bigbluebutton";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let eventId = searchParams.get("eventId");
    let trialId = searchParams.get("trialId");
    const courseId = searchParams.get("courseId");
    const slot = searchParams.get("slot");
    const classCode = searchParams.get("classCode");
    const requestedRole = searchParams.get("role");
    const wantsJson = searchParams.get("json") === "1" || request.headers.get("accept")?.includes("application/json");

    // Fallback resolver for legacy or parameter-based links
    if (!eventId && !trialId) {
      if (courseId && slot) {
        const slotMs = parseInt(slot, 10);
        if (!isNaN(slotMs)) {
          const targetDate = new Date(slotMs);
          const found = await prisma.event.findFirst({
            where: {
              courseId,
              dueDate: {
                gte: new Date(targetDate.getTime() - 4 * 60 * 60 * 1000),
                lte: new Date(targetDate.getTime() + 4 * 60 * 60 * 1000),
              },
            },
            orderBy: { dueDate: "asc" },
          });
          if (found) {
            eventId = found.id;
          }
        }
      } else if (classCode) {
        const found = await prisma.event.findUnique({
          where: { classCode },
        });
        if (found) {
          eventId = found.id;
        }
      }
    }

    if (!eventId && !trialId) {
      return NextResponse.json(
        { error: "Could not find a valid class session or trial for the provided parameters. (eventId or trialId is required)" },
        { status: 400 }
      );
    }

    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    const appBase = getAppBaseUrl();

    if (!auth.user) {
      const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      if (wantsJson) {
        return NextResponse.json(
          { error: "Authentication required", loginUrl: `/login?redirect=${encodeURIComponent(redirectTarget)}` },
          { status: 401 }
        );
      }
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(redirectTarget)}`, appBase),
        307
      );
    }

    const user = auth.user;
    let meetingTitle = "Live Class Session";
    let bbbMeetingId = "";
    let isModerator = user.role === Role.ADMIN;
    let courseTitle = "";
    let associatedCourseId: string | null = null;

    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          course: {
            include: { tutor: true },
          },
          user: true,
        },
      });

      if (!event) {
        return NextResponse.json({ error: "Class event not found." }, { status: 404 });
      }

      meetingTitle = event.title;
      courseTitle = event.course?.title || "";
      associatedCourseId = event.courseId || null;
      bbbMeetingId = event.meetingSpaceId || getBBBMeetingId({ eventId });

      // Check moderator status: Admin or the course/event tutor
      if (
        user.role === Role.ADMIN ||
        event.course?.tutorId === user.id ||
        event.course?.tutor?.email === user.email ||
        event.requestedBy === user.id
      ) {
        isModerator = true;
      }

      // Record tutor physical join timestamp if moderator enters live session
      if (isModerator && !event.tutorJoinTimestamp) {
        const now = new Date();
        await prisma.event.update({
          where: { id: eventId },
          data: {
            tutorJoinTimestamp: now,
            startedAt: event.startedAt || now,
            actualStartTime: event.actualStartTime || now,
            status: event.status === "COMPLETED" || event.status === "CANCELLED" ? event.status : "LIVE",
          },
        }).catch(() => {});
      }

      // Record automated attendance for this class event
      try {
        const now = new Date();
        const isLate = event.dueDate && now.getTime() - new Date(event.dueDate).getTime() > 15 * 60 * 1000;
        const initialStatus = isLate ? "LATE" : "PRESENT";

        const existingAtt = await prisma.classAttendance.findUnique({
          where: {
            eventId_userId: {
              eventId,
              userId: user.id,
            },
          },
        });

        let resolvedTrialId: string | null = trialId || null;
        if (!resolvedTrialId && event.description) {
          const match = event.description.match(/Trial ID:\s*([a-zA-Z0-9_-]+)/i);
          if (match?.[1]) resolvedTrialId = match[1];
        }

        if (existingAtt) {
          // If student or instructor was already marked PRESENT, retain it (do not downgrade to LATE on reconnect)
          const preservedStatus = existingAtt.status === "PRESENT" ? "PRESENT" : initialStatus;
          await prisma.classAttendance.update({
            where: { id: existingAtt.id },
            data: {
              joinedAt: existingAtt.joinedAt || now,
              status: preservedStatus,
              userRole: user.role,
              trialId: resolvedTrialId || existingAtt.trialId,
              courseId: associatedCourseId || existingAtt.courseId,
              markedBy: "AUTO_ONLINE_JOIN",
              notes: isModerator
                ? (existingAtt.joinedAt ? "Instructor reconnected to live session" : "Instructor joined online live session")
                : (existingAtt.joinedAt ? "Student reconnected to live session" : "Student joined online live session"),
            },
          });
        } else {
          await prisma.classAttendance.create({
            data: {
              eventId,
              trialId: resolvedTrialId,
              courseId: associatedCourseId,
              userId: user.id,
              userRole: user.role,
              status: initialStatus,
              joinedAt: now,
              markedBy: "AUTO_ONLINE_JOIN",
              notes: isModerator ? "Instructor joined online live session" : "Student joined online live session",
            },
          });
        }

        if (user.role === Role.STUDENT) {
          const count = await prisma.classAttendance.count({
            where: { eventId, userRole: Role.STUDENT, status: { in: ["PRESENT", "LATE"] } },
          });
          await prisma.event.update({
            where: { id: eventId },
            data: { attendanceCount: count },
          });
        }

        broadcastLMSEvent("ATTENDANCE_CHANGED", { eventId, userId: user.id, userRole: user.role });
      } catch (attErr) {
        console.warn("[join] classAttendance record notice:", attErr);
      }
    } else if (trialId) {
      const trial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: {
          course: {
            include: { tutor: true },
          },
          tutor: true,
          student: true,
        },
      });

      if (!trial) {
        return NextResponse.json({ error: "Trial consultation not found." }, { status: 404 });
      }

      meetingTitle = `1-on-1 Consultation: ${trial.course?.title || "Class"} (${trial.studentName})`;
      courseTitle = trial.course?.title || "";
      associatedCourseId = trial.courseId || null;
      bbbMeetingId = trial.meetingSpaceId || getBBBMeetingId({ trialId });

      if (
        user.role === Role.ADMIN ||
        trial.tutorId === user.id ||
        trial.tutor?.email === user.email ||
        trial.course?.tutorId === user.id
      ) {
        isModerator = true;
      }

      // Record automated attendance for trial session
      try {
        const now = new Date();
        const existingTrialAtt = await prisma.classAttendance.findFirst({
          where: { trialId, userId: user.id },
        });

        if (existingTrialAtt) {
          await prisma.classAttendance.update({
            where: { id: existingTrialAtt.id },
            data: {
              joinedAt: existingTrialAtt.joinedAt || now,
              status: "PRESENT",
              userRole: user.role,
              courseId: associatedCourseId || existingTrialAtt.courseId,
              markedBy: "AUTO_ONLINE_JOIN",
              notes: isModerator
                ? (existingTrialAtt.joinedAt ? "Tutor reconnected to trial consultation" : "Tutor joined trial consultation")
                : (existingTrialAtt.joinedAt ? "Student reconnected to trial consultation" : "Student joined trial consultation"),
            },
          });
        } else {
          await prisma.classAttendance.create({
            data: {
              trialId,
              courseId: associatedCourseId,
              userId: user.id,
              userRole: user.role,
              status: "PRESENT",
              joinedAt: now,
              markedBy: "AUTO_ONLINE_JOIN",
              notes: isModerator ? "Tutor joined trial consultation" : "Student joined trial consultation",
            },
          });
        }

        broadcastLMSEvent("ATTENDANCE_CHANGED", { trialId, userId: user.id, userRole: user.role });
      } catch (attErr) {
        console.warn("[join] trialAttendance record notice:", attErr);
      }
    }

    if (requestedRole === "moderator" && user.role === Role.ADMIN) {
      isModerator = true;
    }

    // Ensure BigBlueButton room exists
    if (isBigBlueButtonConfigured()) {
      try {
        await createBBBMeeting({
          meetingId: bbbMeetingId,
          name: meetingTitle,
          record: true,
          autoStartRecording: true,
          allowStartStopRecording: false,
          welcome: `<br>Welcome to <b>${meetingTitle}</b> on EduPulse LMS!<br>${courseTitle ? `Course: <i>${courseTitle}</i><br>` : ""}Use audio and video controls below to interact.<br>`,
          logoutUrl: `${appBase}/dashboard`,
          meta: {
            eventId: eventId || "",
            trialId: trialId || "",
            userId: user.id,
          },
        });
      } catch (err: any) {
        console.warn("[join] createBBBMeeting notice:", err?.message || err);
      }
    }

    const hidePresentationParam = searchParams.get("hidePresentation");
    const hidePresentationOnJoin = hidePresentationParam === "1" || hidePresentationParam === "true";

    // Generate Join URL
    const joinUrl = getBBBJoinUrl({
      meetingId: bbbMeetingId,
      fullName: user.name || (isModerator ? "Instructor" : "Student"),
      isModerator,
      userId: user.id,
      redirect: true,
      hidePresentationOnJoin,
    });

    if (wantsJson) {
      return NextResponse.json({
        success: true,
        meetingId: bbbMeetingId,
        isModerator,
        joinUrl,
      });
    }

    return NextResponse.redirect(joinUrl, 307);
  } catch (error: any) {
    console.error("[BigBlueButton Join Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to join BigBlueButton meeting." },
      { status: 500 }
    );
  }
}
