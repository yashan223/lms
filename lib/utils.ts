import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeGoogleMeetLink(link?: string | null): string {
  if (!link || typeof link !== "string" || !link.trim()) {
    return "https://meet.google.com/new";
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

export function getSafeMeetingLink(link?: string | null): string {
  return normalizeGoogleMeetLink(link);
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
    } catch {
      const match = trimmed.match(/"about"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (match && match[1]) {
        try {
          return JSON.parse(`"${match[1]}"`);
        } catch {
          return match[1];
        }
      }
    }
  }
  return trimmed;
}

