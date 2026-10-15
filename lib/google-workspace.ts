import { JWT } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";

export function isGoogleWorkspaceConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() &&
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim()
  );
}

export function getGoogleWorkspaceAuthClient(): JWT | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim();

  if (!clientEmail || !privateKey || !adminEmail) {
    return null;
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  return new JWT({
    email: clientEmail,
    key: privateKey,
    subject: adminEmail,
    scopes: [
      "https://www.googleapis.com/auth/meetings.space.created",
      "https://www.googleapis.com/auth/meetings.space.readonly",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });
}

export interface GoogleMeetSpaceResult {
  meetingUri: string;
  spaceName: string;
  meetingCode: string;
}

export async function createGoogleWorkspaceMeetingSpace(opts?: {
  title?: string;
  eventId?: string;
}): Promise<GoogleMeetSpaceResult> {
  const auth = getGoogleWorkspaceAuthClient();
  if (!auth) {
    throw new Error(
      "Google Workspace Service Account is not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_WORKSPACE_ADMIN_EMAIL in your environment."
    );
  }

  const authHeaders = await auth.getRequestHeaders();

  const response = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      config: {
        accessType: "OPEN",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Meet space creation failed (${response.status}): ${errorText}`);
  }

  const space = await response.json();
  const meetingUri = space.meetingUri || `https://meet.google.com/${space.meetingCode}`;
  const spaceName = space.name || "";
  const meetingCode = space.meetingCode || spaceName.split("/").pop() || "";

  return {
    meetingUri,
    spaceName,
    meetingCode,
  };
}

export interface GoogleSessionSyncResult {
  conferenceRecordId?: string | null;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  recordingUrl?: string | null;
  recordingStatus?: string | null;
  isCompleted: boolean;
  driveFileId?: string | null;
}

export async function fetchGoogleMeetSessionData(
  spaceIdentifier: string
): Promise<GoogleSessionSyncResult | null> {
  const auth = getGoogleWorkspaceAuthClient();
  if (!auth) return null;

  try {
    const authHeaders = await auth.getRequestHeaders();
    const cleanSpaceName = spaceIdentifier.startsWith("spaces/")
      ? spaceIdentifier
      : `spaces/${spaceIdentifier}`;

    const filterQuery = encodeURIComponent(`space.name="${cleanSpaceName}"`);
    const confListRes = await fetch(
      `https://meet.googleapis.com/v2/conferenceRecords?filter=${filterQuery}&pageSize=10`,
      { headers: authHeaders }
    );

    if (!confListRes.ok) {
      console.warn(`[Google Meet] Failed to list conference records (${confListRes.status})`);
      return null;
    }

    const confData = await confListRes.json();
    const records: any[] = confData.conferenceRecords || [];
    if (records.length === 0) {
      return null;
    }

    records.sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return timeB - timeA;
    });

    const latest = records[0];
    const conferenceRecordId = latest.name;

    const actualStartTime = latest.startTime ? new Date(latest.startTime) : null;
    const actualEndTime = latest.endTime ? new Date(latest.endTime) : null;
    const isCompleted = Boolean(latest.endTime);

    let recordingUrl: string | null = null;
    let recordingStatus: string | null = isCompleted ? "PROCESSING" : "NONE";
    let driveFileId: string | null = null;

    if (conferenceRecordId) {
      try {
        const recordingsRes = await fetch(
          `https://meet.googleapis.com/v2/${conferenceRecordId}/recordings`,
          { headers: authHeaders }
        );

        if (recordingsRes.ok) {
          const recData = await recordingsRes.json();
          const recordings: any[] = recData.recordings || [];
          const fileGenRec = recordings.find(
            (r) => r.state === "FILE_GENERATED" && r.driveDestination?.file
          ) || recordings[0];

          if (fileGenRec?.driveDestination?.file) {
            driveFileId = fileGenRec.driveDestination.file;
            recordingStatus = "AVAILABLE";

            try {
              await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions`, {
                method: "POST",
                headers: {
                  ...authHeaders,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  role: "reader",
                  type: "anyone",
                }),
              });

              const fileRes = await fetch(
                `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=id,name,webViewLink,webContentLink`,
                { headers: authHeaders }
              );

              if (fileRes.ok) {
                const fileData = await fileRes.json();
                recordingUrl = fileData.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;
              } else {
                recordingUrl = `https://drive.google.com/file/d/${driveFileId}/view`;
              }
            } catch (driveErr) {
              console.warn("[Google Drive] Error setting permissions on recording:", driveErr);
              recordingUrl =
                fileGenRec.driveDestination.exportUri ||
                `https://drive.google.com/file/d/${driveFileId}/view`;
            }
          } else if (recordings.some((r) => r.state === "STARTED")) {
            recordingStatus = "RECORDING";
          }
        }
      } catch (recErr) {
        console.warn("[Google Meet] Error listing recordings:", recErr);
      }
    }

    return {
      conferenceRecordId,
      actualStartTime,
      actualEndTime,
      recordingUrl,
      recordingStatus,
      isCompleted,
      driveFileId,
    };
  } catch (error) {
    console.error("[Google Workspace] fetchGoogleMeetSessionData error:", error);
    return null;
  }
}

