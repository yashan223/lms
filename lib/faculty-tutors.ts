import { parseTutorBio } from "@/lib/utils";
import { isCourseOL } from "@/lib/currency";
export { parseTutorBio };

export interface TutorSubject {
  name: string;
  code: string;
  level: "AL" | "OL";
  levelBadge: string;
}

export interface FacultyTutor {
  id: string;
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
        levelBadge: isOL ? "London O/L" : "London A/L",
      };
    });

    let isALTutor = false;
    let isOLTutor = false;
    if (typeof dbTutor.bio === "string" && dbTutor.bio.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(dbTutor.bio);
        isALTutor = Boolean(parsed.isALTutor);
        isOLTutor = Boolean(parsed.isOLTutor);
      } catch {}
    }

    const hasAL = isALTutor || tutorSubjects.some((s) => s.level === "AL");
    const hasOL = isOLTutor || tutorSubjects.some((s) => s.level === "OL");
    const levelVal = hasAL && hasOL ? "BOTH" : hasOL ? "OL" : "AL";
    const levelLabel =
      hasAL && hasOL
        ? "London A/L & O/L"
        : hasOL
        ? "London O/L Specialist"
        : "London A/L Specialist";

    return {
      id: dbTutor.id,
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
