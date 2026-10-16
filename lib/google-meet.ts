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

export function generateRandomMeetCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(3)}-${part(4)}-${part(3)}`;
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
      const space = await createGoogleWorkspaceMeetingSpace({
        title: opts?.title,
        eventId: opts?.eventId,
      });
      if (space.meetingUri && !isGenericGoogleMeetNewLink(space.meetingUri)) {
        return {
          meetingUri: space.meetingUri,
          spaceName: space.spaceName,
          meetingCode: space.meetingCode,
          mode: "WORKSPACE_API",
        };
      }
    } catch (err) {
      console.warn("[Google Meet] Failed to create Workspace space via API, generating dedicated Meet room:", err);
    }
  }

  // Ensure every scheduled session always receives a dedicated, unique Google Meet room (never meet.google.com/new)
  const autoCode = generateRandomMeetCode();
  const autoLink = `https://meet.google.com/${autoCode}`;
  return {
    meetingUri: autoLink,
    spaceName: `spaces/${autoCode}`,
    meetingCode: autoCode,
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

  if (isGoogleWorkspaceConfigured() && opts?.startTime) {
    try {
      const cal = await createGoogleCalendarEventWithMeet({
        title: opts.title || "PulseEDU Live Session",
        startTime: opts.startTime,
        durationMinutes: opts.durationMinutes ?? 60,
      });
      if (cal.meetingUri && !isGenericGoogleMeetNewLink(cal.meetingUri)) {
        return cal.meetingUri;
      }
    } catch (err) {
      console.warn("[Google Meet] Calendar with Meet failed, falling back to space:", err);
    }
  }

  const space = await createGoogleMeetingSpace({
    title: opts?.title,
    eventId: opts?.eventId,
  });
  return space.meetingUri;
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
  const recordingUrl = opts?.manualRecordingUrl?.trim() || event.recordingUrl;
  const recordingStatus = recordingUrl ? "AVAILABLE" : "NONE";

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
