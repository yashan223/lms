import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { Role } from "@prisma/client";
import { removeLiveClassNotifications } from "@/lib/notifications";

export interface BBBConfig {
  url: string;
  secret: string;
}

export function getBBBConfig(): BBBConfig {
  const rawUrl =
    process.env.BIGBLUEBUTTON_URL?.trim() ||
    process.env.BBB_URL?.trim() ||
    "https://test-install.blindsidenetworks.com/bigbluebutton/api";

  const secret =
    process.env.BIGBLUEBUTTON_SECRET?.trim() ||
    process.env.BBB_SECRET?.trim() ||
    "8cd805379ec838d156e29d3a177744fc";

  let url = rawUrl.replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    if (url.endsWith("/bigbluebutton")) {
      url = `${url}/api`;
    } else {
      url = `${url}/bigbluebutton/api`;
    }
  }

  return { url, secret };
}

export function isBigBlueButtonConfigured(): boolean {
  const config = getBBBConfig();
  return Boolean(config.url && config.secret);
}

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.APP_URL?.trim()) {
    return process.env.APP_URL.trim().replace(/\/$/, "");
  }
  return "https://pulseedu.online";
}

/**
 * Calculates SHA-1 checksum and builds full BigBlueButton API URL
 */
export function buildBBBUrl(
  callName: string,
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const { url, secret } = getBBBConfig();

  const queryParts: string[] = [];
  const keys = Object.keys(params).sort();

  for (const key of keys) {
    const val = params[key];
    if (val !== undefined && val !== null) {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }

  const queryString = queryParts.join("&");
  const rawSignature = `${callName}${queryString}${secret}`;
  const checksum = crypto.createHash("sha1").update(rawSignature).digest("hex");

  return queryString
    ? `${url}/${callName}?${queryString}&checksum=${checksum}`
    : `${url}/${callName}?checksum=${checksum}`;
}

/**
 * Helper to extract tag value from simple BigBlueButton XML
 */
export function extractXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

export function extractAllXmlTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
}

export function extractBBBAttendees(xml: string): Array<{
  userId: string;
  fullName: string;
  role: string;
  isPresenter: boolean;
}> {
  const attendees: Array<{ userId: string; fullName: string; role: string; isPresenter: boolean }> = [];
  const attendeeBlocks = extractAllXmlTags(xml, "attendee");
  for (const block of attendeeBlocks) {
    const userId = extractXmlTag(block, "userID");
    const fullName = extractXmlTag(block, "fullName");
    const role = extractXmlTag(block, "role");
    const isPresenter = extractXmlTag(block, "isPresenter") === "true";
    if (userId) {
      attendees.push({
        userId,
        fullName: fullName || "",
        role: role || "VIEWER",
        isPresenter,
      });
    }
  }
  return attendees;
}

export interface BBBMeetingCreationResult {
  success: boolean;
  meetingId: string;
  attendeePW: string;
  moderatorPW: string;
  createTime?: string;
  message?: string;
}

/**
 * 5-page 16:9 blank widescreen whiteboard PDF encoded as Base64 (1160 bytes).
 * Pre-uploading this replaces BigBlueButton's default "Welcome to BigBlueButton" presentation,
 * giving instructors and students a clean, distraction-free whiteboard ready for teaching.
 */
export const DEFAULT_BLANK_WHITEBOARD_BASE64 =
  "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUiA1IDAgUiA3IDAgUiA5IDAgUiAxMSAwIFJdIC9Db3VudCA1ID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMTkyMCAxMDgwXSAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCAwID4+CnN0cmVhbQoKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMTkyMCAxMDgwXSAvQ29udGVudHMgNiAwIFIgPj4KZW5kb2JqCjYgMCBvYmoKPDwgL0xlbmd0aCAwID4+CnN0cmVhbQoKZW5kc3RyZWFtCmVuZG9iago3IDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMTkyMCAxMDgwXSAvQ29udGVudHMgOCAwIFIgPj4KZW5kb2JqCjggMCBvYmoKPDwgL0xlbmd0aCAwID4+CnN0cmVhbQoKZW5kc3RyZWFtCmVuZG9iago5IDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMTkyMCAxMDgwXSAvQ29udGVudHMgMTAgMCBSID4+CmVuZG9iagoxMCAwIG9iago8PCAvTGVuZ3RoIDAgPj4Kc3RyZWFtCgplbmRzdHJlYW0KZW5kb2JqCjExIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMTkyMCAxMDgwXSAvQ29udGVudHMgMTIgMCBSID4+CmVuZG9iagoxMiAwIG9iago8PCAvTGVuZ3RoIDAgPj4Kc3RyZWFtCgplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxMwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTQwIDAwMDAwIG4gCjAwMDAwMDAyMjkgMDAwMDAgbiAKMDAwMDAwMDI3OCAwMDAwMCBuIAowMDAwMDAwMzY3IDAwMDAwIG4gCjAwMDAwMDA0MTYgMDAwMDAgbiAKMDAwMDAwMDUwNSAwMDAwMCBuIAowMDAwMDAwNTU0IDAwMDAwIG4gCjAwMDAwMDA2NDQgMDAwMDAgbiAKMDAwMDAwMDY5NCAwMDAwMCBuIAowMDAwMDAwNzg1IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgMTMgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjgzNQolJUVPRgo=";

