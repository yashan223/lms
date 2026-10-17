import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeMeetingLink(link?: string | null): string {
  if (!link || typeof link !== "string" || !link.trim() || isGenericMeetingLink(link)) {
    return "";
  }
  const trimmed = link.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function isGenericMeetingLink(link?: string | null): boolean {
  if (!link || typeof link !== "string") return true;
  const trimmed = link.trim().toLowerCase();
  return (
    !trimmed ||
    trimmed === "https://meet.google.com/new" ||
    trimmed === "http://meet.google.com/new" ||
    trimmed === "https://meet.google.com/new/" ||
    trimmed === "meet.google.com/new" ||
    trimmed === "/new"
  );
}

// Deprecated aliases kept for backward compatibility
export const normalizeGoogleMeetLink = normalizeMeetingLink;
export const isGenericGoogleMeetNewLink = isGenericMeetingLink;

export function isValidMeetingRoom(link?: string | null): boolean {
  if (!link || typeof link !== "string" || isGenericMeetingLink(link)) return false;
  return link.trim().length > 4;
}

export const isValidGoogleMeetRoom = isValidMeetingRoom;

export function getSafeMeetingLink(link?: string | null): string {
  return normalizeMeetingLink(link);
}

export function parseTutorBio(bio: string | null | undefined): string {
  if (!bio || typeof bio !== "string") return "";
  const trimmed = bio.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.about === "string" && parsed.about.trim()) {
        return parsed.about.trim();
      }
      if (typeof parsed.bio === "string" && parsed.bio.trim()) {
        return parsed.bio.trim();
      }
      return "";
    } catch {
      const match = trimmed.match(/"about"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (match && match[1]) {
        try {
          const res = JSON.parse(`"${match[1]}"`);
          if (typeof res === "string" && res.trim()) return res.trim();
        } catch {
          if (match[1].trim()) return match[1].trim();
        }
      }
      return "";
    }
  }
  return trimmed;
}

