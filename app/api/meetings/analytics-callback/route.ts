/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

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

    const meetingId = meetingIdQuery || payload?.meetingId || payload?.internalMeetingID || payload?.meetingID || "unknown";

    // Store the raw BigBlueButton analytics payload in SystemEvent for persistent retention
    await prisma.systemEvent.create({
      data: {
        type: `BBB_ANALYTICS:${meetingId}`,
        data: payload,
      },
    });

    if (meetingId.startsWith("class-")) {
      const eventId = meetingId.replace(/^class-/, "").split("-")[0];
      const ev = await prisma.event.findFirst({
        where: { OR: [{ id: eventId }, { meetingSpaceId: meetingId }] },
      });
      if (ev) {
        await prisma.systemEvent.create({
          data: {
            type: `BBB_ANALYTICS:EVENT:${ev.id}`,
            data: payload,
          },
        });
      }
    } else if (meetingId.startsWith("trial-")) {
      const trialId = meetingId.replace(/^trial-/, "");
      const tr = await prisma.trialRequest.findFirst({
        where: { OR: [{ id: trialId }, { meetingSpaceId: meetingId }] },
      });
      if (tr) {
        await prisma.systemEvent.create({
          data: {
            type: `BBB_ANALYTICS:TRIAL:${tr.id}`,
            data: payload,
          },
        });
      }
    }

    broadcastLMSEvent("EVENTS_CHANGED");
    return NextResponse.json({ success: true, received: true, meetingId });
  } catch (err: any) {
    console.error("[analytics-callback] Error receiving analytics:", err);
    return NextResponse.json({ error: err.message || "Failed to process analytics callback." }, { status: 500 });
  }
}
