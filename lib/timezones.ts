/**
 * Regional Timezone & Conversion Utilities for PulseEDU Global (LMS)
 * Supports dynamic regional timezone selection, auto-detection,
 * dual-time display (e.g. Student Local vs Tutor/Colombo Base),
 * and ISO-accurate slot mapping across international regions.
 */

export interface RegionalTimezone {
  id: string; // IANA Timezone identifier, e.g. "Asia/Colombo"
  region: string; // Country / Region display name, e.g. "Sri Lanka"
  city: string; // Key reference city, e.g. "Colombo"
  countryCode: string; // ISO 2-letter code, e.g. "LK"
  flag: string; // Emoji flag, e.g. "🇱🇰"
  standardOffset: string; // e.g. "UTC+05:30"
  abbr: string; // e.g. "IST", "BST", "GST", "EST"
  label: string; // Full dropdown label
}

export const DEFAULT_TIMEZONE = "Asia/Colombo";
export const DEFAULT_REGION = "Sri Lanka";

/**
 * Curated international regions aligned with London O/L & A/L student and tutor hubs
 */
export const REGIONAL_TIMEZONES: RegionalTimezone[] = [
  {
    id: "Asia/Colombo",
    region: "Sri Lanka",
    city: "Colombo",
    countryCode: "LK",
    flag: "🇱🇰",
    standardOffset: "UTC+05:30",
    abbr: "IST",
    label: "🇱🇰 Sri Lanka (Colombo) • UTC+05:30",
  },
  {
    id: "Europe/London",
    region: "United Kingdom",
    city: "London",
    countryCode: "GB",
    flag: "🇬🇧",
    standardOffset: "UTC+01:00",
    abbr: "BST",
    label: "🇬🇧 United Kingdom (London) • GMT/BST",
  },
  {
    id: "Asia/Dubai",
    region: "United Arab Emirates",
    city: "Dubai",
    countryCode: "AE",
    flag: "🇦🇪",
    standardOffset: "UTC+04:00",
    abbr: "GST",
    label: "🇦🇪 United Arab Emirates (Dubai) • UTC+04:00",
  },
  {
    id: "Asia/Riyadh",
    region: "Saudi Arabia & Qatar",
    city: "Riyadh / Doha",
    countryCode: "SA",
    flag: "🇸🇦",
    standardOffset: "UTC+03:00",
    abbr: "AST",
    label: "🇸🇦 Gulf / Saudi / Qatar (Riyadh) • UTC+03:00",
  },
  {
    id: "Asia/Singapore",
    region: "Singapore & Malaysia",
    city: "Singapore",
    countryCode: "SG",
    flag: "🇸🇬",
    standardOffset: "UTC+08:00",
    abbr: "SGT",
    label: "🇸🇬 Singapore & Malaysia • UTC+08:00",
  },
  {
    id: "Asia/Kolkata",
    region: "India",
    city: "Kolkata / Mumbai",
    countryCode: "IN",
    flag: "🇮🇳",
    standardOffset: "UTC+05:30",
    abbr: "IST",
    label: "🇮🇳 India (Kolkata / Delhi) • UTC+05:30",
  },
  {
    id: "Australia/Sydney",
    region: "Australia (East)",
    city: "Sydney / Melbourne",
    countryCode: "AU",
    flag: "🇦🇺",
    standardOffset: "UTC+10:00",
    abbr: "AEST",
    label: "🇦🇺 Australia (Sydney / Melbourne) • AEST",
  },
  {
    id: "Australia/Perth",
    region: "Australia (West)",
    city: "Perth",
    countryCode: "AU",
    flag: "🇦🇺",
    standardOffset: "UTC+08:00",
    abbr: "AWST",
    label: "🇦🇺 Australia (Perth) • AWST (UTC+08:00)",
  },
  {
    id: "America/New_York",
    region: "USA / Canada (East)",
    city: "New York / Toronto",
    countryCode: "US",
    flag: "🇺🇸",
    standardOffset: "UTC-04:00",
    abbr: "EDT",
    label: "🇺🇸 USA / Canada (New York / Eastern) • EDT",
  },
  {
    id: "America/Chicago",
    region: "USA (Central)",
    city: "Chicago",
    countryCode: "US",
    flag: "🇺🇸",
    standardOffset: "UTC-05:00",
    abbr: "CDT",
    label: "🇺🇸 USA (Central Time) • CDT",
  },
  {
    id: "America/Los_Angeles",
    region: "USA / Canada (West)",
    city: "Los Angeles / Vancouver",
    countryCode: "US",
    flag: "🇺🇸",
    standardOffset: "UTC-07:00",
    abbr: "PDT",
    label: "🇺🇸 USA / Canada (Pacific) • PDT",
  },
  {
    id: "America/Toronto",
    region: "Canada (Eastern)",
    city: "Toronto",
    countryCode: "CA",
    flag: "🇨🇦",
    standardOffset: "UTC-04:00",
    abbr: "EDT",
    label: "🇨🇦 Canada (Toronto / Montreal) • EDT",
  },
  {
    id: "Pacific/Auckland",
    region: "New Zealand",
    city: "Auckland",
    countryCode: "NZ",
    flag: "🇳🇿",
    standardOffset: "UTC+12:00",
    abbr: "NZST",
    label: "🇳🇿 New Zealand (Auckland) • NZST",
  },
  {
    id: "Europe/Berlin",
    region: "Central Europe",
    city: "Berlin / Paris / Rome",
    countryCode: "DE",
    flag: "🇩🇪",
    standardOffset: "UTC+02:00",
    abbr: "CEST",
    label: "🇩🇪 Central Europe (Berlin / Paris) • CEST",
  },
  {
    id: "Asia/Karachi",
    region: "Pakistan",
    city: "Karachi",
    countryCode: "PK",
    flag: "🇵🇰",
    standardOffset: "UTC+05:00",
    abbr: "PKT",
    label: "🇵🇰 Pakistan (Karachi) • UTC+05:00",
  },
  {
    id: "Asia/Dhaka",
    region: "Bangladesh",
    city: "Dhaka",
    countryCode: "BD",
    flag: "🇧🇩",
    standardOffset: "UTC+06:00",
    abbr: "BST",
    label: "🇧🇩 Bangladesh (Dhaka) • UTC+06:00",
  },
  {
    id: "Africa/Johannesburg",
    region: "South Africa",
    city: "Johannesburg",
    countryCode: "ZA",
    flag: "🇿🇦",
    standardOffset: "UTC+02:00",
    abbr: "SAST",
    label: "🇿🇦 South Africa (Johannesburg) • UTC+02:00",
  },
  {
    id: "Asia/Kuwait",
    region: "Kuwait & Bahrain",
    city: "Kuwait City",
    countryCode: "KW",
    flag: "🇰🇼",
    standardOffset: "UTC+03:00",
    abbr: "AST",
    label: "🇰🇼 Kuwait & Bahrain • UTC+03:00",
  },
  {
    id: "Asia/Muscat",
    region: "Oman",
    city: "Muscat",
    countryCode: "OM",
    flag: "🇴🇲",
    standardOffset: "UTC+04:00",
    abbr: "GST",
    label: "🇴🇲 Oman (Muscat) • UTC+04:00",
  },
  {
    id: "Indian/Maldives",
    region: "Maldives",
    city: "Male",
    countryCode: "MV",
    flag: "🇲🇻",
    standardOffset: "UTC+05:00",
    abbr: "MVT",
    label: "🇲🇻 Maldives (Male) • UTC+05:00",
  },
];

