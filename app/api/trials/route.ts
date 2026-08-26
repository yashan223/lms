import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { getSafeMeetingLink } from "@/lib/utils";
import { EventType, TrialStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tutorId = searchParams.get("tutorId");
    const studentId = searchParams.get("studentId");
    const emailCookie = request.cookies.get("edupulse_user_email")?.value;
    const roleCookie = request.cookies.get("edupulse_user_role")?.value;

    let whereClause: any = {};

    if (tutorId) {
      whereClause.OR = [
        { tutorId: tutorId },
        { course: { instructorId: tutorId } },
      ];
    } else if (studentId) {
      whereClause.OR = [
        { studentId: studentId },
        { studentEmail: emailCookie?.toLowerCase() },
      ];
    } else if (emailCookie) {
      if (roleCookie === "INSTRUCTOR") {
        const user = await prisma.user.findUnique({
          where: { email: emailCookie.toLowerCase() },
        });
        if (user) {
          whereClause.OR = [
            { tutorId: user.id },
            { course: { instructorId: user.id } },
          ];
        }
      } else if (roleCookie === "STUDENT") {
        whereClause.OR = [
          { studentEmail: emailCookie.toLowerCase() },
          { student: { email: emailCookie.toLowerCase() } },
        ];
      }
    }

    const trials = await prisma.trialRequest.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            subjectCode: true,
            thumbnail: true,
            instructor: {
              select: {
                id: true,
                name: true,
                avatar: true,
                headline: true,
              },
            },
          },
        },
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            headline: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        preferredDate: "asc",
      },
    });

    return NextResponse.json({ trials });
  } catch (error) {
    console.error("Trials API GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trial requests." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "request_trial") {
      const {
        studentName,
        studentEmail,
        studentPhone,
        courseId,
        tutorId,
        studentId,
        preferredDate,
        topic,
        notes,
      } = body;

      if (!studentName || !studentEmail || !preferredDate) {
        return NextResponse.json(
          { error: "Student name, email, and preferred date & time are required." },
          { status: 400 }
        );
      }

      let parsedDate = new Date(preferredDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format provided for preferred session time." },
          { status: 400 }
        );
      }

      let resolvedTutorId = tutorId || null;
      let courseTitle = "London A/L Tutorial Masterclass";
      let courseSubjectCode = "";
      if (courseId) {
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { id: true, title: true, subjectCode: true, instructorId: true },
        });
        if (course) {
          if (!resolvedTutorId) resolvedTutorId = course.instructorId;
          courseTitle = course.title;
          courseSubjectCode = course.subjectCode || "";
        }
      }

      const meetingLink = getSafeMeetingLink(null, `trial-${studentEmail.trim()}-${Date.now()}`);

      const trial = await prisma.trialRequest.create({
        data: {
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim().toLowerCase(),
          studentPhone: studentPhone?.trim() || null,
          courseId: courseId || null,
          tutorId: resolvedTutorId,
          studentId: studentId || null,
          preferredDate: parsedDate,
          topic: topic?.trim() || "30-Min Free Trial & Syllabus Overview",
          notes: notes?.trim() || null,
          status: TrialStatus.CONFIRMED,
          meetingLink,
        },
        include: {
          course: {
            include: {
              instructor: true,
            },
          },
          tutor: true,
          student: true,
        },
      });

      const eventTitle = `30-Min Free Trial: ${courseTitle} (${studentName.trim()})`;
      const eventDescription = [
        `🎯 30-Minute 1-on-1 Online Free Trial Session with Senior Faculty.`,
        `Subject / Course: ${courseTitle} ${courseSubjectCode ? `(${courseSubjectCode})` : ""}`,
        `Topic / Focus: ${trial.topic}`,
        `Student: ${studentName.trim()} (${studentEmail.trim()})`,
        `Classroom Link: ${meetingLink}`,
      ].join("\n\n");

      await prisma.event.create({
        data: {
          title: eventTitle,
          description: eventDescription,
          dueDate: parsedDate,
          type: EventType.LIVE_SEMINAR,
          courseId: courseId || null,
          userId: studentId || resolvedTutorId || null,
        },
      });

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Your 30-minute free trial session has been reserved and linked to your calendar!",
        trial,
        meetingLink,
      });
    }

    if (action === "update_trial_status") {
      const { trialId, status, meetingLink, notes } = body;

      if (!trialId) {
        return NextResponse.json({ error: "Trial ID is required." }, { status: 400 });
      }

      const existingTrial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true },
      });

      if (!existingTrial) {
        return NextResponse.json({ error: "Trial session not found." }, { status: 404 });
      }

      const link = getSafeMeetingLink(meetingLink || existingTrial.meetingLink, existingTrial.id);

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: (status as TrialStatus) || undefined,
          meetingLink: link,
          notes: notes?.trim() || existingTrial.notes,
        },
        include: {
          course: {
            include: { instructor: true },
          },
          tutor: true,
          student: true,
        },
      });

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Trial session status updated successfully.",
        trial: updatedTrial,
      });
    }

    if (action === "reschedule_trial") {
      const { trialId, scheduledDate, meetingLink, notes } = body;
      if (!trialId || !scheduledDate) {
        return NextResponse.json(
          { error: "Trial ID and preferred date & time are required." },
          { status: 400 }
        );
      }

      const existing = await prisma.trialRequest.findUnique({ where: { id: trialId } });
      if (!existing) {
        return NextResponse.json({ error: "Trial not found." }, { status: 404 });
      }

      const link = getSafeMeetingLink(meetingLink || existing.meetingLink, existing.id);

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          preferredDate: new Date(scheduledDate),
          meetingLink: link,
          notes: notes?.trim() || existing.notes,
          status: TrialStatus.CONFIRMED,
        },
        include: {
          course: {
            include: { instructor: true },
          },
          tutor: true,
          student: true,
        },
      });

      if (updatedTrial.courseId) {
        await prisma.event.updateMany({
          where: {
            courseId: updatedTrial.courseId,
            title: { contains: updatedTrial.studentName },
          },
          data: {
            dueDate: new Date(scheduledDate),
            meetingLink: link,
            status: "SCHEDULED",
            endedAt: null,
          },
        });
      }

      broadcastLMSEvent("TRIALS_CHANGED");
      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Trial session rescheduled successfully.",
        trial: updatedTrial,
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error: any) {
    console.error("Trials API POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process trial request." },
      { status: 500 }
    );
  }
}
