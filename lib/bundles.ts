import { prisma } from "./prisma";
import { TokenBundle, DEFAULT_BUNDLES } from "./bundle-types";

export * from "./bundle-types";

/** Read bundles from the database. Falls back to DEFAULT_BUNDLES if the table is empty or errors. */
export async function getBundles(): Promise<TokenBundle[]> {
  try {
    const rows = await prisma.tokenBundle.findMany({
      orderBy: { hours: "asc" },
    });
    if (rows.length > 0) {
      return rows.map((b) => {
        const fallback = DEFAULT_BUNDLES.find((d) => d.id === b.id);
        return {
          id: b.id,
          name: b.name,
          hours: b.hours,
          tokens: b.tokens,
          price: Number(b.price),
          lkrPrice: Number(b.lkrPrice) || fallback?.lkrPrice || 0,
          popular: b.popular,
          badge: b.badge,
          description: b.description,
          roleTarget: b.roleTarget || fallback?.roleTarget || `${b.tokens} Tokens (${b.hours} Hours Tutoring)`,
          ctaText: b.ctaText || fallback?.ctaText || `Get ${b.hours} Hours Pack`,
          features:
            b.features && Array.isArray(b.features) && b.features.length > 0
              ? b.features
              : fallback?.features || [
                  `${b.tokens} tokens (1 token = 1 hour learning credit)`,
                  "1-on-1 private tutoring with Tutors",
                  "Access to live syllabus masterclasses",
                  "Instant token crediting to student wallet",
                  "Full flexibility: student decides how to spend",
                  "Access to course materials & study notes",
                ],
        };
      });
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
        lkrPrice: b.lkrPrice,
        popular: b.popular,
        badge: b.badge,
        description: b.description,
        roleTarget: b.roleTarget || `${b.tokens} Tokens (${b.hours} Hours Tutoring)`,
        ctaText: b.ctaText || `Get ${b.hours} Hours Pack`,
        features: Array.isArray(b.features) ? b.features : [],
      })),
    });
  });
}
