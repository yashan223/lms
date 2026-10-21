import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { RescheduleRequestStatus, Role } from "@prisma/client";
import { formatForUser, DEFAULT_TIMEZONE } from "@/lib/timezones";

export const MAX_STUDENT_RESCHEDULES_PER_MONTH = 2;
export const MIN_RESCHEDULE_NOTICE_HOURS = 24;

/**
 * Returns month key in YYYY-MM format (e.g. "2026-10")
 */
export function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Checks student's monthly reschedule quota and 24-hour notice eligibility for a specific class event.
 */
export async function validateStudentRescheduleEligibility(params: {
  studentId: string;
  eventId: string;
  scheduledDate?: Date;
}): Promise<{
  allowed: boolean;
  error?: string;
  code?: string;
  hoursUntilClass?: number;
  reschedulesUsedThisMonth: number;
  maxPerMonth: number;
  remainingThisMonth: number;
  existingPendingRequest?: any;
  event?: any;
}> {
  const { studentId, eventId, scheduledDate } = params;
  const now = new Date();
  const currentMonthKey = getCurrentMonthKey(now);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      course: {
        include: {
          tutor: { select: { id: true, name: true, email: true, timezone: true } },
        },
      },
      user: { select: { id: true, name: true, email: true, timezone: true } },
    },
  });

  if (!event) {
    return {
      allowed: false,
      error: "Class session not found.",
      code: "EVENT_NOT_FOUND",
      reschedulesUsedThisMonth: 0,
      maxPerMonth: MAX_STUDENT_RESCHEDULES_PER_MONTH,
      remainingThisMonth: 0,
    };
  }

  // 1. Check 24-Hour Notice Rule
  const classDueDate = new Date(event.dueDate);
  const msUntilClass = classDueDate.getTime() - now.getTime();
  const hoursUntilClass = msUntilClass / (1000 * 60 * 60);

  if (hoursUntilClass < MIN_RESCHEDULE_NOTICE_HOURS) {
    const hoursLeft = Math.max(0, Math.floor(hoursUntilClass));
    const minsLeft = Math.max(0, Math.floor((msUntilClass % (1000 * 60 * 60)) / (1000 * 60)));
    const timeDisplay = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft} minutes`;

    return {
      allowed: false,
      error: `Rescheduling is only allowed at least 24 hours prior to class start time. This session is scheduled to start in ${timeDisplay}.`,
      code: "NOTICE_TOO_SHORT",
      hoursUntilClass,
      reschedulesUsedThisMonth: 0,
      maxPerMonth: MAX_STUDENT_RESCHEDULES_PER_MONTH,
      remainingThisMonth: 0,
      event,
    };
  }

  // 2. Check Monthly Limit Rule (Max 2 per month per student)
  const usedThisMonth = await prisma.classRescheduleRequest.count({
    where: {
      studentId,
      monthKey: currentMonthKey,
      status: { in: [RescheduleRequestStatus.PENDING, RescheduleRequestStatus.ACCEPTED] },
    },
  });

  const remainingThisMonth = Math.max(0, MAX_STUDENT_RESCHEDULES_PER_MONTH - usedThisMonth);

  if (usedThisMonth >= MAX_STUDENT_RESCHEDULES_PER_MONTH) {
    return {
      allowed: false,
      error: `Monthly limit reached: You can only reschedule up to ${MAX_STUDENT_RESCHEDULES_PER_MONTH} classes per calendar month. You have already utilized ${usedThisMonth} of ${MAX_STUDENT_RESCHEDULES_PER_MONTH} reschedules for this month.`,
      code: "MONTHLY_LIMIT_REACHED",
      hoursUntilClass,
      reschedulesUsedThisMonth: usedThisMonth,
      maxPerMonth: MAX_STUDENT_RESCHEDULES_PER_MONTH,
      remainingThisMonth,
      event,
    };
  }

  // 3. Check for existing PENDING request on this specific event
  const existingPending = await prisma.classRescheduleRequest.findFirst({
    where: {
      eventId,
      studentId,
      status: RescheduleRequestStatus.PENDING,
    },
  });

  if (existingPending) {
    return {
      allowed: false,
      error: "You already have a pending reschedule request awaiting tutor review for this class.",
      code: "PENDING_REQUEST_EXISTS",
      hoursUntilClass,
      reschedulesUsedThisMonth: usedThisMonth,
      maxPerMonth: MAX_STUDENT_RESCHEDULES_PER_MONTH,
      remainingThisMonth,
      existingPendingRequest: existingPending,
      event,
    };
  }

  // 4. If requested date is provided, ensure it is in the future
  if (scheduledDate) {
    if (scheduledDate.getTime() <= now.getTime()) {
      return {
        allowed: false,
        error: "Proposed reschedule time must be in the future.",
        code: "INVALID_PROPOSED_TIME",
        hoursUntilClass,
        reschedulesUsedThisMonth: usedThisMonth,
        maxPerMonth: MAX_STUDENT_RESCHEDULES_PER_MONTH,
        remainingThisMonth,
        event,
      };
    }
  }

  return {
    allowed: true,
    hoursUntilClass,
    reschedulesUsedThisMonth: usedThisMonth,
    maxPerMonth: MAX_STUDENT_RESCHEDULES_PER_MONTH,
    remainingThisMonth,
    event,
  };
}

/**
 * Returns student's monthly reschedule quota details and history.
 */
export async function getStudentRescheduleQuota(studentId: string) {
  const now = new Date();
  const currentMonthKey = getCurrentMonthKey(now);

  const usedThisMonth = await prisma.classRescheduleRequest.count({
    where: {
      studentId,
      monthKey: currentMonthKey,
      status: { in: [RescheduleRequestStatus.PENDING, RescheduleRequestStatus.ACCEPTED] },
    },
  });

  const remainingThisMonth = Math.max(0, MAX_STUDENT_RESCHEDULES_PER_MONTH - usedThisMonth);

  const requests = await prisma.classRescheduleRequest.findMany({
    where: { studentId },
    include: {
      event: { select: { id: true, title: true, dueDate: true } },
      course: { select: { id: true, title: true, subjectCode: true } },
      tutor: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    monthKey: currentMonthKey,
    usedThisMonth,
    maxPerMonth: MAX_STUDENT_RESCHEDULES_PER_MONTH,
    remainingThisMonth,
    requests,
  };
}

/**
 * Creates a formal reschedule request from student to tutor.
 * Does NOT immediately move the class session time.
 */
export async function createStudentRescheduleRequest(params: {
  studentId: string;
  eventId: string;
  requestedDate: Date;
  studentReason?: string;
  timezone?: string;
}) {
  const { studentId, eventId, requestedDate, studentReason, timezone } = params;

  // Validate eligibility
  const eligibility = await validateStudentRescheduleEligibility({
    studentId,
    eventId,
    scheduledDate: requestedDate,
  });

  if (!eligibility.allowed) {
    const error: any = new Error(eligibility.error || "Reschedule request not allowed.");
    error.code = eligibility.code;
    error.statusCode = eligibility.code === "MONTHLY_LIMIT_REACHED" ? 429 : 400;
    throw error;
  }

  const event = eligibility.event;
  const tutorId = event.course?.tutorId || event.requestedBy;

  if (!tutorId) {
    const error: any = new Error("No tutor is assigned to this class session.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const currentMonthKey = getCurrentMonthKey(now);

  const studentUser = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, timezone: true },
  });

  const tutorUser = await prisma.user.findUnique({
    where: { id: tutorId },
    select: { id: true, name: true, email: true, timezone: true },
  });

  const tutorTimezone = tutorUser?.timezone || DEFAULT_TIMEZONE;
  const studentTimezone = timezone || studentUser?.timezone || DEFAULT_TIMEZONE;

  // Create the ClassRescheduleRequest record
  const request = await prisma.classRescheduleRequest.create({
    data: {
      eventId: event.id,
      courseId: event.courseId,
      studentId,
      tutorId,
      originalDate: event.dueDate,
      requestedDate,
      studentReason: studentReason?.trim() || null,
      status: RescheduleRequestStatus.PENDING,
      monthKey: currentMonthKey,
    },
    include: {
      event: true,
      course: true,
      student: { select: { id: true, name: true, email: true, avatar: true } },
      tutor: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  // Notify Tutor of pending request
  const origTimeTutor = formatForUser(event.dueDate, tutorTimezone, {
    weekday: "short",
    month: "short",
  });
  const reqTimeTutor = formatForUser(requestedDate, tutorTimezone, {
    weekday: "short",
    month: "short",
  });

  const studentName = studentUser?.name || "Student";
  const reasonText = studentReason?.trim() ? ` Reason: "${studentReason.trim()}".` : "";

  await prisma.notification.create({
    data: {
      userId: tutorId,
      title: "🔄 Class Reschedule Request",
      message: `${studentName} requested to reschedule "${event.title}" from ${origTimeTutor} to ${reqTimeTutor}.${reasonText} Review and accept or decline.`,
      type: "WARNING",
      link: "/tutor?tab=classes",
    },
  });

  broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: tutorId });
  broadcastLMSEvent("EVENTS_CHANGED", { eventId: event.id, rescheduleRequested: true });

  return {
    success: true,
    message: "Reschedule request sent to your tutor! The class schedule will update once your tutor accepts.",
    request,
    reschedulesUsedThisMonth: eligibility.reschedulesUsedThisMonth + 1,
    remainingThisMonth: Math.max(0, MAX_STUDENT_RESCHEDULES_PER_MONTH - (eligibility.reschedulesUsedThisMonth + 1)),
  };
}

/**
 * Tutor accepts student's reschedule request:
 * Class event dueDate is updated to the requested time.
 */
export async function acceptRescheduleRequest(params: {
  requestId: string;
  tutorId: string;
  responseNote?: string;
}) {
  const { requestId, tutorId, responseNote } = params;

  const req = await prisma.classRescheduleRequest.findUnique({
    where: { id: requestId },
    include: {
      event: true,
      student: { select: { id: true, name: true, email: true, timezone: true } },
      tutor: { select: { id: true, name: true, email: true, timezone: true } },
      course: true,
    },
  });

  if (!req) {
    const error: any = new Error("Reschedule request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (req.tutorId !== tutorId) {
    const error: any = new Error("Unauthorized to accept this reschedule request.");
    error.statusCode = 403;
    throw error;
  }

  if (req.status !== RescheduleRequestStatus.PENDING) {
    const error: any = new Error(`Request has already been ${req.status.toLowerCase()}.`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Update the request status
  const updatedRequest = await prisma.classRescheduleRequest.update({
    where: { id: req.id },
    data: {
      status: RescheduleRequestStatus.ACCEPTED,
      tutorResponse: responseNote?.trim() || null,
    },
  });

  // 2. Actually move the class event time on the calendar
  let updatedDesc = req.event.description || "";
  const studentTimezone = req.student.timezone || DEFAULT_TIMEZONE;
  const newDateStudentStr = formatForUser(req.requestedDate, studentTimezone, {
    weekday: "short",
    month: "short",
  });

  const noteAddition = `\n\n[Rescheduled by Student Request: Accepted by Tutor on ${new Date().toLocaleDateString("en-US")}]`;
  updatedDesc = `${updatedDesc}${noteAddition}`.trim();

  const updatedEvent = await prisma.event.update({
    where: { id: req.eventId },
    data: {
      dueDate: req.requestedDate,
      description: updatedDesc,
      status: "SCHEDULED",
      startedAt: null,
      endedAt: null,
      actualStartTime: null,
      actualEndTime: null,
      reminderSent: false, // Reset reminder so 30-min alert will fire for the new time!
    },
  });

  // 3. Notify student of acceptance
  const tutorNoteText = responseNote?.trim() ? ` Note from tutor: "${responseNote.trim()}"` : "";

  await prisma.notification.create({
    data: {
      userId: req.studentId,
      title: "✅ Class Reschedule Accepted",
      message: `Your tutor accepted your reschedule request for "${req.event.title}". New class time: ${newDateStudentStr}.${tutorNoteText}`,
      type: "SUCCESS",
      link: "/dashboard",
    },
  });

  broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: req.studentId });
  broadcastLMSEvent("EVENTS_CHANGED", { eventId: req.eventId, rescheduled: true });

  return {
    success: true,
    message: "Reschedule request accepted and class calendar updated.",
    event: updatedEvent,
    request: updatedRequest,
  };
}

/**
 * Tutor declines student's reschedule request:
 * Class event dueDate remains unchanged.
 */
export async function declineRescheduleRequest(params: {
  requestId: string;
  tutorId: string;
  responseNote?: string;
}) {
  const { requestId, tutorId, responseNote } = params;

  const req = await prisma.classRescheduleRequest.findUnique({
    where: { id: requestId },
    include: {
      event: true,
      student: { select: { id: true, name: true, email: true, timezone: true } },
      tutor: { select: { id: true, name: true, email: true, timezone: true } },
    },
  });

  if (!req) {
    const error: any = new Error("Reschedule request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (req.tutorId !== tutorId) {
    const error: any = new Error("Unauthorized to decline this reschedule request.");
    error.statusCode = 403;
    throw error;
  }

  if (req.status !== RescheduleRequestStatus.PENDING) {
    const error: any = new Error(`Request has already been ${req.status.toLowerCase()}.`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Update the request status to DECLINED
  const updatedRequest = await prisma.classRescheduleRequest.update({
    where: { id: req.id },
    data: {
      status: RescheduleRequestStatus.DECLINED,
      tutorResponse: responseNote?.trim() || null,
    },
  });

  // Note: event.dueDate remains unchanged!

  // 2. Notify student of decline
  const studentTimezone = req.student.timezone || DEFAULT_TIMEZONE;
  const originalDateStudentStr = formatForUser(req.originalDate, studentTimezone, {
    weekday: "short",
    month: "short",
  });
  const tutorNoteText = responseNote?.trim() ? ` Note from tutor: "${responseNote.trim()}"` : "";

  await prisma.notification.create({
    data: {
      userId: req.studentId,
      title: "❌ Class Reschedule Declined",
      message: `Your tutor was unable to accept the reschedule request for "${req.event.title}". The class remains scheduled for ${originalDateStudentStr}.${tutorNoteText}`,
      type: "WARNING",
      link: "/dashboard",
    },
  });

  broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: req.studentId });
  broadcastLMSEvent("EVENTS_CHANGED", { eventId: req.eventId });

  return {
    success: true,
    message: "Reschedule request declined. Original class time remains unchanged.",
    request: updatedRequest,
    originalDate: req.originalDate,
  };
}

/**
 * Returns pending reschedule requests for a tutor.
 */
export async function getTutorPendingReschedules(tutorId: string) {
  return prisma.classRescheduleRequest.findMany({
    where: {
      tutorId,
      status: RescheduleRequestStatus.PENDING,
    },
    include: {
      event: { select: { id: true, title: true, dueDate: true, meetingLink: true } },
      course: { select: { id: true, title: true, subjectCode: true } },
      student: { select: { id: true, name: true, email: true, avatar: true, timezone: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
