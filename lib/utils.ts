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
