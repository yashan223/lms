/**
 * Utility functions for calendar integration and Google Calendar linking
 */

export interface CalendarEventPayload {
  title: string;
  description?: string | null;
  dueDate: string | Date;
  courseTitle?: string | null;
  location?: string | null;
  durationMinutes?: number;
}

/**
 * Builds a direct Google Calendar event creation URL
 */
export function buildGoogleCalendarUrl({
  title,
  description,
  dueDate,
  courseTitle,
  location,
  durationMinutes = 60,
}: CalendarEventPayload): string {
  const start = new Date(dueDate);
  const validStart = isNaN(start.getTime()) ? new Date() : start;
  const end = new Date(validStart.getTime() + durationMinutes * 60 * 1000);

  // Format UTC dates as YYYYMMDDTHHmmssZ
  const formatUtc = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mm = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    return `${y}${m}${day}T${hh}${mm}${ss}Z`;
  };

  const datesParam = `${formatUtc(validStart)}/${formatUtc(end)}`;

  const detailsLines: string[] = [];
  if (courseTitle) detailsLines.push(`📘 Course: ${courseTitle}`);
  if (description) detailsLines.push(`📝 Details: ${description}`);
  detailsLines.push(`🎓 EduPulse LMS • London A/L & O/L Academy (Faculty Academic Calendar)`);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: datesParam,
    details: detailsLines.join("\n\n"),
  });

  // Extract link if in description or explicitly provided
  if (location) {
    params.set("location", location);
  } else if (description && (description.includes("http://") || description.includes("https://"))) {
    const match = description.match(/https?:\/\/[^\s]+/);
    if (match && match[0]) {
      params.set("location", match[0]);
    }
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
