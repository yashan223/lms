import { formatTimeInTimezone } from "@/lib/timezones";

export interface MergedSlotGroup<T = any> {
  startTime: string; // ISO string
  endTime: string;   // ISO string
  durationMinutes: number;
  durationHours: number;
  isMerged: boolean;
  slotsCount: number;
  originalSlots: T[];
  timeDisplay: string;
  tutorTimeDisplay?: string;
}

/**
 * Checks if two slots are consecutive (adjacent in time).
 * Uses a 60-second tolerance to account for minor clock discrepancies or ISO conversions.
 */
export function areSlotsConsecutive(
  slotA: { endTime: string | Date },
  slotB: { startTime: string | Date }
): boolean {
  const endA = new Date(slotA.endTime).getTime();
  const startB = new Date(slotB.startTime).getTime();
  if (isNaN(endA) || isNaN(startB)) return false;
  return Math.abs(startB - endA) <= 60000;
}

/**
 * Merges consecutive/adjacent 1-hour slots into continuous class sessions.
 * For example: 1:30 PM - 2:30 PM + 2:30 PM - 3:30 PM -> 1:30 PM - 3:30 PM (2-Hour Class).
 * Non-consecutive slots remain separate single sessions.
 */
export function mergeConsecutiveSlots<
  T extends {
    startTime: string | Date;
    endTime: string | Date;
    timeDisplay?: string;
    tutorTimeDisplay?: string;
  }
>(slots: T[], timezone?: string, tutorTimezone?: string): MergedSlotGroup<T>[] {
  if (!Array.isArray(slots) || slots.length === 0) {
    return [];
  }

  // Sort slots chronologically by start time
  const sorted = [...slots].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const groups: MergedSlotGroup<T>[] = [];

  for (const slot of sorted) {
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) continue;

    const lastGroup = groups[groups.length - 1];

    if (lastGroup && areSlotsConsecutive(lastGroup, slot)) {
      // Slot is adjacent to previous group -> merge them
      lastGroup.endTime = slotEnd.toISOString();
      lastGroup.slotsCount += 1;
      const totalMinutes = Math.round(
        (new Date(lastGroup.endTime).getTime() - new Date(lastGroup.startTime).getTime()) / 60000
      );
      lastGroup.durationMinutes = totalMinutes;
      lastGroup.durationHours = totalMinutes / 60;
      lastGroup.isMerged = true;
      lastGroup.originalSlots.push(slot);

      // Re-format display strings
      if (timezone) {
        const sStr = formatTimeInTimezone(lastGroup.startTime, timezone);
        const eStr = formatTimeInTimezone(lastGroup.endTime, timezone);
        lastGroup.timeDisplay = `${sStr} - ${eStr}`;
      } else {
        lastGroup.timeDisplay = `${formatTimeFallback(lastGroup.startTime)} - ${formatTimeFallback(lastGroup.endTime)}`;
      }

      if (tutorTimezone) {
        const tsStr = formatTimeInTimezone(lastGroup.startTime, tutorTimezone);
        const teStr = formatTimeInTimezone(lastGroup.endTime, tutorTimezone);
        lastGroup.tutorTimeDisplay = `${tsStr} - ${teStr}`;
      } else if (lastGroup.originalSlots[0]?.tutorTimeDisplay) {
        lastGroup.tutorTimeDisplay = `${lastGroup.originalSlots[0].tutorTimeDisplay.split("-")[0].trim()} - ${slot.tutorTimeDisplay?.split("-")[1]?.trim() || formatTimeFallback(lastGroup.endTime)}`;
      }
    } else {
      // Start a new group
      const totalMinutes = Math.round((slotEnd.getTime() - slotStart.getTime()) / 60000);
      const groupStartIso = slotStart.toISOString();
      const groupEndIso = slotEnd.toISOString();

      let timeDisplay = slot.timeDisplay;
      if (!timeDisplay) {
        if (timezone) {
          timeDisplay = `${formatTimeInTimezone(groupStartIso, timezone)} - ${formatTimeInTimezone(groupEndIso, timezone)}`;
        } else {
          timeDisplay = `${formatTimeFallback(groupStartIso)} - ${formatTimeFallback(groupEndIso)}`;
        }
      }

      let tutorTimeDisplay = slot.tutorTimeDisplay;
      if (!tutorTimeDisplay && tutorTimezone) {
        tutorTimeDisplay = `${formatTimeInTimezone(groupStartIso, tutorTimezone)} - ${formatTimeInTimezone(groupEndIso, tutorTimezone)}`;
      }

      groups.push({
        startTime: groupStartIso,
        endTime: groupEndIso,
        durationMinutes: totalMinutes > 0 ? totalMinutes : 60,
        durationHours: totalMinutes > 0 ? totalMinutes / 60 : 1,
        isMerged: false,
        slotsCount: 1,
        originalSlots: [slot],
        timeDisplay,
        tutorTimeDisplay,
      });
    }
  }

  return groups;
}

function formatTimeFallback(isoStr: string | Date): string {
  const d = typeof isoStr === "string" ? new Date(isoStr) : isoStr;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * Extracts the duration in hours from an event's title and description.
 * Defaults to 1 hour if not specified.
 */
export function getEventDurationHours(
  title?: string | null,
  description?: string | null
): number {
  const desc = description || "";

  // 1. Check explicit token count in description (e.g., "Tokens: 2 Tokens")
  const tokenMatch = desc.match(/Tokens:\s*(\d+)\s*Tokens?/i);
  if (tokenMatch) {
    const val = parseInt(tokenMatch[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // 2. Check explicit duration in description (e.g., "Duration: 2 Hours")
  const durationMatch = desc.match(/Duration:\s*(\d+(\.\d+)?)\s*Hours?/i);
  if (durationMatch) {
    const val = parseFloat(durationMatch[1]);
    if (!isNaN(val) && val > 0) return val;
  }

  // 3. Check keywords in title and description
  const text = `${title || ""} ${desc}`.toLowerCase();
  if (text.includes("3h") || text.includes("3 hours") || text.includes("3-hour") || text.includes("180 min")) {
    return 3;
  }
  if (text.includes("2h") || text.includes("2 hours") || text.includes("2-hour") || text.includes("120 min")) {
    return 2;
  }
  if (text.includes("1.5h") || text.includes("1.5 hours") || text.includes("1.5 hour") || text.includes("90 min")) {
    return 1.5;
  }
  if (text.includes("1h") || text.includes("1 hour") || text.includes("1-hour") || text.includes("60 min")) {
    return 1;
  }

  return 1;
}

/**
 * Extracts the duration in minutes from an event's title and description.
 * Defaults to 60 minutes if not specified.
 */
export function getEventDurationMinutes(
  title?: string | null,
  description?: string | null
): number {
  const desc = description || "";
  const minMatch = desc.match(/\((\d+)\s*Minutes?\)/i);
  if (minMatch) {
    const val = parseInt(minMatch[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  const hours = getEventDurationHours(title, description);
  return Math.round(hours * 60);
}
