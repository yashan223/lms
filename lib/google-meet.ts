/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { getSafeMeetingLink } from "@/lib/utils";
import {
  isGoogleWorkspaceConfigured,
  createGoogleWorkspaceMeetingSpace,
  syncEventFromGoogleWorkspace,
} from "@/lib/google-workspace";

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
  if (isGoogleWorkspaceConfigured() && !opts?.meetingLink?.trim()) {
    try {
      const space = await createGoogleWorkspaceMeetingSpace({
        title: opts?.title,
        eventId: opts?.eventId,
      });
      return {
        meetingUri: space.meetingUri,
        spaceName: space.spaceName,
        meetingCode: space.meetingCode,
        mode: "WORKSPACE_API",
      };
    } catch (err) {
      console.warn("[Google Meet] Failed to create Workspace space via API, falling back to manual link:", err);
    }
  }

  const link = opts?.meetingLink?.trim() ? getSafeMeetingLink(opts.meetingLink) : "";
  return {
    meetingUri: link,
    spaceName: null,
    meetingCode: link ? link.split("/").pop() || null : null,
    mode: "MANUAL",
  };
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