export async function syncEventFromGoogleWorkspace(eventId: string): Promise<{
  success: boolean;
  event: any;
  message: string;
  syncedWithGoogle: boolean;
}> {
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
    throw new Error(`Event with ID ${eventId} not found.`);
  }

  let spaceName = event.meetingSpaceId;
  if (!spaceName && event.meetingLink) {
    const match = event.meetingLink.match(/meet\.google\.com\/([a-z0-9-]+)/i);
    if (match?.[1]) {
      spaceName = `spaces/${match[1]}`;
    }
  }

  let actualStart = event.actualStartTime || event.startedAt;
  let actualEnd = event.actualEndTime || event.endedAt;
  let recordingUrl = event.recordingUrl;
  let recordingStatus = event.recordingStatus;
  let conferenceRecordId = event.conferenceRecordId;
  let newStatus = event.status;
  let syncedWithGoogle = false;

  if (spaceName && isGoogleWorkspaceConfigured()) {
    const sessionData = await fetchGoogleMeetSessionData(spaceName);
    if (sessionData) {
      syncedWithGoogle = true;
      if (sessionData.actualStartTime) actualStart = sessionData.actualStartTime;
      if (sessionData.actualEndTime) actualEnd = sessionData.actualEndTime;
      if (sessionData.conferenceRecordId) conferenceRecordId = sessionData.conferenceRecordId;
      if (sessionData.recordingUrl) recordingUrl = sessionData.recordingUrl;
      if (sessionData.recordingStatus) recordingStatus = sessionData.recordingStatus;
      if (sessionData.isCompleted) newStatus = "COMPLETED";
    }
  }

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: newStatus,
      startedAt: actualStart,
      endedAt: actualEnd,
      actualStartTime: actualStart,
      actualEndTime: actualEnd,
      conferenceRecordId,
      recordingUrl,
      recordingStatus,
    },
    include: {
      course: true,
    },
  });

  if (recordingUrl && recordingUrl !== event.recordingUrl && event.courseId) {
    const enrollments = event.course?.enrollments || [];
    if (enrollments.length > 0) {
      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.userId,
          title: "🎥 Class Recording Ready on Google Drive!",
          message: `The official class recording for "${event.title}" is now available to watch on Google Drive.`,
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
    message: syncedWithGoogle
      ? `Synchronized class session with Google Workspace. ${recordingUrl ? "Recording attached from Google Drive." : "Awaiting recording export."}`
      : `Class session checked. Google Workspace integration is not yet active.`,
    syncedWithGoogle,
  };
}

