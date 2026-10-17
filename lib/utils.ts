import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeGoogleMeetLink(link?: string | null): string {
  if (!link || typeof link !== "string" || !link.trim() || isGenericGoogleMeetNewLink(link)) {
    return "";
  }
  const trimmed = link.trim();
  if (trimmed.startsWith("https://meet.google.com/") || trimmed.startsWith("http://meet.google.com/")) {
    return trimmed;
  }
  if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(trimmed)) {
    return `https://meet.google.com/${trimmed.toLowerCase()}`;
  }
  if (trimmed.startsWith("http")) {
    return trimmed;
  }
  return `https://meet.google.com/${trimmed}`;
}

export function isGenericGoogleMeetNewLink(link?: string | null): boolean {
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

export function isValidGoogleMeetRoom(link?: string | null): boolean {
  if (!link || typeof link !== "string" || isGenericGoogleMeetNewLink(link)) return false;
  const trimmed = link.trim();
  return (
    /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(trimmed) ||
    /meet\.google\.com\/[a-z0-9_-]{8,}/i.test(trimmed)
  );
}

export function getSafeMeetingLink(link?: string | null): string {
  return normalizeGoogleMeetLink(link);
}

export function generateUniqueGoogleMeetCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const pick = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

export function generateUniqueGoogleMeetLink(): string {
  return `https://meet.google.com/${generateUniqueGoogleMeetCode()}`;
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

