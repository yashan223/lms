/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { syncClassMeetingSession, syncTrialSession } from "@/lib/bigbluebutton";
import { completeClassAndProcessEcosystem } from "@/lib/token-ecosystem";
import { removeLiveClassNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

async function processMeetingEnding(meetingId: string, payload?: any) {
  if (!meetingId || meetingId === "unknown") return;

  // 1. Process Enrolled Class Event
  if (meetingId.startsWith("class-")) {
    const eventId = meetingId.replace(/^class-/, "").split("-")[0];
    const ev = await prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { meetingSpaceId: meetingId }] },
    });

    if (ev) {
      if (payload) {
        await prisma.systemEvent.create({
          data: {
            type: `BBB_ANALYTICS:EVENT:${ev.id}`,
            data: payload,
          },
        }).catch(() => {});
      }

      // If class is still marked LIVE, end it immediately on the LMS!
      if (ev.status !== "COMPLETED") {
        await completeClassAndProcessEcosystem(ev.id);
        await syncClassMeetingSession(ev.id);
        await removeLiveClassNotifications({ eventId: ev.id, title: ev.title });
        broadcastLMSEvent("EVENTS_CHANGED", { eventId: ev.id, ended: true });
      }
    }
  } else if (meetingId.startsWith("trial-")) {
    // 2. Process Trial Consultation
    const trialId = meetingId.replace(/^trial-/, "");
    const tr = await prisma.trialRequest.findFirst({
      where: { OR: [{ id: trialId }, { meetingSpaceId: meetingId }] },
      include: { course: true },
    });

    if (tr) {
      if (payload) {
        await prisma.systemEvent.create({
          data: {
            type: `BBB_ANALYTICS:TRIAL:${tr.id}`,
            data: payload,
          },
        }).catch(() => {});
      }

      if (tr.status !== "COMPLETED") {
        await syncTrialSession(tr.id);
        await removeLiveClassNotifications({ trialId: tr.id, title: tr.course?.title });
        broadcastLMSEvent("TRIALS_CHANGED", { trialId: tr.id, ended: true });
      }
    }
  } else {
    // Search by meetingSpaceId
    const ev = await prisma.event.findFirst({
      where: { meetingSpaceId: meetingId },
    });
    if (ev && ev.status !== "COMPLETED") {
      await completeClassAndProcessEcosystem(ev.id);
      await syncClassMeetingSession(ev.id);
      await removeLiveClassNotifications({ eventId: ev.id, title: ev.title });
      broadcastLMSEvent("EVENTS_CHANGED", { eventId: ev.id, ended: true });
    }

    const tr = await prisma.trialRequest.findFirst({
      where: { meetingSpaceId: meetingId },
      include: { course: true },
    });
    if (tr && tr.status !== "COMPLETED") {
      await syncTrialSession(tr.id);
      await removeLiveClassNotifications({ trialId: tr.id, title: tr.course?.title });
      broadcastLMSEvent("TRIALS_CHANGED", { trialId: tr.id, ended: true });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const meetingIdQuery = url.searchParams.get("meetingID") || url.searchParams.get("meetingId") || "";

    let payload: any = null;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const rawText = await request.text();
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { raw: rawText };
      }
    }

    const meetingId =
      meetingIdQuery ||
      payload?.meetingId ||
      payload?.internalMeetingID ||
      payload?.meetingID ||
      payload?.event?.data?.attributes?.meeting?.["external-meeting-id"] ||
      payload?.event?.data?.attributes?.meeting?.["internal-meeting-id"] ||
      "unknown";

    // Store the raw BigBlueButton analytics payload in SystemEvent for persistent retention
    if (meetingId !== "unknown") {
      await prisma.systemEvent.create({
        data: {
          type: `BBB_ANALYTICS:${meetingId}`,
          data: payload,
        },
      }).catch(() => {});
    }

    await processMeetingEnding(meetingId, payload);

    broadcastLMSEvent("EVENTS_CHANGED");
    return NextResponse.json({ success: true, received: true, meetingId });
  } catch (err: any) {
    console.error("[analytics-callback] Error receiving analytics:", err);
    return NextResponse.json({ error: err.message || "Failed to process analytics callback." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const meetingId = url.searchParams.get("meetingID") || url.searchParams.get("meetingId") || "";

    if (meetingId) {
      await processMeetingEnding(meetingId);
    }

    return NextResponse.json({ success: true, ping: "ok", meetingId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Callback error" }, { status: 500 });
  }
}
