/**
 * SERVER-ONLY: Class ID generator that queries the database.
 * Do NOT import this file in Client Components — use @/lib/class-id-client instead.
 */

import { prisma as defaultPrisma } from "@/lib/prisma";

// Re-export the pure formatting helper from the client-safe module.
export { formatClassId } from "@/lib/class-id-client";

/**
 * Generates a collision-free sequential/formatted Class ID.
 * Standard format: CLS-YYYY-NNNN (e.g., CLS-2026-0001)
 *
 * @param overrideYear Optional year override
 * @param client Optional PrismaClient or TransactionClient (tx)
 * @param allocatedCodes Optional Set or array of class codes already allocated in the current batch
 */
export async function generateUniqueClassCode(
  overrideYear?: number,
  client?: any,
  allocatedCodes?: Set<string> | string[]
): Promise<string> {
  const db = client || defaultPrisma;
  const year = overrideYear || new Date().getFullYear();
  const prefix = `CLS-${year}-`;
  const allocatedSet = allocatedCodes instanceof Set ? allocatedCodes : new Set(allocatedCodes || []);

  try {
    const existingWithPrefix = await db.event.findMany({
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

    // Factor in any codes already allocated in the current batch/transaction
    for (const code of allocatedSet) {
      if (code && code.startsWith(prefix)) {
        const parts = code.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    let isTaken = allocatedSet.has(candidate);
    if (!isTaken) {
      const exists = await db.event.findFirst({
        where: { classCode: candidate },
        select: { id: true },
      });
      isTaken = Boolean(exists);
    }

    while (isTaken) {
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
      isTaken = allocatedSet.has(candidate);
      if (!isTaken) {
        const exists = await db.event.findFirst({
          where: { classCode: candidate },
          select: { id: true },
        });
        isTaken = Boolean(exists);
      }
    }

    allocatedSet.add(candidate);
    return candidate;
  } catch (error) {
    console.error("[generateUniqueClassCode] Fallback to random code due to error:", error);
    let randCandidate = "";
    do {
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      randCandidate = `CLS-${year}-${rand}`;
    } while (allocatedSet.has(randCandidate));
    allocatedSet.add(randCandidate);
    return randCandidate;
  }
}