/**
 * Country code to primary timezone mapping
 */
const COUNTRY_TO_TIMEZONE: Record<string, string> = {
  LK: "Asia/Colombo",
  GB: "Europe/London",
  UK: "Europe/London",
  US: "America/New_York",
  CA: "America/Toronto",
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  QA: "Asia/Riyadh",
  SG: "Asia/Singapore",
  MY: "Asia/Singapore",
  IN: "Asia/Kolkata",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
  PK: "Asia/Karachi",
  BD: "Asia/Dhaka",
  MV: "Indian/Maldives",
  KW: "Asia/Kuwait",
  OM: "Asia/Muscat",
  BH: "Asia/Riyadh",
  DE: "Europe/Berlin",
  FR: "Europe/Berlin",
  IT: "Europe/Berlin",
  ES: "Europe/Berlin",
  ZA: "Africa/Johannesburg",
};

/**
 * Detect client browser timezone (Client side only, fallback to default)
 */
export function getUserBrowserTimezone(): string {
  if (typeof window === "undefined") {
    return DEFAULT_TIMEZONE;
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {}
  return DEFAULT_TIMEZONE;
}

/**
 * Resolve regional timezone object from ID or country code
 */
export function getRegionalTimezone(tzOrCountry?: string | null): RegionalTimezone {
  if (!tzOrCountry) {
    return REGIONAL_TIMEZONES[0]; // Sri Lanka
  }

  const clean = tzOrCountry.trim();

  // 1. Direct match with ID
  const directMatch = REGIONAL_TIMEZONES.find(
    (r) => r.id.toLowerCase() === clean.toLowerCase()
  );
  if (directMatch) return directMatch;

  // 2. Direct match with Country Code
  const countryCode = clean.toUpperCase();
  const byCode = REGIONAL_TIMEZONES.find((r) => r.countryCode === countryCode);
  if (byCode) return byCode;

  // 3. Lookup in mapping table
  const mappedTz = COUNTRY_TO_TIMEZONE[countryCode];
  if (mappedTz) {
    const mappedObj = REGIONAL_TIMEZONES.find((r) => r.id === mappedTz);
    if (mappedObj) return mappedObj;
  }

  // 4. Match by Region name (case-insensitive)
  const byRegion = REGIONAL_TIMEZONES.find(
    (r) => r.region.toLowerCase().includes(clean.toLowerCase())
  );
  if (byRegion) return byRegion;

  // 5. Dynamic fallback if it's a valid IANA timezone not explicitly in curated list
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: clean,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(d);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "TZ";
    const offsetStr = getTimezoneOffsetString(d, clean);

    return {
      id: clean,
      region: clean.split("/").pop()?.replace(/_/g, " ") || clean,
      city: clean.split("/").pop()?.replace(/_/g, " ") || clean,
      countryCode: "GL",
      flag: "🌐",
      standardOffset: offsetStr,
      abbr: tzName,
      label: `🌐 ${clean.replace(/_/g, " ")} (${offsetStr})`,
    };
  } catch {}

  return REGIONAL_TIMEZONES[0];
}