/**
 * Creates or gets an existing BigBlueButton meeting room
 */
export async function createBBBMeeting(opts: {
  meetingId: string;
  name: string;
  attendeePW?: string;
  moderatorPW?: string;
  record?: boolean;
  autoStartRecording?: boolean;
  allowStartStopRecording?: boolean;
  welcome?: string;
  logoutUrl?: string;
  meta?: Record<string, string>;
  endWhenNoModerator?: boolean;
  endWhenNoModeratorDelayInMinutes?: number;
  overrideDefaultPresentation?: boolean;
  presentationUrl?: string;
  presentationBase64?: string;
  presentationFilename?: string;
}): Promise<BBBMeetingCreationResult> {
  const meetingId = opts.meetingId.trim();
  const name = opts.name.trim();

  // Consistent, deterministic room passwords derived from meeting ID
  const hash = crypto.createHash("sha256").update(meetingId).digest("hex");
  const attendeePW = opts.attendeePW || `ap_${hash.slice(0, 8)}`;
  const moderatorPW = opts.moderatorPW || `mp_${hash.slice(8, 16)}`;

  const appBase = getAppBaseUrl();
  const defaultLogout = `${appBase}/dashboard`;
  const logoutUrl = opts.logoutUrl || defaultLogout;

  const welcomeMsg =
    opts.welcome ||
    `<br>Welcome to <b>${name}</b> on EduPulse LMS!<br>For help or questions, use the public chat.<br>`;

  const params: Record<string, any> = {
    meetingID: meetingId,
    name,
    attendeePW,
    moderatorPW,
    record: opts.record !== false ? "true" : "false",
    autoStartRecording: opts.autoStartRecording !== false ? "true" : "false",
    // allowStartStopRecording: false disables pause/stop controls in BigBlueButton, ensuring continuous uninterrupted recording
    allowStartStopRecording: opts.allowStartStopRecording === true ? "true" : "false",
    endWhenNoModerator: opts.endWhenNoModerator !== false ? "true" : "false",
    endWhenNoModeratorDelayInMinutes: (opts.endWhenNoModeratorDelayInMinutes ?? 1).toString(),
    meetingExpireWhenEnd: "true",
    welcome: welcomeMsg,
    logoutURL: logoutUrl,
  };

  if (opts.meta) {
    for (const [k, v] of Object.entries(opts.meta)) {
      params[`meta_${k}`] = v;
    }
  }

  // Configure BigBlueButton Learning Analytics Dashboard callback upon session end
  if (!params["meta_analytics-callback-url"] && appBase) {
    params["meta_analytics-callback-url"] = `${appBase}/api/meetings/analytics-callback?meetingID=${encodeURIComponent(meetingId)}`;
  }

  // Pre-upload a clean whiteboard presentation to replace the default "Welcome to BigBlueButton" slides
  let xmlBody: string | undefined;
  if (opts.overrideDefaultPresentation !== false) {
    const filename = (opts.presentationFilename || "EduPulse_Whiteboard.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
    if (opts.presentationUrl) {
      xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<modules>
  <module name="presentation">
    <document url="${opts.presentationUrl}" filename="${filename}" current="true" downloadable="false" removable="true"/>
  </module>
</modules>`;
    } else {
      const b64 = opts.presentationBase64 || DEFAULT_BLANK_WHITEBOARD_BASE64;
      xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<modules>
  <module name="presentation">
    <document name="${filename}" current="true" downloadable="false" removable="true">${b64}</document>
  </module>
</modules>`;
    }
  }

  const callUrl = buildBBBUrl("create", params);

  try {
    const res = await fetch(callUrl, {
      method: xmlBody ? "POST" : "GET",
      headers: xmlBody ? { "Content-Type": "application/xml" } : undefined,
      body: xmlBody,
    });
    const text = await res.text();

    const returncode = extractXmlTag(text, "returncode");
    const messageKey = extractXmlTag(text, "messageKey");
    const message = extractXmlTag(text, "message");

    if (returncode === "SUCCESS" || messageKey === "idNotUnique") {
      return {
        success: true,
        meetingId,
        attendeePW,
        moderatorPW,
        createTime: extractXmlTag(text, "createTime") || undefined,
        message: message || "Meeting created or already active",
      };
    }

    throw new Error(message || `BigBlueButton create failed with returncode: ${returncode}`);
  } catch (error: any) {
    console.error("[BigBlueButton] Error creating meeting:", error);
    throw error;
  }
}

/**
 * Returns a direct BigBlueButton join URL
 */
export function getBBBJoinUrl(opts: {
  meetingId: string;
  fullName: string;
  password?: string;
  isModerator?: boolean;
  userId?: string;
  avatarUrl?: string;
  redirect?: boolean;
  hidePresentationOnJoin?: boolean;
}): string {
  const meetingId = opts.meetingId.trim();
  const hash = crypto.createHash("sha256").update(meetingId).digest("hex");
  const defaultAttendeePW = `ap_${hash.slice(0, 8)}`;
  const defaultModeratorPW = `mp_${hash.slice(8, 16)}`;

  const password =
    opts.password ||
    (opts.isModerator ? defaultModeratorPW : defaultAttendeePW);

  const params: Record<string, any> = {
    meetingID: meetingId,
    fullName: opts.fullName || (opts.isModerator ? "Instructor" : "Student"),
    password,
    redirect: opts.redirect !== false ? "true" : "false",
    joinViaHtml5: "true",
  };

  if (opts.userId) params.userID = opts.userId;
  if (opts.avatarUrl) params.avatarURL = opts.avatarUrl;
  if (opts.hidePresentationOnJoin) {
    params["userdata-bbb_hide_presentation_on_join"] = "true";
  }

  return buildBBBUrl("join", params);
}

/**
 * Checks if a meeting is currently running on the BigBlueButton server
 */
export async function isBBBMeetingRunning(meetingId: string): Promise<boolean> {
  try {
    const callUrl = buildBBBUrl("isMeetingRunning", { meetingID: meetingId.trim() });
    const res = await fetch(callUrl, { method: "GET" });
    const text = await res.text();
    const running = extractXmlTag(text, "running");
    return running?.toLowerCase() === "true";
  } catch {
    return false;
  }
}

/**
 * Retrieves detailed live meeting info from BigBlueButton
 */
export async function getBBBMeetingInfo(meetingId: string): Promise<{
  running: boolean;
  participantCount: number;
  moderatorCount: number;
  recording: boolean;
  startTime?: Date | null;
  endTime?: Date | null;
  hasUserJoined?: boolean;
  rawXml?: string;
} | null> {
  try {
    const hash = crypto.createHash("sha256").update(meetingId.trim()).digest("hex");
    const moderatorPW = `mp_${hash.slice(8, 16)}`;

    const callUrl = buildBBBUrl("getMeetingInfo", {
      meetingID: meetingId.trim(),
      password: moderatorPW,
    });

    const res = await fetch(callUrl, { method: "GET" });
    const text = await res.text();

    const returncode = extractXmlTag(text, "returncode");
    if (returncode !== "SUCCESS") {
      return null;
    }

    const running = extractXmlTag(text, "running")?.toLowerCase() === "true";
    const participantCount = parseInt(extractXmlTag(text, "participantCount") || "0", 10);
    const moderatorCount = parseInt(extractXmlTag(text, "moderatorCount") || "0", 10);
    const recording = extractXmlTag(text, "recording")?.toLowerCase() === "true";
    const hasUserJoined = extractXmlTag(text, "hasUserJoined")?.toLowerCase() === "true";

    const rawStartTime = extractXmlTag(text, "startTime");
    const rawEndTime = extractXmlTag(text, "endTime");

    const startTime = rawStartTime && rawStartTime !== "0" ? new Date(parseInt(rawStartTime, 10)) : null;
    const endTime = rawEndTime && rawEndTime !== "0" ? new Date(parseInt(rawEndTime, 10)) : null;

    return {
      running,
      participantCount,
      moderatorCount,
      recording,
      startTime,
      endTime,
      hasUserJoined,
      rawXml: text,
    };
  } catch (err) {
    console.warn(`[BigBlueButton] getMeetingInfo error for ${meetingId}:`, err);
    return null;
  }
}

/**
 * Forcibly ends an active BigBlueButton meeting
 */
export async function endBBBMeeting(meetingId: string, moderatorPW?: string): Promise<boolean> {
  try {
    const hash = crypto.createHash("sha256").update(meetingId.trim()).digest("hex");
    const pw = moderatorPW || `mp_${hash.slice(8, 16)}`;

    const callUrl = buildBBBUrl("end", {
      meetingID: meetingId.trim(),
      password: pw,
    });

    const res = await fetch(callUrl, { method: "GET" });
    const text = await res.text();
    const returncode = extractXmlTag(text, "returncode");
    return returncode === "SUCCESS";
  } catch (err) {
    console.warn(`[BigBlueButton] endMeeting error for ${meetingId}:`, err);
    return false;
  }
}

export interface BBBRecordingItem {
  recordId: string;
  meetingId: string;
  internalMeetingId?: string;
  name: string;
  published: boolean;
  startTime?: Date;
  endTime?: Date;
  playbackUrl?: string;
  lengthMinutes?: number;
  participants?: number;
  rawSize?: number;
}

/**
 * Retrieves recording archives from BigBlueButton
 */
export async function getBBBRecordings(opts?: {
  meetingId?: string;
  recordId?: string;
}): Promise<BBBRecordingItem[]> {
  try {
    const params: Record<string, any> = {};
    if (opts?.meetingId) params.meetingID = opts.meetingId.trim();
    if (opts?.recordId) params.recordID = opts.recordId.trim();

    const callUrl = buildBBBUrl("getRecordings", params);
    const res = await fetch(callUrl, { method: "GET" });
    const text = await res.text();

    const returncode = extractXmlTag(text, "returncode");
    if (returncode !== "SUCCESS") {
      return [];
    }

    const recordingBlocks = extractAllXmlTags(text, "recording");
    const results: BBBRecordingItem[] = [];

    for (const block of recordingBlocks) {
      const recordId = extractXmlTag(block, "recordID") || "";
      const meetingId = extractXmlTag(block, "meetingID") || "";
      const internalMeetingId = extractXmlTag(block, "internalMeetingID") || recordId;
      const participantsStr = extractXmlTag(block, "participants");
      const participants = participantsStr ? parseInt(participantsStr, 10) : undefined;
      const rawSizeStr = extractXmlTag(block, "rawSize") || extractXmlTag(block, "size");
      const rawSize = rawSizeStr ? parseInt(rawSizeStr, 10) : undefined;
      const name = extractXmlTag(block, "name") || "";
      const published = extractXmlTag(block, "published")?.toLowerCase() === "true";
      const rawStart = extractXmlTag(block, "startTime");
      const rawEnd = extractXmlTag(block, "endTime");

      const startTime = rawStart ? new Date(parseInt(rawStart, 10)) : undefined;
      const endTime = rawEnd ? new Date(parseInt(rawEnd, 10)) : undefined;

      // Extract playback URL from format tag
      const playbackBlock = extractXmlTag(block, "playback");
      let playbackUrl = playbackBlock ? extractXmlTag(playbackBlock, "url") || undefined : undefined;
      const rawLength = playbackBlock ? extractXmlTag(playbackBlock, "length") : null;
      const lengthMinutes = rawLength ? parseInt(rawLength, 10) : undefined;

      // If format URL was directly nested
      if (!playbackUrl) {
        playbackUrl = extractXmlTag(block, "url") || undefined;
      }

      results.push({
        recordId,
        meetingId,
        internalMeetingId,
        name,
        published,
        startTime,
        endTime,
        playbackUrl,
        lengthMinutes,
        participants,
        rawSize,
      });
    }

    return results;
  } catch (err) {
    console.warn("[BigBlueButton] getRecordings error:", err);
    return [];
  }
}

/**
 * Deletes a recording archive from the BigBlueButton server
 */
export async function deleteBBBRecording(recordId: string): Promise<boolean> {
  try {
    if (!recordId || !recordId.trim()) return false;
    const callUrl = buildBBBUrl("deleteRecordings", { recordID: recordId.trim() });
    const res = await fetch(callUrl, { method: "GET" });
    const text = await res.text();
    const returncode = extractXmlTag(text, "returncode");
    return returncode === "SUCCESS";
  } catch (err) {
    console.warn("[BigBlueButton] deleteRecordings error:", err);
    return false;
  }
}

/**
 * Returns the internal meeting ID slug for an event or trial
 */
export function getBBBMeetingId(target: { eventId?: string; trialId?: string }): string {
  if (target.eventId) return `class-${target.eventId}`;
  if (target.trialId) return `trial-${target.trialId}`;
  return `session-${Date.now()}`;
}

/**
 * Returns the universal LMS meeting join link that resolves roles and directs to BBB
 */
export function getUniversalJoinLink(target: { eventId?: string; trialId?: string }): string {
  const base = getAppBaseUrl();
  if (target.eventId) {
    return `${base}/api/meetings/join?eventId=${encodeURIComponent(target.eventId)}`;
  }
  if (target.trialId) {
    return `${base}/api/meetings/join?trialId=${encodeURIComponent(target.trialId)}`;
  }
  return `${base}/dashboard`;
}

/**
 * Synchronizes an Event's meeting session with BigBlueButton
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

  const bbbMeetingId = event.meetingSpaceId || getBBBMeetingId({ eventId });
  if (isBigBlueButtonConfigured() && event.status === "LIVE") {
    try {
      await endBBBMeeting(bbbMeetingId);
    } catch {}
  }
  let recordingUrl = opts?.manualRecordingUrl?.trim() || event.recordingUrl;
  let actualStart = opts?.manualStartTime || event.actualStartTime || event.startedAt;
  let actualEnd = opts?.manualEndTime || event.actualEndTime || new Date();

  // If no recording yet, try fetching from BigBlueButton server
  if (!recordingUrl && isBigBlueButtonConfigured()) {
    try {
      const recordings = await getBBBRecordings({ meetingId: bbbMeetingId });
      const published = recordings.find((r) => r.published && r.playbackUrl);
      if (published?.playbackUrl) {
        recordingUrl = published.playbackUrl;
        if (published.startTime && !actualStart) actualStart = published.startTime;
        if (published.endTime && (!opts?.manualEndTime || !event.actualEndTime)) actualEnd = published.endTime;
      }
    } catch (e) {
      console.warn("[BBB] Could not fetch recordings during sync:", e);
    }
  }

  const recordingStatus = recordingUrl ? "AVAILABLE" : event.recordingStatus === "RECORDING" ? "RECORDING" : "NONE";

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: "COMPLETED",
      startedAt: actualStart || new Date(event.dueDate),
      endedAt: actualEnd,
      actualStartTime: actualStart || new Date(event.dueDate),
      actualEndTime: actualEnd,
      recordingUrl,
      recordingStatus,
      meetingSpaceId: bbbMeetingId,
    },
    include: {
      course: true,
    },
  });

  // Automatically remove live class notifications and reminders now that session has ended
  await removeLiveClassNotifications({ eventId, title: event.title });

  if (recordingUrl && event.courseId) {
    const enrollments = event.course?.enrollments || [];
    if (enrollments.length > 0) {
      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.userId,
          title: "🎥 Class Recording Available!",
          message: `The BigBlueButton recording for "${event.title}" is now available to watch.`,
          type: "SUCCESS",
          link: recordingUrl || "/dashboard",
        })),
      });
      enrollments.forEach((e) => broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: e.userId }));
    }
  }

  broadcastLMSEvent("EVENTS_CHANGED", { eventId, recordingUrl, completed: true });

  // Finalize attendance durations and record absentees for this class event
  try {
    const attendees = await prisma.classAttendance.findMany({
      where: { eventId, joinedAt: { not: null } },
    });
    for (const att of attendees) {
      if (att.joinedAt) {
        const joinTime = new Date(att.joinedAt).getTime();
        const endTime = (actualEnd || new Date()).getTime();
        const diffMinutes = Math.max(1, Math.round((endTime - joinTime) / (60 * 1000)));
        await prisma.classAttendance.update({
          where: { id: att.id },
          data: {
            leftAt: actualEnd || new Date(),
            durationMinutes: diffMinutes,
          },
        });
      }
    }

    // For any enrolled students in this course who NEVER joined, mark as ABSENT
    if (event.courseId && event.course?.enrollments) {
      const existingAttUserIds = new Set(attendees.map((a) => a.userId));
      for (const enr of event.course.enrollments) {
        if (!existingAttUserIds.has(enr.userId)) {
          await prisma.classAttendance.create({
            data: {
              eventId,
              courseId: event.courseId,
              userId: enr.userId,
              userRole: Role.STUDENT,
              status: "ABSENT",
              markedBy: "AUTO_SYSTEM",
              notes: "Automated: Student did not join online live session",
            },
          }).catch(() => {});
        }
      }
    }

    // If tutor never joined, record ABSENT for tutor
    if (event.course?.tutorId) {
      const tutorAtt = await prisma.classAttendance.findUnique({
        where: { eventId_userId: { eventId, userId: event.course.tutorId } },
      });
      if (!tutorAtt) {
        await prisma.classAttendance.create({
          data: {
            eventId,
            courseId: event.courseId,
            userId: event.course.tutorId,
            userRole: Role.TUTOR,
            status: "ABSENT",
            markedBy: "AUTO_SYSTEM",
            notes: "Automated: Instructor did not join online live session",
          },
        }).catch(() => {});
      }
    }

    // Recalculate and update event attendanceCount
    const presentStudentsCount = await prisma.classAttendance.count({
      where: { eventId, userRole: Role.STUDENT, status: { in: ["PRESENT", "LATE"] } },
    });
    await prisma.event.update({
      where: { id: eventId },
      data: { attendanceCount: presentStudentsCount },
    }).catch(() => {});

    broadcastLMSEvent("ATTENDANCE_CHANGED", { eventId, completed: true });
  } catch (attFinalErr) {
    console.warn("[BBB] Error finalizing attendance in syncClassMeetingSession:", attFinalErr);
  }

  // Deduct token from student, notify low balance, and credit tutor earnings ledger
  try {
    const { completeClassAndProcessEcosystem } = await import("@/lib/token-ecosystem");
    await completeClassAndProcessEcosystem(eventId, {
      manualStartTime: actualStart || undefined,
      manualEndTime: actualEnd || undefined,
      recordingUrl: recordingUrl || undefined,
    });
  } catch (ecoErr) {
    console.warn("[BBB] Token ecosystem processing warning:", ecoErr);
  }

  return {
    success: true,
    event: updatedEvent,
    message: recordingUrl
      ? "Session completed! BigBlueButton recording is attached and students notified."
      : "Session marked as completed successfully.",
  };
}

/**
 * Synchronizes a TrialRequest's session with BigBlueButton
 */
export async function syncTrialSession(
  trialId: string,
  opts?: {
    manualStartTime?: Date;
    manualEndTime?: Date;
    manualRecordingUrl?: string;
  }
): Promise<{
  success: boolean;
  trial: any;
  message: string;
}> {
  const trial = await prisma.trialRequest.findUnique({
    where: { id: trialId },
    include: { course: true, tutor: true, student: true },
  });

  if (!trial) {
    throw new Error(`Trial consultation with ID ${trialId} not found.`);
  }

  const bbbMeetingId = trial.meetingSpaceId || getBBBMeetingId({ trialId });
  if (isBigBlueButtonConfigured() && trial.status === "CONFIRMED" && trial.actualStartTime) {
    try {
      await endBBBMeeting(bbbMeetingId);
    } catch {}
  }
  let recordingUrl = opts?.manualRecordingUrl?.trim() || trial.recordingUrl;
  let actualStart = opts?.manualStartTime || trial.actualStartTime || trial.preferredDate;
  let actualEnd = opts?.manualEndTime || trial.actualEndTime || new Date();

  if (!recordingUrl && isBigBlueButtonConfigured()) {
    try {
      const recordings = await getBBBRecordings({ meetingId: bbbMeetingId });
      const published = recordings.find((r) => r.published && r.playbackUrl);
      if (published?.playbackUrl) {
        recordingUrl = published.playbackUrl;
        if (published.startTime && !actualStart) actualStart = published.startTime;
        if (published.endTime) actualEnd = published.endTime;
      }
    } catch (e) {
      console.warn("[BBB] Could not fetch trial recordings during sync:", e);
    }
  }

  const recordingStatus = recordingUrl ? "AVAILABLE" : trial.recordingStatus === "RECORDING" ? "RECORDING" : "NONE";

  const updatedTrial = await prisma.trialRequest.update({
    where: { id: trialId },
    data: {
      status: "COMPLETED",
      actualStartTime: actualStart,
      actualEndTime: actualEnd,
      recordingUrl,
      recordingStatus,
      meetingSpaceId: bbbMeetingId,
    },
    include: { course: true, tutor: true },
  });

  // Automatically remove live trial notifications and reminders now that consultation has ended
  await removeLiveClassNotifications({ trialId, title: trial.course?.title });

  if (recordingUrl && trial.studentId) {
    await prisma.notification.create({
      data: {
        userId: trial.studentId,
        title: "🎥 Trial Consultation Recording Available!",
        message: `Your 1-on-1 consultation recording for "${trial.course?.title || "Class"}" is ready to watch.`,
        type: "SUCCESS",
        link: recordingUrl,
      },
    });
    broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: trial.studentId });
  }

  broadcastLMSEvent("TRIALS_CHANGED", { trialId, recordingUrl, completed: true });

  // Finalize attendance durations and record absentees for trial consultation
  try {
    const trialAttendees = await prisma.classAttendance.findMany({
      where: { trialId, joinedAt: { not: null } },
    });
    for (const att of trialAttendees) {
      if (att.joinedAt) {
        const joinTime = new Date(att.joinedAt).getTime();
        const endTime = (actualEnd || new Date()).getTime();
        const diffMinutes = Math.max(1, Math.round((endTime - joinTime) / (60 * 1000)));
        await prisma.classAttendance.update({
          where: { id: att.id },
          data: {
            leftAt: actualEnd || new Date(),
            durationMinutes: diffMinutes,
          },
        });
      }
    }

    // If student never joined, mark ABSENT
    if (trial.studentId) {
      const studentAtt = await prisma.classAttendance.findFirst({
        where: { trialId, userId: trial.studentId },
      });
      if (!studentAtt) {
        await prisma.classAttendance.create({
          data: {
            trialId,
            courseId: trial.courseId || null,
            userId: trial.studentId,
            userRole: Role.STUDENT,
            status: "ABSENT",
            markedBy: "AUTO_SYSTEM",
            notes: "Automated: Student did not join trial consultation",
          },
        }).catch(() => {});
      }
    }

    // If tutor never joined, mark ABSENT
    if (trial.tutorId) {
      const tutorAtt = await prisma.classAttendance.findFirst({
        where: { trialId, userId: trial.tutorId },
      });
      if (!tutorAtt) {
        await prisma.classAttendance.create({
          data: {
            trialId,
            courseId: trial.courseId || null,
            userId: trial.tutorId,
            userRole: Role.TUTOR,
            status: "ABSENT",
            markedBy: "AUTO_SYSTEM",
            notes: "Automated: Tutor did not join trial consultation",
          },
        }).catch(() => {});
      }
    }

    broadcastLMSEvent("ATTENDANCE_CHANGED", { trialId, completed: true });
  } catch (attFinalErr) {
    console.warn("[BBB] Error finalizing trial attendance in syncTrialSession:", attFinalErr);
  }

  return {
    success: true,
    trial: updatedTrial,
    message: recordingUrl
      ? "Trial consultation completed! Recording link attached."
      : "Trial consultation completed successfully.",
  };
}

