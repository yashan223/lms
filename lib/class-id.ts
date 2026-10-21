import { prisma } from "@/lib/prisma";

/**
 * Generates a collision-free sequential/formatted Class ID.
 * Standard format: CLS-YYYY-NNNN (e.g., CLS-2026-0001)
 */
export async function generateUniqueClassCode(overrideYear?: number): Promise<string> {
  const year = overrideYear || new Date().getFullYear();
  const prefix = `CLS-${year}-`;

  try {
    const existingWithPrefix = await prisma.event.findMany({
      where: {
        classCode: {
          startsWith: prefix,
        },
      },
      select: {
        classCode: true,
      },
    });

    let maxSeq = 0;
    for (const item of existingWithPrefix) {
      if (item.classCode) {
        const parts = item.classCode.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    let exists = await prisma.event.findFirst({
      where: { classCode: candidate },
      select: { id: true },
    });

    while (exists) {
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
      exists = await prisma.event.findFirst({
        where: { classCode: candidate },
        select: { id: true },
      });
    }

    return candidate;
  } catch (error) {
    console.error("[generateUniqueClassCode] Fallback to random code due to error:", error);
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `CLS-${year}-${rand}`;
  }
}

/**
 * Resolves or formats a human-readable unique tracking Class ID for an event/session.
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
