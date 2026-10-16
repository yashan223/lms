/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { getSafeMeetingLink } from "@/lib/utils";
import {
  isGoogleWorkspaceConfigured,
  createGoogleWorkspaceMeetingSpace,
  createGoogleCalendarEventWithMeet,
  syncEventFromGoogleWorkspace,
} from "@/lib/google-workspace";
import { isGenericGoogleMeetNewLink } from "@/lib/utils";

export interface GoogleMeetSpace {
  meetingUri: string;
  spaceName?: string | null;
  meetingCode?: string | null;
  mode: "WORKSPACE_API" | "MANUAL";
}

export async function createGoogleMeetingSpace(opts?: {
  title?: string;
  meetingLink?: string | null;
  eventId?: string;
}): Promise<GoogleMeetSpace> {
  // If a valid, non-generic meeting room link is already provided, use it
  if (opts?.meetingLink?.trim() && !isGenericGoogleMeetNewLink(opts.meetingLink)) {
    const link = getSafeMeetingLink(opts.meetingLink);
    return {
      meetingUri: link,
      spaceName: null,
      meetingCode: link.split("/").pop() || null,
      mode: "MANUAL",
    };
  }

  if (isGoogleWorkspaceConfigured()) {
    try {
      const cal = await createGoogleCalendarEventWithMeet({
        title: opts?.title || "PulseEDU Live Session",
        startTime: new Date(),
        durationMinutes: 60,
      });
      if (cal.meetingUri && !isGenericGoogleMeetNewLink(cal.meetingUri)) {
        return {
          meetingUri: cal.meetingUri,
          spaceName: cal.spaceName,
          meetingCode: cal.meetingCode,
          mode: "WORKSPACE_API",
        };
      }
    } catch (err: any) {
      console.warn("[Google Meet] Google Calendar auto-creation failed:", err?.message || err);
    }
  }

  return {
    meetingUri: "",
    spaceName: null,
    meetingCode: null,
    mode: "MANUAL",
  };
}

export async function ensureValidGoogleMeetingLink(
  currentLink?: string | null,
  opts?: {
    title?: string;
    eventId?: string;
    startTime?: Date;
    durationMinutes?: number;
  }
): Promise<string> {
  if (currentLink?.trim() && !isGenericGoogleMeetNewLink(currentLink)) {
    return getSafeMeetingLink(currentLink);
  }

  if (isGoogleWorkspaceConfigured()) {
    try {
      const cal = await createGoogleCalendarEventWithMeet({
        title: opts?.title || "PulseEDU Live Session",
        startTime: opts?.startTime || new Date(),
        durationMinutes: opts?.durationMinutes ?? 60,
      });
      if (cal.meetingUri && !isGenericGoogleMeetNewLink(cal.meetingUri)) {
        return cal.meetingUri;
      }
    } catch (err: any) {
      console.warn("[Google Meet] Google Calendar auto-creation failed:", err?.message || err);
    }
  }

  return "";
}

export async function syncClassMeetingSession(
  eventId: string,
  opts?: {
    manualStartTime?: Date;
    manualEndTime?: Date;
    manualRecordingUrl?: string;
  }
): Promise<{
  success: boolean;
  event: any;
  message: string;
}> {
  if (
    isGoogleWorkspaceConfigured() &&
    !opts?.manualStartTime &&
    !opts?.manualEndTime &&
    !opts?.manualRecordingUrl
  ) {
    const wsResult = await syncEventFromGoogleWorkspace(eventId);
    if (wsResult.syncedWithGoogle) {
      return {
        success: true,
        event: wsResult.event,
        message: wsResult.message,
      };
    }
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      course: {
        include: {
          tutor: true,
          enrollments: { select: { userId: true } },
        },
      },
    },
  });

  if (!event) {
    throw new Error(`Class event with ID ${eventId} not found.`);
  }

  const actualStart = opts?.manualStartTime || event.actualStartTime || event.startedAt || new Date(event.dueDate);
  const actualEnd = opts?.manualEndTime || event.actualEndTime || new Date();
  const recordingUrl = opts?.manualRecordingUrl !== undefined ? (opts.manualRecordingUrl.trim() || null) : event.recordingUrl;
  const recordingStatus = recordingUrl ? "AVAILABLE" : (event.recordingStatus === "RECORDING" ? "RECORDING" : "NONE");

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: "COMPLETED",
      startedAt: actualStart,
      endedAt: actualEnd,
      actualStartTime: actualStart,
      actualEndTime: actualEnd,
      recordingUrl,
      recordingStatus,
    },
    include: {
      course: true,
    },
  });

  if (recordingUrl && event.courseId) {
    const enrollments = event.course?.enrollments || [];
    if (enrollments.length > 0) {
      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.userId,
          title: "🎥 Class Recording Available!",
          message: `The recording for "${event.title}" is now available to watch.`,
          type: "SUCCESS",
          link: recordingUrl || "/dashboard",
        })),
      });
      enrollments.forEach((e) =>
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: e.userId })
      );
    }
  }

  broadcastLMSEvent("EVENTS_CHANGED", { eventId, recordingUrl });

  return {
    success: true,
    event: updatedEvent,
    message: recordingUrl
      ? `Session completed! Recording link attached and students notified.`
      : `Session completed successfully.`,
  };
}
