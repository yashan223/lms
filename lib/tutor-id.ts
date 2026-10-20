import { prisma } from "@/lib/prisma";

/**
 * Generates a collision-free sequential/formatted Tutor ID.
 * Standard format: TUT-YYYY-NNNN (e.g., TUT-2026-0001)
 */
export async function generateUniqueTutorId(overrideYear?: number): Promise<string> {
  const year = overrideYear || new Date().getFullYear();
  const prefix = `TUT-${year}-`;

  // Find all existing tutorIds for this year
  const existingWithPrefix = await prisma.user.findMany({
    where: {
      tutorId: {
        startsWith: prefix,
      },
    },
    select: {
      tutorId: true,
    },
  });

  // Extract the highest sequence number
  let maxSeq = 0;
  for (const item of existingWithPrefix) {
    if (item.tutorId) {
      const parts = item.tutorId.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;

  // Ensure 100% uniqueness in case of race condition
  let exists = await prisma.user.findFirst({
    where: { tutorId: candidate },
    select: { id: true },
  });

  while (exists) {
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    exists = await prisma.user.findFirst({
      where: { tutorId: candidate },
      select: { id: true },
    });
  }

  return candidate;
}

/**
 * Ensures that a tutor user has an assigned tutor ID.
 * If they do not have one, generates and persists it.
 */
export async function ensureTutorIdForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, tutorId: true, createdAt: true },
  });

  if (!user) return null;
  if (user.tutorId) return user.tutorId;
  const isTutor = user.role === "TUTOR" || (user.role as any) === "INSTRUCTOR";
  if (!isTutor) return null;

  const year = new Date(user.createdAt).getFullYear();
  const newTutorId = await generateUniqueTutorId(year);

  await prisma.user.update({
    where: { id: userId },
    data: { tutorId: newTutorId },
  });

  return newTutorId;
}

/**
 * Backfills tutor IDs for any existing tutor accounts that do not have one yet.
 */
export async function backfillExistingTutors(): Promise<number> {
  const tutorsWithoutId = await prisma.user.findMany({
    where: {
      role: { in: ["TUTOR", "INSTRUCTOR"] },
      tutorId: null,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  let count = 0;
  for (const tutor of tutorsWithoutId) {
    const year = new Date(tutor.createdAt).getFullYear();
    const tutorId = await generateUniqueTutorId(year);
    await prisma.user.update({
      where: { id: tutor.id },
      data: { tutorId },
    });
    count++;
  }

  return count;
}
