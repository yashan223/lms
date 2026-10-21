/**
 * Client-safe Class ID formatting utilities.
 * This file has NO server/Node.js imports — safe to use in Client Components.
 * For the server-side generator (which queries the DB), use @/lib/class-id.ts in API routes only.
 */

/**
 * Resolves or formats a human-readable unique tracking Class ID for an event/session.
 * Pure function — no DB access, safe in browser bundles.
 */
export function formatClassId(event: {
  id?: string;
  classCode?: string | null;
  description?: string | null;
}): string {
  if (event.classCode) {
    return event.classCode;
  }

  if (event.description) {
    const match = event.description.match(/Class ID:\s*([A-Za-z0-9_-]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  if (event.id) {
    const clean = event.id.replace(/[^a-zA-Z0-9]/g, "");
    return `CLS-${clean.slice(-6).toUpperCase()}`;
  }

  return "CLS-CLASS";
}
