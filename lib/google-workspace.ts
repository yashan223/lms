import fs from "fs";
import path from "path";
import { JWT } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";

interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
  projectId?: string;
  sourceFile?: string;
}

let cachedCredentials: ServiceAccountCredentials | null = null;

export function loadServiceAccountCredentials(): ServiceAccountCredentials | null {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  // 1. Try explicit path from GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  const rawPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH?.trim();
  const explicitPath = rawPath ? rawPath.replace(/^["']|["']$/g, "").trim() : "";

  if (explicitPath) {
    const fullPath = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.join(process.cwd(), explicitPath);

    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed.client_email && parsed.private_key) {
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = parsed.client_email;
          process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = parsed.private_key;
          if (parsed.project_id) process.env.GOOGLE_PROJECT_ID = parsed.project_id;
          console.log(`[Google Workspace] Loaded service account credentials from explicit JSON: ${explicitPath}`);
          cachedCredentials = {
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key.replace(/\\n/g, "\n"),
            projectId: parsed.project_id,
            sourceFile: explicitPath,
          };
          return cachedCredentials;
        }
      } catch (err) {
        console.warn(`[Google Workspace] Failed to parse key file at ${fullPath}:`, err);
      }
    }
  }

  // 2. Auto-detect service account JSON file in project root (e.g. pulseedu-*.json)
  try {
    const rootDir = process.cwd();
    const files = fs.readdirSync(rootDir);
    const keyFile = files.find(
      (f) =>
        (f.startsWith("pulseedu-") || f.startsWith("service-account") || f.includes("gserviceaccount")) &&
        f.endsWith(".json")
    );

    if (keyFile) {
      const fullPath = path.join(rootDir, keyFile);
      const raw = fs.readFileSync(fullPath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed.client_email && parsed.private_key) {
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = parsed.client_email;
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = parsed.private_key;
        if (parsed.project_id) process.env.GOOGLE_PROJECT_ID = parsed.project_id;
        console.log(`[Google Workspace] Auto-detected service account credentials from root JSON: ${keyFile}`);
        cachedCredentials = {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
          projectId: parsed.project_id,
          sourceFile: keyFile,
        };
        return cachedCredentials;
      }
    }
  } catch (err) {
    console.warn("[Google Workspace] Error scanning for root service account JSON:", err);
  }

  // 3. Fall back to GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const envEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (envEmail && envKey) {
    cachedCredentials = {
      clientEmail: envEmail,
      privateKey: envKey.replace(/\\n/g, "\n"),
    };
    return cachedCredentials;
  }

  return null;
}

export function isGoogleWorkspaceConfigured(): boolean {
  const creds = loadServiceAccountCredentials();
  return Boolean(
    creds?.clientEmail &&
    creds?.privateKey &&
    (process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || "admin@pulseedu.online")
  );
}

export function getGoogleWorkspaceAuthClient(subjectOverride?: string | null): JWT | null {
  const creds = loadServiceAccountCredentials();
  if (!creds?.clientEmail || !creds?.privateKey) {
    return null;
  }

  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || "admin@pulseedu.online";

  const effectiveSubject =
    subjectOverride === null
      ? undefined
      : subjectOverride !== undefined
      ? subjectOverride
      : adminEmail || undefined;

  return new JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    ...(effectiveSubject ? { subject: effectiveSubject } : {}),
    scopes: [
      "https://www.googleapis.com/auth/meetings.space.created",
      "https://www.googleapis.com/auth/meetings.space.readonly",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/admin.directory.user",
    ],
  });
}

async function extractClientHeaders(client: JWT): Promise<Record<string, string>> {
  try {
    const tokenRes = await client.getAccessToken();
    if (tokenRes?.token) {
      return {
        Authorization: `Bearer ${tokenRes.token}`,
      };
    }
  } catch {
    // Fall back to getRequestHeaders below
  }

  const raw = (await client.getRequestHeaders()) as any;
  const result: Record<string, string> = {};
  if (typeof raw?.forEach === "function") {
    raw.forEach((val: string, key: string) => {
      result[key] = val;
    });
  } else if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") result[k] = v;
    }
  }

  if (result["authorization"] && !result["Authorization"]) {
    result["Authorization"] = result["authorization"];
  }

  return result;
}

/**
 * Returns authorization headers for Google Workspace APIs.
 * Tries impersonating adminEmail first (for Workspace domain delegation).
 * If domain delegation is not enabled or throws unauthorized_client,
 * transparently falls back to direct Service Account credentials so Drive & Meet calls continue.
 */
