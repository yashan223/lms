import { prisma } from "@/lib/prisma";

/**
 * Generates a collision-free sequential/formatted Admin ID.
 * Standard format: ADM-YYYY-NNNN (e.g., ADM-2026-0001)
 */
export async function generateUniqueAdminId(overrideYear?: number): Promise<string> {
  const year = overrideYear || new Date().getFullYear();
  const prefix = `ADM-${year}-`;

  // Find all existing adminIds for this year
  const existingWithPrefix = await prisma.user.findMany({
    where: {
      adminId: {
        startsWith: prefix,
      },
    },
    select: {
      adminId: true,
    },
  });

  // Extract the highest sequence number
  let maxSeq = 0;
  for (const item of existingWithPrefix) {
    if (item.adminId) {
      const parts = item.adminId.split("-");
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
    where: { adminId: candidate },
    select: { id: true },
  });

  while (exists) {
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    exists = await prisma.user.findFirst({
      where: { adminId: candidate },
      select: { id: true },
    });
  }

  return candidate;
}

/**
 * Ensures that an admin user has an assigned admin ID.
 * If they do not have one, generates and persists it.
 */
export async function ensureAdminIdForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, adminId: true, createdAt: true },
  });

  if (!user) return null;
  if (user.adminId) return user.adminId;
  if (user.role !== "ADMIN") return null;

  const year = new Date(user.createdAt).getFullYear();
  const newAdminId = await generateUniqueAdminId(year);

  await prisma.user.update({
    where: { id: userId },
    data: { adminId: newAdminId },
  });

  return newAdminId;
}

/**
 * Backfills admin IDs for any existing admin accounts that do not have one yet.
 */
export async function backfillExistingAdmins(): Promise<number> {
  const adminsWithoutId = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      adminId: null,
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
  for (const admin of adminsWithoutId) {
    const year = new Date(admin.createdAt).getFullYear();
    const adminId = await generateUniqueAdminId(year);
    await prisma.user.update({
      where: { id: admin.id },
      data: { adminId },
    });
    count++;
  }

  return count;
}
