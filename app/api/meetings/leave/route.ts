import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { isBBBMeetingRunning, syncClassMeetingSession, syncTrialSession, getAppBaseUrl } from "@/lib/bigbluebutton";
import { completeClassAndProcessEcosystem } from "@/lib/token-ecosystem";
import { removeLiveClassNotifications } from "@/lib/notifications";
import { broadcastLMSEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * Handles user redirect when leaving or ending a BigBlueButton meeting room.
 * When a moderator ends the class in BigBlueButton, BigBlueButton kicks attendees out
 * and redirects their browser to this endpoint via logoutURL.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const meetingID = url.searchParams.get("meetingID") || url.searchParams.get("meetingId") || "";

    if (meetingID) {
      // Check if meeting is still actively running on BigBlueButton
      const isRunning = await isBBBMeetingRunning(meetingID).catch(() => false);

      // If the meeting is no longer running, it was ended through BigBlueButton!
      if (!isRunning) {
        let eventId: string | null = null;
        let trialId: string | null = null;

        if (meetingID.startsWith("class-")) {
          eventId = meetingID.replace(/^class-/, "").split("-")[0];
        } else if (meetingID.startsWith("trial-")) {
          trialId = meetingID.replace(/^trial-/, "");
        }

        // 1. Process Enrolled Class Event
        if (eventId) {
          const ev = await prisma.event.findFirst({
            where: { OR: [{ id: eventId }, { meetingSpaceId: meetingID }] },
          });

          if (ev && ev.status !== "COMPLETED") {
            await completeClassAndProcessEcosystem(ev.id);
            await syncClassMeetingSession(ev.id);
            await removeLiveClassNotifications({ eventId: ev.id, title: ev.title });
            broadcastLMSEvent("EVENTS_CHANGED", { eventId: ev.id, ended: true });
          }
        } else {
          // Look up by meetingSpaceId if not parsed directly
          const ev = await prisma.event.findFirst({
            where: { meetingSpaceId: meetingID },
          });
          if (ev && ev.status !== "COMPLETED") {
            await completeClassAndProcessEcosystem(ev.id);
            await syncClassMeetingSession(ev.id);
            await removeLiveClassNotifications({ eventId: ev.id, title: ev.title });
            broadcastLMSEvent("EVENTS_CHANGED", { eventId: ev.id, ended: true });
          }
        }

        // 2. Process Trial Consultation
        if (trialId) {
          const tr = await prisma.trialRequest.findFirst({
            where: { OR: [{ id: trialId }, { meetingSpaceId: meetingID }] },
            include: { course: true },
          });

          if (tr && tr.status !== "COMPLETED") {
            await syncTrialSession(tr.id);
            await removeLiveClassNotifications({ trialId: tr.id, title: tr.course?.title });
            broadcastLMSEvent("TRIALS_CHANGED", { trialId: tr.id, ended: true });
          }
        } else {
          const tr = await prisma.trialRequest.findFirst({
            where: { meetingSpaceId: meetingID },
            include: { course: true },
          });
          if (tr && tr.status !== "COMPLETED") {
            await syncTrialSession(tr.id);
            await removeLiveClassNotifications({ trialId: tr.id, title: tr.course?.title });
            broadcastLMSEvent("TRIALS_CHANGED", { trialId: tr.id, ended: true });
          }
        }
      }
    }

    // Determine redirect destination based on authenticated user role or cookie
    const auth = await getAuthenticatedUser(request).catch(() => ({ user: null }));
    const cookieRole = request.cookies.get("edupulse_user_role")?.value;
    const isTutor =
      auth.user?.role === Role.TUTOR ||
      (auth.user?.role as any) === "INSTRUCTOR" ||
      cookieRole === "TUTOR" ||
      cookieRole === "INSTRUCTOR";
    const isAdmin = auth.user?.role === Role.ADMIN || cookieRole === "ADMIN";

    const baseUrl = getAppBaseUrl(request);

    if (isTutor) {
      return NextResponse.redirect(`${baseUrl}/tutor?tab=classes&sessionEnded=true`);
    } else if (isAdmin) {
      return NextResponse.redirect(`${baseUrl}/admin?sessionEnded=true`);
    } else {
      return NextResponse.redirect(`${baseUrl}/dashboard?sessionEnded=true`);
    }
  } catch (error) {
    console.error("[meetings/leave] Error during meeting leave handling:", error);
    const baseUrl = getAppBaseUrl(request);
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  }
}