export async function getGoogleWorkspaceHeaders(preferDirect = false): Promise<Record<string, string>> {
  if (preferDirect) {
    const directClient = getGoogleWorkspaceAuthClient(null);
    if (!directClient) throw new Error("Google Workspace credentials not configured");
    return extractClientHeaders(directClient);
  }

  const client = getGoogleWorkspaceAuthClient();
  if (!client) throw new Error("Google Workspace credentials not configured");

  try {
    return await extractClientHeaders(client);
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("unauthorized_client") || err?.status === 401) {
      console.warn(
        "[Google Workspace] Domain-wide delegation not authorized for admin user. Falling back to direct service account auth for Google Drive."
      );
      const directClient = getGoogleWorkspaceAuthClient(null);
      if (directClient) {
        return extractClientHeaders(directClient);
      }
    }
    throw err;
  }
}

export interface GoogleMeetSpaceResult {
  meetingUri: string;
  spaceName: string;
  meetingCode: string;
  calendarEventId?: string | null;
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

  const authHeaders = await getGoogleWorkspaceHeaders();

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
    calendarEventId: null,
  };
}

/**
 * Creates a Google Calendar event with a Google Meet conference attached.
 * This is the preferred method when scheduling a class — it tells Google Meet
 * the exact scheduled start/end time, so conference records and recordings
 * are correctly timestamped and attributed to the right session.
 */
