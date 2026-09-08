import { prisma } from "./prisma";

export interface TokenBundle {
  id: string;
  name: string;
  hours: number;
  tokens: number;
  price: number;
  popular: boolean;
  badge: string;
  description: string;
}

export const DEFAULT_BUNDLES: TokenBundle[] = [
  {
    id: "pack-6",
    name: "6 Hours Flexi Pack",
    hours: 6,
    tokens: 6,
    price: 24,
    popular: false,
    badge: "Starter",
    description:
      "6 hours of learning tokens. Use anytime for 1-on-1 tutor consultations or topic revision.",
  },
  {
    id: "pack-16",
    name: "16 Hours Standard Bundle",
    hours: 16,
    tokens: 16,
    price: 58,
    popular: true,
    badge: "Most Popular",
    description:
      "16 hours of learning tokens. Perfect for weekly tutoring sessions, past paper walkthroughs & unit mastery.",
  },
  {
    id: "pack-24",
    name: "24 Hours Mastery Vault",
    hours: 24,
    tokens: 24,
    price: 84,
    popular: false,
    badge: "Best Value",
    description:
      "24 hours of learning tokens. Total flexibility for full London A/L & O/L examination preparation.",
  },
];

/** Read bundles from the database. Falls back to DEFAULT_BUNDLES if the table is empty or errors. */
export async function getBundles(): Promise<TokenBundle[]> {
  try {
    const rows = await prisma.tokenBundle.findMany({
      orderBy: { hours: "asc" },
    });
    if (rows.length > 0) {
      return rows.map((b) => ({
        id: b.id,
        name: b.name,
        hours: b.hours,
        tokens: b.tokens,
        price: Number(b.price),
        popular: b.popular,
        badge: b.badge,
        description: b.description,
      }));
    }
  } catch (err) {
    console.error("getBundles DB error, using defaults:", err);
  }
  return DEFAULT_BUNDLES;
}

/** Persist bundles to the database (replaces all existing rows atomically). */
export async function saveBundles(bundles: TokenBundle[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.tokenBundle.deleteMany({});
    await tx.tokenBundle.createMany({
      data: bundles.map((b) => ({
        id: b.id,
        name: b.name,
        hours: b.hours,
        tokens: b.tokens,
        price: b.price,
        popular: b.popular,
        badge: b.badge,
        description: b.description,
      })),
    });
  });
}
