import { parseTutorBio } from "@/lib/utils";
import { isCourseOL, isCourseAL } from "@/lib/currency";
export { parseTutorBio };

export interface TutorSubject {
  name: string;
  code: string;
  level: "AL" | "OL";
  levelBadge: string;
}

export interface FacultyTutor {
  id: string;
  tutorId?: string | null;
  name: string;
  avatar: string;
  headline: string;
  bio: string;
  category: string;
  level: "AL" | "OL" | "BOTH";
  levelLabel: string;
  rating: number;
  reviewCount: number;
  country?: string;
  classesCount: number;
  subjects: TutorSubject[];
  events?: any[];
  createdCourses?: Array<{
    id: string;
    title: string;
    slug: string;
    subjectCode?: string;
    category?: string;
    level?: string;
  }>;
}

/**
 * Determines whether a tutor is qualified to teach Cambridge/Edexcel AS & A2 ("AL")
 * or Cambridge/Edexcel IGCSE & OL ("OL").
 */
export function isTutorQualifiedForLevel(
  tutor: any,
  targetLevel?: string | null
): boolean {
  if (!tutor) return false;
  if (!targetLevel || targetLevel === "ALL" || targetLevel === "ALL_LEVELS") return true;

  const normTarget = String(targetLevel).toUpperCase().trim();
  const wantsAL =
    normTarget === "AL" ||
    normTarget === "ADVANCED" ||
    normTarget.includes("AS") ||
    normTarget.includes("A2");
  const wantsOL =
    normTarget === "OL" ||
    normTarget === "INTERMEDIATE" ||
    normTarget.includes("IGCSE") ||
    normTarget.includes("O/L");

  if (!wantsAL && !wantsOL) return true;

  // 1. If tutor object already has parsed level (e.g. from formatDbTutors)
  if (tutor.level === "BOTH") return true;
  if (wantsAL && tutor.level === "AL") return true;
  if (wantsOL && tutor.level === "OL") return true;
  if (tutor.level === "AL" && wantsOL) return false;
  if (tutor.level === "OL" && wantsAL) return false;

  // 2. Check bio JSON flags & rates
  let bioIsAL: boolean | undefined = undefined;
  let bioIsOL: boolean | undefined = undefined;
  if (typeof tutor.bio === "string" && tutor.bio.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(tutor.bio);
      if (parsed.isALTutor !== undefined) bioIsAL = Boolean(parsed.isALTutor);
      if (parsed.isOLTutor !== undefined) bioIsOL = Boolean(parsed.isOLTutor);
    } catch {}
  }

  // Explicit false in bio strictly disqualifies
  if (wantsAL && bioIsAL === false) return false;
  if (wantsOL && bioIsOL === false) return false;

  // Explicit true in bio qualifies
  if (wantsAL && bioIsAL === true) return true;
  if (wantsOL && bioIsOL === true) return true;

  // 3. DB rate columns check
  const hasIalRate =
    tutor.ialIasPayRate !== null &&
    tutor.ialIasPayRate !== undefined &&
    Number(tutor.ialIasPayRate) > 0;
  const hasIgcseRate =
    tutor.igcsePayRate !== null &&
    tutor.igcsePayRate !== undefined &&
    Number(tutor.igcsePayRate) > 0;

  if (wantsAL && hasIalRate) return true;
  if (wantsOL && hasIgcseRate) return true;
  if (wantsAL && !hasIalRate && hasIgcseRate) return false;
  if (wantsOL && !hasIgcseRate && hasIalRate) return false;

  // 4. Check tutor subjects (if present)
  if (Array.isArray(tutor.subjects) && tutor.subjects.length > 0) {
    const hasSubAL = tutor.subjects.some((s: any) => s.level === "AL" || s.level === "BOTH");
    const hasSubOL = tutor.subjects.some((s: any) => s.level === "OL" || s.level === "BOTH");
    if (wantsAL && hasSubAL) return true;
    if (wantsOL && hasSubOL) return true;
    if (wantsAL && !hasSubAL && hasSubOL) return false;
    if (wantsOL && !hasSubOL && hasSubAL) return false;
  }

  // 5. Check createdCourses (if present)
  if (Array.isArray(tutor.createdCourses) && tutor.createdCourses.length > 0) {
    const hasCourseAL = tutor.createdCourses.some((c: any) => isCourseAL(c));
    const hasCourseOL = tutor.createdCourses.some((c: any) => isCourseOL(c));
    if (wantsAL && hasCourseAL) return true;
    if (wantsOL && hasCourseOL) return true;
    if (wantsAL && !hasCourseAL && hasCourseOL) return false;
    if (wantsOL && !hasCourseOL && hasCourseAL) return false;
  }

  return true;
}

