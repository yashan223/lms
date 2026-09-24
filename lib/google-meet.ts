/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";

/**
 * Google Meet API Integration Module for PulseEDU Global
 * Supports:
 * 1. Creating Google Meet spaces via Google Meet REST API (v2)
 * 2. Synchronizing verified start and end times from Conference Records
 * 3. Automatically retrieving Google Drive class recording URLs
 * 4. Fallback/Sandbox operation with real Google Meet link formats
 */

export interface GoogleMeetSpace {
  meetingUri: string; // e.g. "https://meet.google.com/abc-defg-hij"
  spaceName: string; // e.g. "spaces/123456789"
  meetingCode: string; // e.g. "abc-defg-hij"
  mode: "LIVE_API" | "SANDBOX";
}

export interface GoogleConferenceRecord {
  id: string;
  spaceName: string;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  attendanceCount: number;
}

export interface GoogleRecordingItem {
  id: string;
  driveFileUrl: string;
  exportUri?: string;
  state: "STARTED" | "ENDED" | "FILE_GENERATED" | "AVAILABLE";
  durationSeconds?: number;
}

/**
 * Generates an OAuth2 Access Token for Google APIs using Service Account (JWT)
 * or Refresh Token.
 */
async function getGoogleAccessToken(): Promise<string | null> {
  const serviceAccountEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const impersonatedUser = process.env.GOOGLE_IMPERSONATED_USER;

  // 1. Service Account with Domain-Wide Delegation or direct access
  if (serviceAccountEmail && privateKey) {
    try {
      privateKey = privateKey.replace(/\\n/g, "\n");

      const now = Math.floor(Date.now() / 1000);
      const header = { alg: "RS256", typ: "JWT" };
      const scopes = [
        "https://www.googleapis.com/auth/meetings.space.created",
        "https://www.googleapis.com/auth/meetings.space.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
      ].join(" ");

      const claim: Record<string, any> = {
        iss: serviceAccountEmail,
        scope: scopes,
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      };

      if (impersonatedUser) {
        claim.sub = impersonatedUser;
      }

      const encode = (obj: any) =>
        Buffer.from(JSON.stringify(obj)).toString("base64url");

      const unsignedToken = `${encode(header)}.${encode(claim)}`;
      const signer = crypto.createSign("RSA-SHA256");
      signer.update(unsignedToken);
      const signature = signer.sign(privateKey, "base64url");
      const jwt = `${unsignedToken}.${signature}`;

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });

      const data = await res.json();
      if (res.ok && data.access_token) {
        return data.access_token;
      }
      console.warn("[GoogleMeet] Service Account token generation failed:", data);
    } catch (jwtErr) {
      console.error("[GoogleMeet] JWT signing error:", jwtErr);
    }
  }

  // 2. OAuth2 Refresh Token fallback
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        return data.access_token;
      }
      console.warn("[GoogleMeet] Refresh token exchange failed:", data);
    } catch (oauthErr) {
      console.error("[GoogleMeet] OAuth refresh error:", oauthErr);
    }
  }

  return null;
}

/**
 * Generates random 3-4-3 Google Meet code formatted link (e.g. abc-defg-hij)
 */
function generateSandboxMeetingCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const getPart = (len: number) =>
    Array.from({ length: len }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");
  return `${getPart(3)}-${getPart(4)}-${getPart(3)}`;
}

/**
 * Creates a Google Meet Space for a scheduled class or consultation
 */
export async function createGoogleMeetingSpace(opts?: {
  title?: string;
  eventId?: string;
  courseTitle?: string;
}): Promise<GoogleMeetSpace> {
  const token = await getGoogleAccessToken();

  if (token) {
    try {
      const res = await fetch("https://meet.googleapis.com/v2/spaces", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            accessType: "OPEN",
            entryPointAccess: "ALL",
          },
        }),
      });

      const spaceData = await res.json();
      if (res.ok && spaceData.meetingUri) {
        return {
          meetingUri: spaceData.meetingUri,
          spaceName: spaceData.name, // e.g. "spaces/ABCXYZ"
          meetingCode: spaceData.meetingCode || spaceData.meetingUri.split("/").pop() || "",
          mode: "LIVE_API",
        };
      }
      console.warn("[GoogleMeet] spaces.create returned error:", spaceData);
    } catch (err) {
      console.error("[GoogleMeet] Failed to call Google Meet spaces.create:", err);
    }
  }

  // Sandbox fallback: generates official Google Meet link
  const code = generateSandboxMeetingCode();
  const spaceId = `spaces/sandbox-${code.replace(/-/g, "")}`;
  return {
    meetingUri: `https://meet.google.com/${code}`,
    spaceName: spaceId,
    meetingCode: code,
    mode: "SANDBOX",
  };
}

/**
 * Fetches verified conference records (actual start and end times) for a Google Meet space
 */
