/**
 * SERVER-ONLY: Class ID generator that queries the database.
 * Do NOT import this file in Client Components — use @/lib/class-id-client instead.
 */

import { prisma } from "@/lib/prisma";

// Re-export the pure formatting helper from the client-safe module.
export { formatClassId } from "@/lib/class-id-client";

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


