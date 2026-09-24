import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { syncClassMeetingSession, fetchConferenceRecord, fetchMeetingRecordings } from "@/lib/google-meet";
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

      let actualStart = manualStartTime ? new Date(manualStartTime) : trial.actualStartTime || trial.preferredDate;
      let actualEnd = manualEndTime ? new Date(manualEndTime) : trial.actualEndTime || new Date(actualStart.getTime() + 30 * 60 * 1000);
      let recordingUrl = manualRecordingUrl || trial.recordingUrl;
      let recordingStatus = trial.recordingStatus || "NONE";
      let confRecordId = trial.conferenceRecordId;

      if (trial.meetingSpaceId && trial.meetingSpaceId.startsWith("spaces/")) {
        const record = await fetchConferenceRecord(trial.meetingSpaceId);
        if (record) {
          confRecordId = record.id;
          if (record.actualStartTime) actualStart = record.actualStartTime;
          if (record.actualEndTime) actualEnd = record.actualEndTime;

          const recs = await fetchMeetingRecordings(record.id);
          if (recs.length > 0 && recs[0].driveFileUrl) {
            recordingUrl = recs[0].driveFileUrl;
            recordingStatus = "AVAILABLE";
          }
        }
      }

      if (recordingUrl) {
        recordingStatus = "AVAILABLE";
      }

      const updatedTrial = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          status: "COMPLETED",
          actualStartTime: actualStart,
          actualEndTime: actualEnd,
          conferenceRecordId: confRecordId,
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
          ? `Trial session completed with verified times (${actualStart.toLocaleTimeString()} – ${actualEnd.toLocaleTimeString()}) and recording attached.`
          : `Trial session marked completed with verified times.`,
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("Sync Google Meet error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to synchronize Google Meet session" },
      { status: 500 }
    );
  }
}
