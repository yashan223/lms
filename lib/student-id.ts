import { prisma } from "@/lib/prisma";

/**
 * Generates a collision-free sequential/formatted Student ID.
 * Standard format: STU-YYYY-NNNN (e.g., STU-2026-0001)
 */
export async function generateUniqueStudentId(overrideYear?: number): Promise<string> {
  const year = overrideYear || new Date().getFullYear();
  const prefix = `STU-${year}-`;

  // Find all existing studentIds for this year
  const existingWithPrefix = await prisma.user.findMany({
    where: {
      studentId: {
        startsWith: prefix,
      },
    },
    select: {
      studentId: true,
    },
  });

  // Extract the highest sequence number
  let maxSeq = 0;
  for (const item of existingWithPrefix) {
    if (item.studentId) {
      const parts = item.studentId.split("-");
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
    where: { studentId: candidate },
    select: { id: true },
  });

  while (exists) {
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    exists = await prisma.user.findFirst({
      where: { studentId: candidate },
      select: { id: true },
    });
  }

  return candidate;
}

/**
 * Ensures that a student user has an assigned student ID.
 * If they do not have one, generates and persists it.
 */
export async function ensureStudentIdForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, studentId: true, createdAt: true },
  });

  if (!user) return null;
  if (user.studentId) return user.studentId;
  if (user.role !== "STUDENT") return null;

  const year = new Date(user.createdAt).getFullYear();
  const newStudentId = await generateUniqueStudentId(year);

  await prisma.user.update({
    where: { id: userId },
    data: { studentId: newStudentId },
  });

  return newStudentId;
}

/**
 * Backfills student IDs for any existing student accounts that do not have one yet.
 */
export async function backfillExistingStudents(): Promise<number> {
  const studentsWithoutId = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      studentId: null,
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
  for (const student of studentsWithoutId) {
    const year = new Date(student.createdAt).getFullYear();
    const studentId = await generateUniqueStudentId(year);
    await prisma.user.update({
      where: { id: student.id },
      data: { studentId },
    });
    count++;
  }

  return count;
}
