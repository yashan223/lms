/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  syncClassMeetingSession,
  syncTrialSession,
  autoSyncActiveBBBMeetings,
  isBigBlueButtonConfigured,
  getBBBConfig,
  createBBBMeeting,
  getBBBRecordings,
} from "@/lib/bigbluebutton";

export const dynamic = "force-dynamic";

// GET: internal health + trigger auto-sync (called by server.js background loop)
export async function GET(request: NextRequest) {
  const internalHeader = request.headers.get("x-internal-sync");
  if (internalHeader === "1") {
    const result = await autoSyncActiveBBBMeetings();
    return NextResponse.json({ success: true, ...result });
  }

  const isTest = request.nextUrl.searchParams.get("test") === "1";
  const bbbConfig = getBBBConfig();

  if (!isTest) {
    return NextResponse.json({
      ok: true,
      provider: "bigbluebutton",
      isBigBlueButtonConfigured: isBigBlueButtonConfigured(),
      bbbServerUrl: bbbConfig.url,
    });
  }

  let testMeetingError: string | null = null;
  let testMeetingId: string | null = null;

  try {
    const testResult = await createBBBMeeting({
      meetingId: `diagnostic-${Date.now()}`,
      name: "PulseEDU Diagnostic Room",
    });
    testMeetingId = testResult.meetingId;
  } catch (e: any) {
    testMeetingError = e.message || String(e);
  }

  return NextResponse.json({
    ok: true,
    provider: "bigbluebutton",
    isBigBlueButtonConfigured: isBigBlueButtonConfigured(),
    bbbServerUrl: bbbConfig.url,
    hasSecret: Boolean(bbbConfig.secret),
    testMeetingId,
    testMeetingError,
  });
}

export async function POST(request: NextRequest) {
  try {
    const internalSync = request.headers.get("x-internal-sync") === "1";
    let authed = internalSync;
    let authUser: any = null;

    if (!authed) {
      const auth = await getAuthenticatedUser(request, [Role.ADMIN, Role.TUTOR]);
      if (!auth.user) {
        return NextResponse.json(
          { error: auth.error || "Unauthorized" },
          { status: auth.status || 401 }
        );
      }
      authUser = auth.user;
      authed = true;
    }

    const body = await request.json();
    const { action, eventId, trialId, manualStartTime, manualEndTime, manualRecordingUrl } = body;

    // Only administrators can delete or remove recording URLs
    if (manualRecordingUrl === "" || manualRecordingUrl === null) {
      if (authUser?.role !== Role.ADMIN) {
        return NextResponse.json(
          { error: "Forbidden: Recordings can only be deleted or removed by an Administrator." },
          { status: 403 }
        );
      }
    }

    if (action === "auto_sync_all" || action === "sync_all") {
      const result = await autoSyncActiveBBBMeetings();
      return NextResponse.json({
        success: true,
        message: `Synchronized ${result.syncedEvents} classes and ${result.syncedTrials} trials with BigBlueButton.`,
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
      const result = await syncTrialSession(trialId, {
        manualStartTime: manualStartTime ? new Date(manualStartTime) : undefined,
        manualEndTime: manualEndTime ? new Date(manualEndTime) : undefined,
        manualRecordingUrl: manualRecordingUrl !== undefined ? manualRecordingUrl : undefined,
      });

      return NextResponse.json({
        success: true,
        trial: result.trial,
        message: result.message,
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    console.error("[BigBlueButton Meeting Sync Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to synchronize meeting session." },
      { status: 500 }
    );
  }
}
