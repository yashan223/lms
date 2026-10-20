/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
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
    const eventId = searchParams.get("eventId");
    const trialId = searchParams.get("trialId");
    const requestedRole = searchParams.get("role");
    const wantsJson = searchParams.get("json") === "1" || request.headers.get("accept")?.includes("application/json");

    if (!eventId && !trialId) {
      return NextResponse.json(
        { error: "Either eventId or trialId is required to join a meeting." },
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

      // Record automated attendance for this class event
      try {
        const now = new Date();
        const isLate = event.dueDate && now.getTime() - new Date(event.dueDate).getTime() > 15 * 60 * 1000;
        const initialStatus = isLate ? "LATE" : "PRESENT";

        await prisma.classAttendance.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId: user.id,
            },
          },
          update: {
            joinedAt: now,
            status: initialStatus,
            userRole: user.role,
            markedBy: "AUTO_ONLINE_JOIN",
            notes: isModerator ? "Instructor joined online live session" : "Student joined online live session",
          },
          create: {
            eventId,
            courseId: associatedCourseId,
            userId: user.id,
            userRole: user.role,
            status: initialStatus,
            joinedAt: now,
            markedBy: "AUTO_ONLINE_JOIN",
            notes: isModerator ? "Instructor joined online live session" : "Student joined online live session",
          },
        });

        if (user.role === Role.STUDENT) {
          const count = await prisma.classAttendance.count({
            where: { eventId, userRole: Role.STUDENT, status: { in: ["PRESENT", "LATE"] } },
          });
          await prisma.event.update({
            where: { id: eventId },
            data: { attendanceCount: count },
          });
        }
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
              joinedAt: now,
              status: "PRESENT",
              userRole: user.role,
              markedBy: "AUTO_ONLINE_JOIN",
              notes: isModerator ? "Tutor joined trial consultation" : "Student joined trial consultation",
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
