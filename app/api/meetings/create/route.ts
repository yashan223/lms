/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getSafeMeetingLink } from "@/lib/utils";
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
    const { eventId, trialId, meetingLink } = body;

    const safeLink = meetingLink?.trim() ? getSafeMeetingLink(meetingLink) : null;

    if (eventId) {
      await prisma.event.update({
        where: { id: eventId },
        data: {
          meetingLink: safeLink,
        },
      });
      broadcastLMSEvent("EVENTS_CHANGED", { eventId, meetingLink: safeLink });
    } else if (trialId) {
      await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          meetingLink: safeLink,
        },
      });
      broadcastLMSEvent("TRIALS_CHANGED", { trialId, meetingLink: safeLink });
    }

    return NextResponse.json({
      success: true,
      meetingLink: safeLink,
      message: "Meeting link updated successfully.",
    });
  } catch (error: any) {
    console.error("Save meeting link error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save meeting link" },
      { status: 500 }
    );
  }
}
