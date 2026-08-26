import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generatePersistentMeetingLink(seed: string): string {
  if (!seed) return "https://meet.google.com/edp-live-lon";

  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let hash1 = 5381;
  let hash2 = 0;
  for (let i = 0; i < seed.length; i++) {
    const code = seed.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1 + code) >>> 0;
    hash2 = (hash2 * 31 + code) >>> 0;
  }

  const chars: string[] = [];
  let combined = (BigInt(hash1) << BigInt(32)) | BigInt(hash2);
  for (let i = 0; i < 10; i++) {
    const idx = Number(combined % BigInt(26));
    chars.push(alphabet[idx]);
    combined = combined / BigInt(26) + BigInt(hash1 + i);
  }

  const p1 = "edp";
  const p2 = chars.slice(3, 7).join("");
  const p3 = chars.slice(7, 10).join("");

  return `https://meet.google.com/${p1}-${p2}-${p3}`;
}

export function getSafeMeetingLink(link?: string | null, seed?: string | null): string {
  if (link && typeof link === "string") {
    const trimmed = link.trim();
    if (
      trimmed.startsWith("http") &&
      !trimmed.endsWith("/new") &&
      !trimmed.includes("edupulse-live") &&
      !trimmed.includes("xxx-yyyy-zzz")
    ) {
      return trimmed;
    }
  }
  return generatePersistentMeetingLink(seed || "edupulse-global-session");
}