/**
 * Format exact UTC offset string (e.g. "UTC+05:30", "UTC-04:00")
 */
export function getTimezoneOffsetString(date: Date = new Date(), timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value;
    if (offsetPart && offsetPart.startsWith("GMT")) {
      return offsetPart.replace("GMT", "UTC");
    }
    if (offsetPart) return offsetPart;
  } catch {}

  // Manual fallback via offset minutes
  try {
    const dStr = date.toLocaleString("en-US", { timeZone: timezone });
    const localD = new Date(dStr);
    const diffMin = Math.round((localD.getTime() - date.getTime()) / 60000);
    const sign = diffMin >= 0 ? "+" : "-";
    const absMin = Math.abs(diffMin);
    const h = String(Math.floor(absMin / 60)).padStart(2, "0");
    const m = String(absMin % 60).padStart(2, "0");
    return `UTC${sign}${h}:${m}`;
  } catch {
    return "UTC+00:00";
  }
}

/**
 * Get timezone abbreviation (e.g. "IST", "BST", "GST", "EDT")
 */
export function getTimezoneAbbr(date: Date = new Date(), timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(date);
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

/**
 * Formats a Date or ISO string into a local 12-hour time string in the target timezone
 * e.g. "02:30 PM" or "9:00 AM"
 */
export function formatTimeInTimezone(
  dateOrIso: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE,
  options: { hour12?: boolean; includeAbbr?: boolean } = {}
): string {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return "";

  const { hour12 = true, includeAbbr = false } = options;

  try {
    const timeStr = d.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12,
    });

    if (includeAbbr) {
      const abbr = getTimezoneAbbr(d, timezone);
      return abbr ? `${timeStr} ${abbr}` : timeStr;
    }

    return timeStr;
  } catch {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
}

/**
 * Formats a Date or ISO string into a localized Date string in the target timezone
 * e.g. "Fri, Sep 25" or "Sep 25, 2026"
 */
export function formatDateInTimezone(
  dateOrIso: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE,
  options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }
): string {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return "";

  try {
    return d.toLocaleDateString("en-US", {
      timeZone: timezone,
      ...options,
    });
  } catch {
    return d.toLocaleDateString("en-US", options);
  }
}

/**
 * Extracts calendar date parts ("YYYY-MM-DD", hour, minute, dayOfWeek 0..6)
 * of a UTC Date as it appears inside the target timezone.
 */
export function getDatePartsInTimezone(
  dateOrIso: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dateStr: string; // "YYYY-MM-DD"
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
} {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) {
    return { year: 2026, month: 1, day: 1, hour: 0, minute: 0, dateStr: "2026-01-01", dayOfWeek: 0 };
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "narrow",
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";

    const year = parseInt(getVal("year"), 10);
    const month = parseInt(getVal("month"), 10);
    const day = parseInt(getVal("day"), 10);
    let hour = parseInt(getVal("hour"), 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(getVal("minute"), 10);

    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;

    // Determine Day of Week in target timezone
    // Construct local midnight representation to reliably extract day of week
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    const weekdayStr = dayFormatter.format(d).toLowerCase();
    const mapDays: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    const dayOfWeek = mapDays[weekdayStr.slice(0, 3)] ?? d.getDay();

    return { year, month, day, hour, minute, dateStr, dayOfWeek };
  } catch {
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      dateStr: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      dayOfWeek: d.getDay(),
    };
  }
}