export async function createGoogleCalendarEventWithMeet(opts: {
  title: string;
  description?: string;
  startTime: Date;
  durationMinutes?: number;
}): Promise<GoogleMeetSpaceResult> {
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || "admin@pulseedu.online";
  const authHeaders = await getGoogleWorkspaceHeaders();

  const startTimeObj =
    opts.startTime instanceof Date
      ? opts.startTime
      : opts.startTime
      ? new Date(opts.startTime)
      : new Date();
  const safeStartTime = isNaN(startTimeObj.getTime()) ? new Date() : startTimeObj;
  const startIso = safeStartTime.toISOString();
  const endTime = new Date(safeStartTime.getTime() + (opts.durationMinutes ?? 90) * 60 * 1000);
  const endIso = endTime.toISOString();

  const calEventBody = {
    summary: opts.title,
    description: opts.description || "",
    start: { dateTime: startIso, timeZone: "UTC" },
    end: { dateTime: endIso, timeZone: "UTC" },
    conferenceData: {
      createRequest: {
        requestId: `pulseedu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    attendees: [{ email: adminEmail, responseStatus: "accepted", organizer: true }],
    reminders: { useDefault: false },
    visibility: "public",
    guestsCanSeeOtherGuests: false,
  };

  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(adminEmail)}/events?conferenceDataVersion=1&sendNotifications=false`,
    {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(calEventBody),
    }
  );

  if (!calRes.ok) {
    const errText = await calRes.text();
    throw new Error(`Google Calendar event creation failed (${calRes.status}): ${errText}`);
  }

  const calEvent = await calRes.json();
  const hangoutLink: string = calEvent.hangoutLink || "";
  const calendarEventId: string = calEvent.id || "";

  // Derive Meet space name from the hangout link (meet.google.com/abc-defg-hij → spaces/abc-defg-hij)
  const meetCode = hangoutLink.split("/").pop() || "";
  const spaceName = meetCode ? `spaces/${meetCode}` : "";

  console.log(
    `[Google Calendar] Scheduled "${opts.title}" (${startIso}) — Meet: ${hangoutLink}`
  );

  return {
    meetingUri: hangoutLink,
    spaceName,
    meetingCode: meetCode,
    calendarEventId,
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

/**
 * Searches Google Drive for an MP4 recording file corresponding to a Google Meet session.
 * Google Meet automatically deposits recorded video files into Google Drive.
 * This searches the organizer's Drive for matching recordings, marks them public, and returns the view link.
 */
export async function searchGoogleDriveForRecording(opts: {
  meetingCode?: string;
  title?: string;
  afterDate?: Date;
}): Promise<{ recordingUrl: string; driveFileId: string } | null> {
  try {
    const authHeaders = await getGoogleWorkspaceHeaders();
    const queryParts = ["trashed = false", "(mimeType contains 'video/' or mimeType = 'video/mp4')"];

    if (opts.afterDate) {
      // Look from up to 2 hours before scheduled time, ensuring we don't query a future timestamp
      const candidateTime = opts.afterDate.getTime() - 2 * 60 * 60 * 1000;
      const windowStartTime = Math.min(candidateTime, Date.now() - 30 * 60 * 1000);
      const windowStart = new Date(windowStartTime).toISOString();
      queryParts.push(`createdTime >= '${windowStart}'`);
    }

    const q = encodeURIComponent(queryParts.join(" and "));
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,createdTime)&orderBy=createdTime desc&pageSize=25&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: authHeaders }
    );

    if (!searchRes.ok) {
      return null;
    }

    const data = await searchRes.json();
    const files: any[] = data.files || [];
    if (files.length === 0) return null;

    let matched: any = null;
    const cleanCode = opts.meetingCode ? opts.meetingCode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
    const codeDashed = opts.meetingCode ? opts.meetingCode.toLowerCase() : "";

    // 1. Try matching by meeting code
    if (codeDashed) {
      matched = files.find((f) => {
        const name = (f.name || "").toLowerCase();
        return name.includes(codeDashed) || (cleanCode && name.replace(/[^a-zA-Z0-9]/g, "").includes(cleanCode));
      });
    }

    // 2. Try matching by class/event title keywords
    if (!matched && opts.title) {
      const cleanTitle = opts.title.trim().toLowerCase();
      const titleWords = cleanTitle.split(/\s+/).filter((w) => w.length > 3);
      matched = files.find((f) => {
        const name = (f.name || "").toLowerCase();
        if (name.includes(cleanTitle)) return true;
        return titleWords.length > 0 && titleWords.some((w) => name.includes(w));
      });
    }

    // 3. Fall back to most recent file only if no meeting code and no title were specified
    if (!matched && !opts.meetingCode && !opts.title && files.length > 0) {
      matched = files[0];
    }

    if (!matched) return null;

    const driveFileId = matched.id;

    // Set public view permissions so students can watch without restriction
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions?supportsAllDrives=true`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      });
    } catch (permErr) {
      console.warn("[Google Drive] Could not set public permission on recording:", permErr);
    }

    const recordingUrl = matched.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;
    console.log(`[Google Drive] Discovered class recording file "${matched.name}": ${recordingUrl}`);
    return { recordingUrl, driveFileId };
  } catch (err) {
    console.warn("[Google Drive] Recording search error:", err);
    return null;
  }
}

export async function fetchGoogleMeetSessionData(
  spaceIdentifier: string,
  opts?: {
    title?: string;
    afterDate?: Date;
  }
): Promise<GoogleSessionSyncResult | null> {
  if (!isGoogleWorkspaceConfigured()) return null;

  try {
    const authHeaders = await getGoogleWorkspaceHeaders();
    const cleanSpaceName = spaceIdentifier.startsWith("spaces/")
      ? spaceIdentifier
      : `spaces/${spaceIdentifier}`;

    const meetingCode = cleanSpaceName.replace(/^spaces\//, "");

    // Resolve canonical space name if it's a meeting code (e.g. spaces/abc-defg-hij)
    let canonicalSpaceName = cleanSpaceName;
    try {
      const spaceGetRes = await fetch(`https://meet.googleapis.com/v2/${cleanSpaceName}`, {
        headers: authHeaders,
      });
      if (spaceGetRes.ok) {
        const spaceObj = await spaceGetRes.json();
        if (spaceObj?.name) {
          canonicalSpaceName = spaceObj.name;
        }
      }
    } catch {}

    const filterQuery = encodeURIComponent(`space.name="${canonicalSpaceName}"`);
    const confListRes = await fetch(
      `https://meet.googleapis.com/v2/conferenceRecords?filter=${filterQuery}&pageSize=10`,
      { headers: authHeaders }
    );

    let conferenceRecordId: string | null = null;
    let actualStartTime: Date | null = null;
    let actualEndTime: Date | null = null;
    let isCompleted = false;
    let recordingUrl: string | null = null;
    let recordingStatus: string | null = "NONE";
    let driveFileId: string | null = null;

    if (confListRes.ok) {
      const confData = await confListRes.json();
      const records: any[] = confData.conferenceRecords || [];

      if (records.length > 0) {
        records.sort((a, b) => {
          const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
          const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
          return timeB - timeA;
        });

        const latest = records[0];
        conferenceRecordId = latest.name;
        actualStartTime = latest.startTime ? new Date(latest.startTime) : null;
        actualEndTime = latest.endTime ? new Date(latest.endTime) : null;
        isCompleted = Boolean(latest.endTime);
        recordingStatus = isCompleted ? "PROCESSING" : "RECORDING";

        // Step 1: Check Meet API conference record recordings
        if (conferenceRecordId) {
          try {
            const recordingsRes = await fetch(
              `https://meet.googleapis.com/v2/${conferenceRecordId}/recordings`,
              { headers: authHeaders }
            );

            if (recordingsRes.ok) {
              const recData = await recordingsRes.json();
              const recordings: any[] = recData.recordings || [];
              const fileGenRec =
                recordings.find((r) => r.state === "FILE_GENERATED" && r.driveDestination?.file) ||
                recordings[0];

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
                    body: JSON.stringify({ role: "reader", type: "anyone" }),
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
      }
    }

    // Step 2: Fallback — check Google Drive directly for saved recordings
    if (!recordingUrl) {
      const driveMatch = await searchGoogleDriveForRecording({
        meetingCode,
        title: opts?.title,
        afterDate: opts?.afterDate || actualStartTime || undefined,
      });

      if (driveMatch) {
        recordingUrl = driveMatch.recordingUrl;
        driveFileId = driveMatch.driveFileId;
        recordingStatus = "AVAILABLE";
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
    const sessionData = await fetchGoogleMeetSessionData(spaceName, {
      title: event.title,
      afterDate: event.dueDate,
    });
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
      : `Class session checked. Google Workspace integration is active.`,
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
    const sessionData = await fetchGoogleMeetSessionData(spaceName, {
      title: trial.topic || "Trial Consultation",
      afterDate: trial.preferredDate,
    });
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

  // Look back up to 7 days for sessions awaiting recording or actual end times
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const pendingEvents = await prisma.event.findMany({
    where: {
      meetingLink: { not: null },
      AND: [
        {
          OR: [
            { dueDate: { gte: recentCutoff } },
            { startedAt: { gte: recentCutoff } },
            { status: "LIVE" },
          ],
        },
        {
          OR: [
            { status: { in: ["SCHEDULED", "LIVE"] } },
            { recordingUrl: null, recordingStatus: { not: "AVAILABLE" } },
          ],
        },
      ],
    },
    select: { id: true, status: true, startedAt: true },
    take: 30,
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
      AND: [
        {
          OR: [
            { preferredDate: { gte: recentCutoff } },
            { actualStartTime: { gte: recentCutoff } },
            { status: "CONFIRMED" },
          ],
        },
        {
          OR: [
            { status: { in: ["CONFIRMED", "PENDING"] } },
            { recordingUrl: null, recordingStatus: { not: "AVAILABLE" } },
          ],
        },
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

export interface CreateWorkspaceTutorResult {
  success: boolean;
  workspaceEmail: string;
  alreadyExisted?: boolean;
  error?: string;
  activationUrl?: string;
}

/**
 * Formats a phone number to strict E.164 format (+[country_code][number]),
 * which is strictly required by Google Workspace Admin Directory API for recoveryPhone.
 * If the number cannot be reliably formatted to E.164, returns undefined so Google
 * does not reject the account creation with "Invalid recovery phone".
 */
export function formatToE164Phone(rawPhone?: string): string | undefined {
  if (!rawPhone || typeof rawPhone !== "string") return undefined;

  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");
  if (!cleaned) return undefined;

  // If starts with 00 (common international prefix like 0094...), replace with +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // If starts with 0 followed by 9 digits (common local Sri Lankan mobile e.g. 0771234567)
  if (/^0[1-9]\d{8}$/.test(cleaned)) {
    cleaned = "+94" + cleaned.slice(1);
  } else if (/^[1-9]\d{8}$/.test(cleaned)) {
    // 771234567 without leading 0 or +94
    cleaned = "+94" + cleaned;
  }

  // If already starts with +
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.slice(1).replace(/\D/g, "");
    // E.164 requires 8 to 15 digits after +
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
    return undefined;
  }

  // If digits only without +, but has valid country code length (e.g. 94771234567)
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return undefined;
}

/**
 * Creates an official Google Workspace user account for a tutor.
 * Uses the Google Workspace Admin Directory API.
 * The created account gets an @pulseedu.online email address, with Drive, Meet, and Calendar enabled.
 */
export async function createGoogleWorkspaceTutorAccount(params: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  customUsername?: string;
}): Promise<CreateWorkspaceTutorResult> {
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim() || "admin@pulseedu.online";
  const domain = adminEmail.split("@")[1] || "pulseedu.online";

  // Parse name into givenName and familyName
  const nameParts = params.name.trim().split(/\s+/);
  const givenName = nameParts[0] || "Tutor";
  const hasExplicitLastName = nameParts.length > 1;
  const familyName = hasExplicitLastName ? nameParts.slice(1).join(" ") : "Tutor";

  // Determine official Google Workspace primary email
  let primaryEmail: string;
  if (params.customUsername?.trim()) {
    const cleanUser = params.customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    primaryEmail = `${cleanUser}@${domain}`;
  } else if (params.email.toLowerCase().trim().endsWith(`@${domain}`)) {
    primaryEmail = params.email.toLowerCase().trim();
  } else {
    const cleanFirst = givenName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLast = hasExplicitLastName ? familyName.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const baseSlug = cleanLast ? `${cleanFirst}.${cleanLast}` : cleanFirst;
    primaryEmail = `${baseSlug}@${domain}`;
  }

  // Ensure password satisfies Google's 8+ char requirement
  let initialPassword = params.password?.trim() || "PulseEduTutor2026!";
  if (initialPassword.length < 8) {
    initialPassword = `${initialPassword}123!`;
  }

  console.log(`[Google Workspace] Provisioning tutor account: ${primaryEmail} for "${params.name}"...`);

  try {
    const authHeaders = await getGoogleWorkspaceHeaders();
    const validatedPhone = formatToE164Phone(params.phone);
    if (params.phone?.trim() && !validatedPhone) {
      console.warn(
        `[Google Workspace] Phone "${params.phone}" could not be converted to valid E.164. Omitting recoveryPhone to prevent Google Directory 400 error.`
      );
    }

    const userBody: any = {
      primaryEmail,
      name: {
        givenName,
        familyName,
      },
      password: initialPassword,
      changePasswordAtNextLogin: false,
      recoveryEmail: params.email.toLowerCase().trim() !== primaryEmail ? params.email.trim() : undefined,
      orgUnitPath: "/",
    };

    if (validatedPhone) {
      userBody.recoveryPhone = validatedPhone;
    }

    const res = await fetch("https://admin.googleapis.com/admin/directory/v1/users", {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userBody),
    });

    if (res.status === 200 || res.status === 201) {
      console.log(`✅ [Google Workspace] Successfully created tutor account: ${primaryEmail}`);
      return {
        success: true,
        workspaceEmail: primaryEmail,
        alreadyExisted: false,
      };
    }

    if (res.status === 409) {
      console.log(`ℹ️ [Google Workspace] Account ${primaryEmail} already exists in domain.`);
      return {
        success: true,
        workspaceEmail: primaryEmail,
        alreadyExisted: true,
      };
    }

    const errText = await res.text();
    console.warn(`⚠️ [Google Workspace] Directory API error (${res.status}):`, errText);

    // If Google rejected due to recovery phone format, retry immediately without recovery phone
    if (res.status === 400 && (errText.includes("recovery phone") || errText.includes("recoveryPhone"))) {
      console.warn(`[Google Workspace] Retrying user creation for ${primaryEmail} without recovery phone...`);
      delete userBody.recoveryPhone;
      const retryRes = await fetch("https://admin.googleapis.com/admin/directory/v1/users", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userBody),
      });

      if (retryRes.status === 200 || retryRes.status === 201) {
        console.log(`✅ [Google Workspace] Successfully created tutor account (after removing invalid recovery phone): ${primaryEmail}`);
        return {
          success: true,
          workspaceEmail: primaryEmail,
          alreadyExisted: false,
        };
      }
    }

    let activationUrl: string | undefined;
    if (errText.includes("SERVICE_DISABLED") || errText.includes("Admin SDK API has not been used")) {
      const match = errText.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/admin\.googleapis\.com[^\s"\\]+/);
      activationUrl = match ? match[0] : "https://console.developers.google.com/apis/api/admin.googleapis.com/overview?project=831593032090";
    }

    return {
      success: false,
      workspaceEmail: primaryEmail,
      error: `Google Workspace API returned status ${res.status}`,
      activationUrl,
    };
  } catch (err: any) {
    console.error(`❌ [Google Workspace] Failed to provision tutor account ${primaryEmail}:`, err);
    return {
      success: false,
      workspaceEmail: primaryEmail,
      error: err?.message || "Failed to connect to Google Workspace Admin Directory API",
    };
  }
}