export function formatDbTutors(dbTutors: any[] = []): FacultyTutor[] {
  if (!dbTutors || !Array.isArray(dbTutors)) {
    return [];
  }

  return dbTutors.map((dbTutor) => {
    const tutorSubjects: TutorSubject[] = (dbTutor.createdCourses || []).map((c: any) => {
      const isOL = isCourseOL(c);
      return {
        name: c.title,
        code: c.subjectCode || (isOL ? "IGCSE" : "IAL"),
        level: isOL ? "OL" : "AL",
        levelBadge: isOL ? "Cambridge/Edexcel IGCSE & OL" : "Cambridge/Edexcel AS & A2",
      };
    });

    let isALTutor: boolean | null = null;
    let isOLTutor: boolean | null = null;
    if (typeof dbTutor.bio === "string" && dbTutor.bio.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(dbTutor.bio);
        if (parsed.isALTutor !== undefined) isALTutor = Boolean(parsed.isALTutor);
        if (parsed.isOLTutor !== undefined) isOLTutor = Boolean(parsed.isOLTutor);
        if (parsed.hourlyRateAL && Number(parsed.hourlyRateAL) > 0 && isALTutor === null) isALTutor = true;
        if (parsed.hourlyRateOL && Number(parsed.hourlyRateOL) > 0 && isOLTutor === null) isOLTutor = true;
      } catch {}
    }
    if (dbTutor.ialIasPayRate !== null && dbTutor.ialIasPayRate !== undefined) {
      if (Number(dbTutor.ialIasPayRate) > 0) {
        if (isALTutor !== false) isALTutor = true;
      } else {
        isALTutor = false;
      }
    }
    if (dbTutor.igcsePayRate !== null && dbTutor.igcsePayRate !== undefined) {
      if (Number(dbTutor.igcsePayRate) > 0) {
        if (isOLTutor !== false) isOLTutor = true;
      } else {
        isOLTutor = false;
      }
    }

    const hasCourseAL = tutorSubjects.some((s) => s.level === "AL");
    const hasCourseOL = tutorSubjects.some((s) => s.level === "OL");

    const hasAL = isALTutor === true || (isALTutor !== false && hasCourseAL);
    const hasOL = isOLTutor === true || (isOLTutor !== false && hasCourseOL);

    const levelVal =
      hasAL && hasOL
        ? "BOTH"
        : hasOL
        ? "OL"
        : hasAL
        ? "AL"
        : "BOTH";

    const levelLabel =
      levelVal === "BOTH"
        ? "Cambridge/Edexcel AS, A2 & OL"
        : levelVal === "OL"
        ? "Cambridge/Edexcel IGCSE & OL Specialist"
        : "Cambridge/Edexcel AS & A2 Specialist";

    return {
      id: dbTutor.id,
      tutorId: dbTutor.tutorId || null,
      name: dbTutor.name || "Academic Tutor",
      avatar: dbTutor.avatar || "",
      headline: dbTutor.headline || "Verified Academic Tutor",
      bio: parseTutorBio(dbTutor.bio),
      category:
        dbTutor.createdCourses?.[0]?.category ||
        dbTutor.headline ||
        "All",
      level: levelVal,
      levelLabel: levelLabel,
      rating: 5.0,
      reviewCount: dbTutor.createdCourses?.reduce(
        (acc: number, c: any) => acc + (c.enrollments?.length || 0),
        0
      ) || 0,
      country: dbTutor.country || undefined,
      classesCount:
        (dbTutor.createdCourses?.length || 0) + (dbTutor.events?.length || 0),
      subjects: tutorSubjects,
      events: dbTutor.events || [],
      createdCourses: dbTutor.createdCourses || [],
    };
  });
}