/**
 * Periodically polls active/recent BigBlueButton meetings to discover finished sessions & newly rendered recordings
 */
export async function autoSyncActiveBBBMeetings(): Promise<{
  syncedEvents: number;
  syncedTrials: number;
}> {
  if (!isBigBlueButtonConfigured()) {
    return { syncedEvents: 0, syncedTrials: 0 };
  }

  let syncedEvents = 0;
  let syncedTrials = 0;

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Check live or recently completed events without recording
    const pendingEvents = await prisma.event.findMany({
      where: {
        OR: [
          { status: "LIVE" },
          {
            status: "COMPLETED",
            recordingUrl: null,
            endedAt: { gte: oneDayAgo },
          },
        ],
      },
      take: 20,
    });

    for (const ev of pendingEvents) {
      try {
        const bbbId = ev.meetingSpaceId || getBBBMeetingId({ eventId: ev.id });
        const running = await isBBBMeetingRunning(bbbId);

        // If it was LIVE and is now no longer running, complete it
        if (ev.status === "LIVE" && !running) {
          await syncClassMeetingSession(ev.id);
          syncedEvents++;
        } else if (ev.status === "LIVE" && running) {
          // If running, query getBBBMeetingInfo to discover active attendees and record attendance
          try {
            const meetingInfo = await getBBBMeetingInfo(bbbId);
            if (meetingInfo?.rawXml) {
              const attendees = extractBBBAttendees(meetingInfo.rawXml);
              for (const att of attendees) {
                if (att.userId) {
                  const u = await prisma.user.findUnique({
                    where: { id: att.userId },
                    select: { id: true, role: true },
                  });
                  if (u) {
                    const now = new Date();
                    const isLate =
                      ev.dueDate && now.getTime() - new Date(ev.dueDate).getTime() > 15 * 60 * 1000;
                    const initialStatus = isLate ? "LATE" : "PRESENT";
                    const isMod =
                      att.role === "MODERATOR" || u.role === Role.TUTOR || u.role === Role.ADMIN;
                    const existingAtt = await prisma.classAttendance.findUnique({
                      where: { eventId_userId: { eventId: ev.id, userId: u.id } },
                    });
                    if (!existingAtt) {
                      await prisma.classAttendance.create({
                        data: {
                          eventId: ev.id,
                          courseId: ev.courseId || null,
                          userId: u.id,
                          userRole: u.role,
                          status: initialStatus,
                          joinedAt: meetingInfo.startTime || now,
                          markedBy: "AUTO_ONLINE_JOIN",
                          notes: isMod
                            ? "Instructor active in online live session"
                            : "Student active in online live session",
                        },
                      });
                      broadcastLMSEvent("ATTENDANCE_CHANGED", { eventId: ev.id, userId: u.id });
                    }
                  }
                }
              }
            }
          } catch {}
        } else if (ev.status === "COMPLETED" && !ev.recordingUrl) {
          // Check for newly rendered recording
          const recordings = await getBBBRecordings({ meetingId: bbbId });
          const found = recordings.find((r) => r.published && r.playbackUrl);
          if (found?.playbackUrl) {
            await syncClassMeetingSession(ev.id, { manualRecordingUrl: found.playbackUrl });
            syncedEvents++;
          }
        }
      } catch (err) {
        console.warn(`[autoSyncBBB] Event ${ev.id} check failed:`, err);
      }
    }

    // 2. Check confirmed or recently completed trials without recording
    const pendingTrials = await prisma.trialRequest.findMany({
      where: {
        OR: [
          { status: "CONFIRMED", actualStartTime: { not: null } },
          {
            status: "COMPLETED",
            recordingUrl: null,
            actualEndTime: { gte: oneDayAgo },
          },
        ],
      },
      take: 20,
    });

    for (const tr of pendingTrials) {
      try {
        const bbbId = tr.meetingSpaceId || getBBBMeetingId({ trialId: tr.id });
        const running = await isBBBMeetingRunning(bbbId);

        if (tr.status === "CONFIRMED" && tr.actualStartTime && !running) {
          // Meeting ended
          await syncTrialSession(tr.id);
          syncedTrials++;
        } else if (tr.status === "CONFIRMED" && running) {
          // If running, query getBBBMeetingInfo to discover active attendees in trial
          try {
            const meetingInfo = await getBBBMeetingInfo(bbbId);
            if (meetingInfo?.rawXml) {
              const attendees = extractBBBAttendees(meetingInfo.rawXml);
              for (const att of attendees) {
                if (att.userId) {
                  const u = await prisma.user.findUnique({
                    where: { id: att.userId },
                    select: { id: true, role: true },
                  });
                  if (u) {
                    const now = new Date();
                    const existingAtt = await prisma.classAttendance.findFirst({
                      where: { trialId: tr.id, userId: u.id },
                    });
                    if (!existingAtt) {
                      const isMod =
                        att.role === "MODERATOR" || u.role === Role.TUTOR || u.role === Role.ADMIN;
                      await prisma.classAttendance.create({
                        data: {
                          trialId: tr.id,
                          courseId: tr.courseId || null,
                          userId: u.id,
                          userRole: u.role,
                          status: "PRESENT",
                          joinedAt: meetingInfo.startTime || now,
                          markedBy: "AUTO_ONLINE_JOIN",
                          notes: isMod
                            ? "Instructor active in trial consultation"
                            : "Student active in trial consultation",
                        },
                      });
                      broadcastLMSEvent("ATTENDANCE_CHANGED", { trialId: tr.id, userId: u.id });
                    }
                  }
                }
              }
            }
          } catch {}
        } else if (tr.status === "COMPLETED" && !tr.recordingUrl) {
          const recordings = await getBBBRecordings({ meetingId: bbbId });
          const found = recordings.find((r) => r.published && r.playbackUrl);
          if (found?.playbackUrl) {
            await syncTrialSession(tr.id, { manualRecordingUrl: found.playbackUrl });
            syncedTrials++;
          }
        }
      } catch (err) {
        console.warn(`[autoSyncBBB] Trial ${tr.id} check failed:`, err);
      }
    }
  } catch (err) {
    console.error("[autoSyncBBB] Batch sync error:", err);
  }

  return { syncedEvents, syncedTrials };
}