/**
 * Creates an exact UTC Date instance given a calendar date ("YYYY-MM-DD")
 * and time ("HH:mm") interpreted inside the specified regional timezone.
 */
export function createDateFromTimezoneParts(
  dateStr: string,
  timeStr: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Initial estimate in UTC
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(utcGuess);
    const getPart = (type: string) => {
      const p = parts.find((pt) => pt.type === type);
      return p ? parseInt(p.value, 10) : 0;
    };

    const targetYear = getPart("year");
    const targetMonth = getPart("month");
    const targetDay = getPart("day");
    let targetHour = getPart("hour");
    if (targetHour === 24) targetHour = 0;
    const targetMinute = getPart("minute");

    const targetAsUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0);
    const offsetMs = targetAsUtc - utcGuess.getTime();

    // Actual UTC moment
    return new Date(utcGuess.getTime() - offsetMs);
  } catch {
    return new Date(year, month - 1, day, hour, minute);
  }
}

/**
 * Calculates dual-time comparison for slots (e.g. Student Region vs Tutor Base Region)
 */
export function getDualTimeDisplay(
  dateOrIso: Date | string | number,
  viewerTz: string = DEFAULT_TIMEZONE,
  baseTz: string = DEFAULT_TIMEZONE
): {
  viewerTime: string;
  viewerDateLabel: string;
  viewerTzAbbr: string;
  viewerOffset: string;
  baseTime: string;
  baseDateLabel: string;
  baseTzAbbr: string;
  baseOffset: string;
  isSameTimezone: boolean;
  diffSummary: string;
} {
  const d = typeof dateOrIso === "string" || typeof dateOrIso === "number" ? new Date(dateOrIso) : dateOrIso;

  const viewerReg = getRegionalTimezone(viewerTz);
  const baseReg = getRegionalTimezone(baseTz);

  const viewerTime = formatTimeInTimezone(d, viewerTz);
  const viewerDateLabel = formatDateInTimezone(d, viewerTz, { weekday: "short", month: "short", day: "numeric" });
  const viewerTzAbbr = getTimezoneAbbr(d, viewerTz) || viewerReg.abbr;
  const viewerOffset = getTimezoneOffsetString(d, viewerTz);

  const baseTime = formatTimeInTimezone(d, baseTz);
  const baseDateLabel = formatDateInTimezone(d, baseTz, { weekday: "short", month: "short", day: "numeric" });
  const baseTzAbbr = getTimezoneAbbr(d, baseTz) || baseReg.abbr;
  const baseOffset = getTimezoneOffsetString(d, baseTz);

  const isSameTimezone = viewerTz === baseTz || viewerOffset === baseOffset;

  let diffSummary = "";
  if (!isSameTimezone) {
    diffSummary = `${viewerReg.flag} ${viewerTime} ${viewerTzAbbr} (${baseReg.flag} ${baseTime} ${baseTzAbbr})`;
  }

  return {
    viewerTime,
    viewerDateLabel,
    viewerTzAbbr,
    viewerOffset,
    baseTime,
    baseDateLabel,
    baseTzAbbr,
    baseOffset,
    isSameTimezone,
    diffSummary,
  };
}

/**
 * Converts a 24-hour time string ("HH:mm" or "H:mm") to 12-hour AM/PM format
 * e.g. "09:30" -> "9:30 AM", "14:00" -> "2:00 PM", "00:00" -> "12:00 AM", "12:00" -> "12:00 PM"
 */
export function format24hTo12h(time24: string): string {
  if (!time24) return "";
  const parts = time24.trim().split(":");
  if (parts.length < 2) return time24;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1].padStart(2, "0");
  if (isNaN(hour)) return time24;

  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour -= 12;
  }

  return `${hour}:${minute} ${period}`;
}

/**
 * Converts a 12-hour AM/PM time string to 24-hour "HH:mm" format
 * e.g. "9:30 AM" -> "09:30", "2:00 PM" -> "14:00", "12:00 AM" -> "00:00"
 */
export function format12hTo24h(time12: string): string {
  if (!time12) return "";
  const clean = time12.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return time12;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3];

  if (period === "PM" && hour < 12) {
    hour += 12;
  } else if (period === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}