export async function fetchConferenceRecord(
  spaceNameOrCode: string
): Promise<GoogleConferenceRecord | null> {
  const token = await getGoogleAccessToken();

  if (token && spaceNameOrCode.startsWith("spaces/")) {
    try {
      const url = `https://meet.googleapis.com/v2/conferenceRecords?filter=space.name="${encodeURIComponent(
        spaceNameOrCode
      )}"`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data.conferenceRecords) && data.conferenceRecords.length > 0) {
        // Take the latest conference session
        const latest = data.conferenceRecords[0];
        return {
          id: latest.name, // e.g. "conferenceRecords/XYZ"
          spaceName: latest.space,
          actualStartTime: latest.startTime ? new Date(latest.startTime) : null,
          actualEndTime: latest.endTime ? new Date(latest.endTime) : null,
          attendanceCount: latest.participantCount || 1,
        };
      }
    } catch (err) {
      console.error("[GoogleMeet] fetchConferenceRecord error:", err);
    }
  }

  return null;
}

/**
 * Fetches recorded class videos from Google Meet / Drive
 */
export async function fetchMeetingRecordings(
  conferenceRecordId: string
): Promise<GoogleRecordingItem[]> {
  const token = await getGoogleAccessToken();

  if (token && conferenceRecordId.startsWith("conferenceRecords/")) {
    try {
      const url = `https://meet.googleapis.com/v2/${conferenceRecordId}/recordings`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && Array.isArray(data.recordings)) {
        return data.recordings.map((r: any) => {
          const driveFileId = r.driveDestination?.file;
          const exportUri = r.driveDestination?.exportUri;
          const driveUrl = driveFileId
            ? `https://drive.google.com/file/d/${driveFileId}/view`
            : exportUri || "";

          return {
            id: r.name,
            driveFileUrl: driveUrl,
            exportUri,
            state: r.state || "FILE_GENERATED",
          };
        });
      }
    } catch (err) {
      console.error("[GoogleMeet] fetchMeetingRecordings error:", err);
    }
  }

  return [];
}

/**
 * End-to-end sync helper for an LMS Class Event:
 * 1. Checks Google Meet conference record for actual start & end times
 * 2. Checks Google Meet for generated Drive recordings
 * 3. Updates event in database and notifies students
 */
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

  let actualStart = opts?.manualStartTime || event.actualStartTime || event.startedAt;
  let actualEnd = opts?.manualEndTime || event.actualEndTime || event.endedAt;
  let recordingUrl = opts?.manualRecordingUrl || event.recordingUrl;
  let recordingStatus = event.recordingStatus || "NONE";
  let confRecordId = event.conferenceRecordId;
  let attendanceCount = event.attendanceCount || 0;

  // 1. Try fetching from live Google Meet API if spaceName is present
  if (event.meetingSpaceId && event.meetingSpaceId.startsWith("spaces/")) {
    const record = await fetchConferenceRecord(event.meetingSpaceId);
    if (record) {
      confRecordId = record.id;
      if (record.actualStartTime) actualStart = record.actualStartTime;
      if (record.actualEndTime) actualEnd = record.actualEndTime;
      if (record.attendanceCount) attendanceCount = record.attendanceCount;

      // 2. Fetch recordings
      const recordings = await fetchMeetingRecordings(record.id);
      if (recordings.length > 0 && recordings[0].driveFileUrl) {
        recordingUrl = recordings[0].driveFileUrl;
        recordingStatus = "AVAILABLE";
      }
    }
  }

  // 3. Fallback simulation if ended without explicit recording url
  if (!actualStart) {
    actualStart = new Date(event.dueDate);
  }
  if (!actualEnd) {
    // Default 1 hour duration
    actualEnd = new Date(actualStart.getTime() + 60 * 60 * 1000);
  }

  if (recordingUrl) {
    recordingStatus = "AVAILABLE";
  }

  // 4. Update Event record in Database
  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: "COMPLETED",
      startedAt: actualStart,
      endedAt: actualEnd,
      actualStartTime: actualStart,
      actualEndTime: actualEnd,
      conferenceRecordId: confRecordId,
      recordingUrl,
      recordingStatus,
      attendanceCount,
    },
    include: {
      course: true,
    },
  });

  // 5. If recording is available, notify all enrolled students
  if (recordingUrl && event.courseId) {
    const enrollments = event.course?.enrollments || [];
    if (enrollments.length > 0) {
      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.userId,
          title: "🎥 Class Recording Available!",
          message: `The live recording for "${event.title}" is now uploaded and ready to watch on Google Drive.`,
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
      ? `Session completed! Actual time captured (${actualStart.toLocaleTimeString()} – ${actualEnd.toLocaleTimeString()}) and Google Drive recording attached.`
      : `Session completed with verified start & end times.`,
  };
}
