/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { syncClassMeetingSession } from "@/lib/google-meet";
import {
  syncTrialFromGoogleWorkspace,
  autoSyncActiveGoogleWorkspaceMeetings,
  isGoogleWorkspaceConfigured,
} from "@/lib/google-workspace";
import { broadcastLMSEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

// GET: lightweight internal health + trigger auto-sync (called by server.js background loop)
export async function GET(request: NextRequest) {
  const internalHeader = request.headers.get("x-internal-sync");
  if (internalHeader === "1") {
    const result = await autoSyncActiveGoogleWorkspaceMeetings();
    return NextResponse.json({ success: true, ...result });
  }

  const isTest = request.nextUrl.searchParams.get("test") === "1";
  if (!isTest) {
    return NextResponse.json({
      ok: true,
      isGoogleWorkspaceConfigured: isGoogleWorkspaceConfigured(),
    });
  }

  let calendarError: string | null = null;
  let calendarLink: string | null = null;
  let meetApiError: string | null = null;
  let meetApiLink: string | null = null;
  const { createGoogleCalendarEventWithMeet, createGoogleWorkspaceMeetingSpace, loadServiceAccountCredentials } = await import("@/lib/google-workspace");
  const creds = loadServiceAccountCredentials();

  try {
    const res = await createGoogleCalendarEventWithMeet({ title: "Diagnostic Test", startTime: new Date() });
    calendarLink = res.meetingUri;
  } catch (e: any) {
    calendarError = e.message || String(e);
  }

  try {
    const res = await createGoogleWorkspaceMeetingSpace({ title: "Diagnostic Meet Space" });
    meetApiLink = res.meetingUri;
  } catch (e: any) {
    meetApiError = e.message || String(e);
  }

  return NextResponse.json({
    ok: true,
    isGoogleWorkspaceConfigured: isGoogleWorkspaceConfigured(),
    clientEmail: creds?.clientEmail || null,
    hasKey: Boolean(creds?.privateKey),
    adminEmail: process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL,
    calendarLink,
    calendarError,
    meetApiLink,
    meetApiError,
  });
}

export async function POST(request: NextRequest) {
  try {
    const internalSync = request.headers.get("x-internal-sync") === "1";
    let authed = internalSync;

    if (!authed) {
      const auth = await getAuthenticatedUser(request, [Role.ADMIN, Role.TUTOR]);
      if (!auth.user) {
        return NextResponse.json(
          { error: auth.error || "Unauthorized" },
          { status: auth.status || 401 }
        );
      }
      authed = true;
    }

    const body = await request.json();
    const { action, eventId, trialId, manualStartTime, manualEndTime, manualRecordingUrl } = body;

    if (action === "auto_sync_all" || action === "sync_all") {
      const result = await autoSyncActiveGoogleWorkspaceMeetings();
      return NextResponse.json({
        success: true,
        message: `Synchronized ${result.syncedEvents} classes and ${result.syncedTrials} trials with Google Workspace.`,
        ...result,
      });
    }

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
        manualRecordingUrl: manualRecordingUrl !== undefined ? manualRecordingUrl : undefined,
      });

      return NextResponse.json({
        success: true,
        event: result.event,
        message: result.message,
      });
    }

    if (trialId) {
      if (
        isGoogleWorkspaceConfigured() &&
        !manualStartTime &&
        !manualEndTime &&
        manualRecordingUrl === undefined
      ) {
        const wsResult = await syncTrialFromGoogleWorkspace(trialId);
        if (wsResult.syncedWithGoogle) {
          return NextResponse.json({
            success: true,
            trial: wsResult.trial,
            message: wsResult.message,
          });
        }
      }
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
      const recordingUrl = manualRecordingUrl !== undefined ? (manualRecordingUrl.trim() || null) : trial.recordingUrl;
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

      // Also update linked Event in calendar if present
      await prisma.event.updateMany({
        where: { description: { contains: trialId } },
        data: {
          status: "COMPLETED",
          actualStartTime: actualStart,
          actualEndTime: actualEnd,
          recordingUrl,
          recordingStatus,
        },
      }).catch(() => {});

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
      broadcastLMSEvent("EVENTS_CHANGED");

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
