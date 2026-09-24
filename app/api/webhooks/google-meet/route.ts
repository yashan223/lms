/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncClassMeetingSession, fetchMeetingRecordings } from "@/lib/google-meet";
import { broadcastLMSEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * Webhook handler for Google Meet / Google Workspace Events & Cloud Pub/Sub
 * Supported event types:
 * - google.workspace.meet.conferenceRecord.v1.ended
 * - google.workspace.meet.recording.v1.fileGenerated
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => ({}));

    // Decode Cloud Pub/Sub wrapper if delivered via Pub/Sub subscription
    let eventData = rawBody;
    if (rawBody?.message?.data) {
      const decodedString = Buffer.from(rawBody.message.data, "base64").toString("utf-8");
      try {
        eventData = JSON.parse(decodedString);
      } catch {
        eventData = { raw: decodedString };
      }
    }

    const eventType =
      request.headers.get("ce-type") ||
      eventData?.eventType ||
      eventData?.type ||
      "";

    const spaceName =
      eventData?.space?.name ||
      eventData?.conferenceRecord?.space ||
      eventData?.space ||
      "";

    const conferenceRecordName =
      eventData?.conferenceRecord?.name ||
      eventData?.conferenceRecord ||
      eventData?.recording?.conferenceRecord ||
      "";

    const driveFileId =
      eventData?.recording?.driveDestination?.file ||
      eventData?.driveDestination?.file ||
      null;

    const driveExportUri =
      eventData?.recording?.driveDestination?.exportUri ||
      eventData?.driveDestination?.exportUri ||
      null;

    const recordingUrl = driveFileId
      ? `https://drive.google.com/file/d/${driveFileId}/view`
      : driveExportUri;

    // 1. Find matching Event by meetingSpaceId or conferenceRecordId
    const matchingEvent = await prisma.event.findFirst({
      where: {
        OR: [
          spaceName ? { meetingSpaceId: spaceName } : undefined,
          conferenceRecordName ? { conferenceRecordId: conferenceRecordName } : undefined,
        ].filter(Boolean) as any[],
      },
    });

    if (matchingEvent) {
      if (recordingUrl) {
        await prisma.event.update({
          where: { id: matchingEvent.id },
          data: {
            recordingUrl,
            recordingStatus: "AVAILABLE",
            status: "COMPLETED",
          },
        });
        broadcastLMSEvent("EVENTS_CHANGED", { eventId: matchingEvent.id, recordingUrl });
      } else {
        await syncClassMeetingSession(matchingEvent.id);
      }
      return NextResponse.json({ success: true, matchedType: "EVENT", id: matchingEvent.id });
    }

    // 2. Find matching TrialRequest
    const matchingTrial = await prisma.trialRequest.findFirst({
      where: {
        OR: [
          spaceName ? { meetingSpaceId: spaceName } : undefined,
          conferenceRecordName ? { conferenceRecordId: conferenceRecordName } : undefined,
        ].filter(Boolean) as any[],
      },
    });

    if (matchingTrial) {
      if (recordingUrl) {
        await prisma.trialRequest.update({
          where: { id: matchingTrial.id },
          data: {
            recordingUrl,
            recordingStatus: "AVAILABLE",
            status: "COMPLETED",
          },
        });
        broadcastLMSEvent("TRIALS_CHANGED", { trialId: matchingTrial.id });
      }
      return NextResponse.json({ success: true, matchedType: "TRIAL", id: matchingTrial.id });
    }

    return NextResponse.json({
      received: true,
      message: "Webhook processed (no active LMS meeting matched space).",
    });
  } catch (error: any) {
    console.error("Google Meet webhook error:", error);
    return NextResponse.json(
      { error: error?.message || "Webhook handling failed" },
      { status: 500 }
    );
  }
}