export async function syncTrialFromGoogleWorkspace(trialId: string): Promise<{
  success: boolean;
  trial: any;
  message: string;
  syncedWithGoogle: boolean;
}> {
  const trial = await prisma.trialRequest.findUnique({
    where: { id: trialId },
    include: {
      course: true,
      tutor: true,
      student: true,
    },
  });

  if (!trial) {
    throw new Error(`Trial consultation with ID ${trialId} not found.`);
  }

  let spaceName = trial.meetingSpaceId;
  if (!spaceName && trial.meetingLink) {
    const match = trial.meetingLink.match(/meet\.google\.com\/([a-z0-9-]+)/i);
    if (match?.[1]) {
      spaceName = `spaces/${match[1]}`;
    }
  }

  let actualStart = trial.actualStartTime;
  let actualEnd = trial.actualEndTime;
  let recordingUrl = trial.recordingUrl;
  let recordingStatus = trial.recordingStatus;
  let conferenceRecordId = trial.conferenceRecordId;
  let newStatus = trial.status;
  let syncedWithGoogle = false;

  if (spaceName && isGoogleWorkspaceConfigured()) {
    const sessionData = await fetchGoogleMeetSessionData(spaceName);
    if (sessionData) {
      syncedWithGoogle = true;
      if (sessionData.actualStartTime) actualStart = sessionData.actualStartTime;
      if (sessionData.actualEndTime) actualEnd = sessionData.actualEndTime;
      if (sessionData.conferenceRecordId) conferenceRecordId = sessionData.conferenceRecordId;
      if (sessionData.recordingUrl) recordingUrl = sessionData.recordingUrl;
      if (sessionData.recordingStatus) recordingStatus = sessionData.recordingStatus;
      if (sessionData.isCompleted) newStatus = "COMPLETED";
    }
  }

  const updatedTrial = await prisma.trialRequest.update({
    where: { id: trialId },
    data: {
      status: newStatus,
      actualStartTime: actualStart,
      actualEndTime: actualEnd,
      conferenceRecordId,
      recordingUrl,
      recordingStatus,
    },
    include: {
      course: true,
      tutor: true,
      student: true,
    },
  });

  broadcastLMSEvent("TRIALS_CHANGED", { trialId, recordingUrl });

  return {
    success: true,
    trial: updatedTrial,
    message: syncedWithGoogle
      ? `Synchronized trial consultation session with Google Workspace.`
      : `Trial consultation session checked.`,
    syncedWithGoogle,
  };
}

export async function autoSyncActiveGoogleWorkspaceMeetings(): Promise<{
  syncedEvents: number;
  syncedTrials: number;
}> {
  if (!isGoogleWorkspaceConfigured()) {
    return { syncedEvents: 0, syncedTrials: 0 };
  }

  const recentCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const pendingEvents = await prisma.event.findMany({
    where: {
      meetingLink: { not: null },
      dueDate: { gte: recentCutoff },
      OR: [
        { status: { in: ["SCHEDULED", "LIVE"] } },
        { recordingUrl: null, recordingStatus: { not: "AVAILABLE" } },
      ],
    },
    select: { id: true },
    take: 25,
  });

  let syncedEvents = 0;
  for (const ev of pendingEvents) {
    try {
      const res = await syncEventFromGoogleWorkspace(ev.id);
      if (res.syncedWithGoogle) syncedEvents++;
    } catch (err) {
      console.warn(`Error auto-syncing event ${ev.id}:`, err);
    }
  }

  const pendingTrials = await prisma.trialRequest.findMany({
    where: {
      meetingLink: { not: null },
      preferredDate: { gte: recentCutoff },
      OR: [
        { status: { in: ["CONFIRMED", "PENDING"] } },
        { recordingUrl: null, recordingStatus: { not: "AVAILABLE" } },
      ],
    },
    select: { id: true },
    take: 15,
  });

  let syncedTrials = 0;
  for (const tr of pendingTrials) {
    try {
      const res = await syncTrialFromGoogleWorkspace(tr.id);
      if (res.syncedWithGoogle) syncedTrials++;
    } catch (err) {
      console.warn(`Error auto-syncing trial ${tr.id}:`, err);
    }
  }

  return { syncedEvents, syncedTrials };
}
