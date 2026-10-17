/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getSafeMeetingLink } from "@/lib/utils";
import { broadcastLMSEvent } from "@/lib/events";
import {
  createBBBMeeting,
  getBBBMeetingId,
  getUniversalJoinLink,
  isBigBlueButtonConfigured,
} from "@/lib/bigbluebutton";

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
    const { eventId, trialId, meetingLink } = body;

    if (!eventId && !trialId) {
      return NextResponse.json(
        { error: "Either eventId or trialId is required." },
        { status: 400 }
      );
    }

    let resolvedLink = meetingLink?.trim() ? getSafeMeetingLink(meetingLink) : null;
    const bbbId = getBBBMeetingId({ eventId, trialId });

    if (!resolvedLink) {
      resolvedLink = getUniversalJoinLink({ eventId, trialId });
    }

    if (eventId) {
      const ev = await prisma.event.findUnique({ where: { id: eventId } });
      if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });

      if (isBigBlueButtonConfigured()) {
        try {
          await createBBBMeeting({
            meetingId: bbbId,
            name: ev.title,
            record: true,
          });
        } catch (e) {
          console.warn("[meetings/create] BBB meeting notice:", e);
        }
      }

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          meetingLink: resolvedLink,
          meetingSpaceId: bbbId,
        },
      });
      broadcastLMSEvent("EVENTS_CHANGED", { eventId, meetingLink: resolvedLink });

      return NextResponse.json({
        success: true,
        meetingLink: resolvedLink,
        event: updated,
        message: "BigBlueButton classroom link updated successfully.",
      });
    }

    if (trialId) {
      const tr = await prisma.trialRequest.findUnique({ where: { id: trialId }, include: { course: true } });
      if (!tr) return NextResponse.json({ error: "Trial not found" }, { status: 404 });

      if (isBigBlueButtonConfigured()) {
        try {
          await createBBBMeeting({
            meetingId: bbbId,
            name: `1-on-1 Consultation: ${tr.course?.title || "Class"}`,
            record: true,
          });
        } catch (e) {
          console.warn("[meetings/create] BBB trial notice:", e);
        }
      }

      const updated = await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          meetingLink: resolvedLink,
          meetingSpaceId: bbbId,
        },
      });
      broadcastLMSEvent("TRIALS_CHANGED", { trialId, meetingLink: resolvedLink });

      return NextResponse.json({
        success: true,
        meetingLink: resolvedLink,
        trial: updated,
        message: "BigBlueButton trial meeting link updated successfully.",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("Save meeting link error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save meeting link" },
      { status: 500 }
    );
  }
}
