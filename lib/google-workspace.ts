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

export function getGoogleWorkspaceAuthClient(subjectOverride?: string | null): JWT | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL?.trim();

  if (!clientEmail || !privateKey) {
    return null;
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  const effectiveSubject =
    subjectOverride === null
      ? undefined
      : subjectOverride !== undefined
      ? subjectOverride
      : adminEmail || undefined;

  return new JWT({
    email: clientEmail,
    key: privateKey,
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
    return (await directClient.getRequestHeaders()) as unknown as Record<string, string>;
  }

  const client = getGoogleWorkspaceAuthClient();
  if (!client) throw new Error("Google Workspace credentials not configured");

  try {
    return (await client.getRequestHeaders()) as unknown as Record<string, string>;
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("unauthorized_client") || err?.status === 401) {
      console.warn(
        "[Google Workspace] Domain-wide delegation not authorized for admin user. Falling back to direct service account auth for Google Drive."
      );
      const directClient = getGoogleWorkspaceAuthClient(null);
      if (directClient) {
        return (await directClient.getRequestHeaders()) as unknown as Record<string, string>;
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
  const auth = getGoogleWorkspaceAuthClient();
  if (!auth) {
    throw new Error("Google Workspace Service Account is not configured.");
  }

  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL!.trim();
  const authHeaders = await auth.getRequestHeaders();

  const startIso = opts.startTime.toISOString();
  const endTime = new Date(opts.startTime.getTime() + (opts.durationMinutes ?? 90) * 60 * 1000);
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
    const queryParts = ["trashed = false", "mimeType = 'video/mp4'"];

    if (opts.afterDate) {
      // Look from 2 hours before scheduled time
      const windowStart = new Date(opts.afterDate.getTime() - 2 * 60 * 60 * 1000).toISOString();
      queryParts.push(`createdTime >= '${windowStart}'`);
    }

    const q = encodeURIComponent(queryParts.join(" and "));
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,createdTime)&orderBy=createdTime desc&pageSize=15`,
      { headers: authHeaders }
    );

    if (!searchRes.ok) {
      return null;
    }

    const data = await searchRes.json();
    const files: any[] = data.files || [];
    if (files.length === 0) return null;

    let matched = files[0];
    if (opts.meetingCode) {
      const cleanCode = opts.meetingCode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const codeDashed = opts.meetingCode.toLowerCase();
      const byCode = files.find((f) => {
        const name = (f.name || "").toLowerCase();
        return name.includes(codeDashed) || name.replace(/[^a-zA-Z0-9]/g, "").includes(cleanCode);
      });
      if (byCode) matched = byCode;
    }

    if (!matched) return null;

    const driveFileId = matched.id;

    // Set public view permissions so students can watch without restriction
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions`, {
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
      dueDate: { gte: recentCutoff },
      OR: [
        { status: { in: ["SCHEDULED", "LIVE"] } },
        { recordingUrl: null, recordingStatus: { not: "AVAILABLE" } },
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

export interface CreateWorkspaceTutorResult {
  success: boolean;
  workspaceEmail: string;
  alreadyExisted?: boolean;
  error?: string;
  activationUrl?: string;
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
  const familyName = nameParts.slice(1).join(" ") || "Faculty";

  // Determine official Google Workspace primary email
  let primaryEmail: string;
  if (params.customUsername?.trim()) {
    const cleanUser = params.customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    primaryEmail = `${cleanUser}@${domain}`;
  } else if (params.email.toLowerCase().trim().endsWith(`@${domain}`)) {
    primaryEmail = params.email.toLowerCase().trim();
  } else {
    const cleanFirst = givenName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLast = familyName.toLowerCase().replace(/[^a-z0-9]/g, "");
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

    const userBody = {
      primaryEmail,
      name: {
        givenName,
        familyName,
      },
      password: initialPassword,
      changePasswordAtNextLogin: false,
      recoveryEmail: params.email.toLowerCase().trim() !== primaryEmail ? params.email.trim() : undefined,
      recoveryPhone: params.phone?.trim() || undefined,
      orgUnitPath: "/",
    };

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
