import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generatePersistentMeetingLink(seed: string): string {
  if (!seed) return "https://meet.jit.si/EduPulseAcademy-LiveRoom";

  const clean = seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
  return `https://meet.jit.si/EduPulseAcademy-${clean || "LiveRoom"}`;
}

export function getSafeMeetingLink(link?: string | null, seed?: string | null): string {
  if (link && typeof link === "string") {
    const trimmed = link.trim();
    if (
      trimmed.startsWith("http") &&
      !trimmed.endsWith("/new") &&
      !trimmed.includes("edupulse-live") &&
      !trimmed.includes("xxx-yyyy-zzz") &&
      !trimmed.includes("meet.google.com/edp-")
    ) {
      return trimmed;
    }
  }
  return generatePersistentMeetingLink(seed || "GlobalHall");
}
