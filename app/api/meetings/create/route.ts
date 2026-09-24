import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { createGoogleMeetingSpace } from "@/lib/google-meet";
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
    const { eventId, trialId, title, courseTitle } = body;

    const space = await createGoogleMeetingSpace({
      title: title || "Live Class Session",
      eventId,
      courseTitle,
    });

    if (eventId) {
      await prisma.event.update({
        where: { id: eventId },
        data: {
          meetingLink: space.meetingUri,
          meetingSpaceId: space.spaceName,
        },
      });
      broadcastLMSEvent("EVENTS_CHANGED", { eventId, meetingLink: space.meetingUri });
    } else if (trialId) {
      await prisma.trialRequest.update({
        where: { id: trialId },
        data: {
          meetingLink: space.meetingUri,
          meetingSpaceId: space.spaceName,
        },
      });
      broadcastLMSEvent("TRIALS_CHANGED", { trialId, meetingLink: space.meetingUri });
    }

    return NextResponse.json({
      success: true,
      space,
      meetingLink: space.meetingUri,
      message: `Google Meet space created successfully (${space.mode === "LIVE_API" ? "Google Meet REST API" : "Google Meet Space"}).`,
    });
  } catch (error: any) {
    console.error("Create Google Meet space error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create Google Meet space" },
      { status: 500 }
    );
  }
}
