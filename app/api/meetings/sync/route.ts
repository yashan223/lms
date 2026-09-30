/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { syncClassMeetingSession } from "@/lib/google-meet";
import { broadcastLMSEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.ADMIN, Role.TUTOR]);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json();
    const { eventId, trialId, manualStartTime, manualEndTime, manualRecordingUrl } = body;

    if (!eventId && !trialId) {
      return NextResponse.json(
        { error: "Either eventId or trialId is required to synchronize meeting." },
        { status: 400 }
      );
    }

    if (eventId) {
      const result = await syncClassMeetingSession(eventId, {
        manualStartTime: manualStartTime ? new Date(manualStartTime) : undefined,
        manualEndTime: manualEndTime ? new Date(manualEndTime) : undefined,
        manualRecordingUrl: manualRecordingUrl ? manualRecordingUrl.trim() : undefined,
      });

      return NextResponse.json({
        success: true,
        event: result.event,
        message: result.message,
      });
    }

    // Trial Request Sync
    if (trialId) {
      const trial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true, tutor: true, student: true },
      });

      if (!trial) {
        return NextResponse.json(
          { error: "Trial consultation not found." },
          { status: 404 }
        );
      }

      const actualStart = manualStartTime ? new Date(manualStartTime) : trial.actualStartTime || trial.preferredDate;
      const actualEnd = manualEndTime ? new Date(manualEndTime) : trial.actualEndTime || new Date(actualStart.getTime() + 30 * 60 * 1000);
      const recordingUrl = manualRecordingUrl ? manualRecordingUrl.trim() : trial.recordingUrl;
      const recordingStatus = recordingUrl ? "AVAILABLE" : "NONE";

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: "COMPLETED",
          actualStartTime: actualStart,
          actualEndTime: actualEnd,
          recordingUrl,
          recordingStatus,
        },
      });

      if (recordingUrl && trial.studentId) {
        await prisma.notification.create({
          data: {
            userId: trial.studentId,
            title: "🎥 Trial Consultation Recording Available",
            message: `The recording for your 1-on-1 consultation is now ready to view.`,
            type: "SUCCESS",
            link: recordingUrl,
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: trial.studentId });
      }

      broadcastLMSEvent("TRIALS_CHANGED", { trialId });

      return NextResponse.json({
        success: true,
        trial: updatedTrial,
        message: recordingUrl
          ? `Trial session marked completed and recording attached.`
          : `Trial session marked completed.`,
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("Sync meeting error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to synchronize meeting session" },
      { status: 500 }
    );
  }
}
