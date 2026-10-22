export interface CountryDialCode {
  name: string;
  code: string;
  dial: string;
  flag: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "🇱🇰" },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "🇬🇧" },
  { name: "United Arab Emirates", code: "AE", dial: "+971", flag: "🇦🇪" },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺" },
  { name: "United States", code: "US", dial: "+1", flag: "🇺🇸" },
  { name: "Canada", code: "CA", dial: "+1", flag: "🇨🇦" },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬" },
  { name: "Qatar", code: "QA", dial: "+974", flag: "🇶🇦" },
  { name: "Saudi Arabia", code: "SA", dial: "+966", flag: "🇸🇦" },
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳" },
  { name: "New Zealand", code: "NZ", dial: "+64", flag: "🇳🇿" },
  { name: "Malaysia", code: "MY", dial: "+60", flag: "🇲🇾" },
  { name: "Maldives", code: "MV", dial: "+960", flag: "🇲🇻" },
  { name: "Kuwait", code: "KW", dial: "+965", flag: "🇰🇼" },
  { name: "Oman", code: "OM", dial: "+968", flag: "🇴🇲" },
  { name: "Bahrain", code: "BH", dial: "+973", flag: "🇧🇭" },
  { name: "Germany", code: "DE", dial: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dial: "+33", flag: "🇫🇷" },
  { name: "Italy", code: "IT", dial: "+39", flag: "🇮🇹" },
  { name: "Japan", code: "JP", dial: "+81", flag: "🇯🇵" },
  { name: "China", code: "CN", dial: "+86", flag: "🇨🇳" },
  { name: "Hong Kong", code: "HK", dial: "+852", flag: "🇭🇰" },
  { name: "South Africa", code: "ZA", dial: "+27", flag: "🇿🇦" },
  { name: "Ireland", code: "IE", dial: "+353", flag: "🇮🇪" },
  { name: "Netherlands", code: "NL", dial: "+31", flag: "🇳🇱" },
  { name: "Sweden", code: "SE", dial: "+46", flag: "🇸🇪" },
  { name: "Switzerland", code: "CH", dial: "+41", flag: "🇨🇭" },
  { name: "Norway", code: "NO", dial: "+47", flag: "🇳🇴" },
];

export const DEFAULT_DIAL_CODE = "+94";

/**
 * Sanitizes phone input for national / subscriber digits (when dial code is chosen separately).
 * - Strips all non-digit, non-space, non-dash characters.
 * - Caps maximum digits to 10 (or 11 if leading 0).
 * - Detects if a user pasted a full international number with '+' and extracts the dial code.
 */
export function formatSubscriberPhone(
  value: string,
  onDialCodeDetected?: (dial: string) => void
): string {
  if (!value) return "";
  let input = value;

  // If user pasted a full international number starting with '+'
  if (input.startsWith("+")) {
    const matched = COUNTRY_DIAL_CODES.find((c) => input.startsWith(c.dial));
    if (matched) {
      if (onDialCodeDetected) onDialCodeDetected(matched.dial);
      input = input.slice(matched.dial.length).trim();
    } else {
      input = input.replace(/^\+/, "").trim();
    }
  }

  // Remove all characters except digits, spaces, and hyphens
  const cleaned = input.replace(/[^\d\s\-]/g, "");

  // Prevent multiple consecutive spaces or hyphens
  const singleSpaced = cleaned.replace(/\s{2,}/g, " ").replace(/\-{2,}/g, "-");

  // Determine maximum digits allowed
  // Standard national phone numbers (SL, UK, US, UAE, AU, etc.) are 9-10 digits, or 10-11 with leading 0
  const hasLeadingZero = singleSpaced.trim().startsWith("0");
  const maxDigits = hasLeadingZero ? 11 : 10;

  let digitCount = 0;
  let result = "";
  for (const char of singleSpaced) {
    if (/\d/.test(char)) {
      if (digitCount >= maxDigits) break;
      digitCount++;
    }
    result += char;
  }

  return result;
}

/**
 * Sanitizes full international phone numbers (with optional leading '+').
 * - Only allows leading '+', digits, spaces, and hyphens.
 * - Caps total digits to 15 (ITU E.164 maximum).
 */
export function formatInternationalPhone(value: string): string {
  if (!value) return "";
  const hasPlus = value.trim().startsWith("+");
  const digitsAndFormatting = value.replace(/[^\d\s\-]/g, "");
  const singleSpaced = digitsAndFormatting.replace(/\s{2,}/g, " ").replace(/\-{2,}/g, "-");

  let digitCount = 0;
  let result = hasPlus ? "+" : "";
  for (const char of singleSpaced) {
    if (/\d/.test(char)) {
      if (digitCount >= 15) break;
      digitCount++;
    }
    result += char;
  }
  return result;
}
