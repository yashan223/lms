import { parseTutorBio } from "@/lib/utils";
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
      const isOL =
        c.level === "BEGINNER" ||
        c.title?.toLowerCase().includes("o/l") ||
        c.title?.toLowerCase().includes("igcse");
      return {
        name: c.title,
        code: c.subjectCode || (isOL ? "IGCSE" : "IAL"),
        level: isOL ? "OL" : "AL",
        levelBadge: isOL ? "London O/L" : "London A/L",
      };
    });

    if (tutorSubjects.length === 0 && dbTutor.headline) {
      const isOL =
        dbTutor.headline.toLowerCase().includes("o/l") ||
        dbTutor.headline.toLowerCase().includes("igcse");
      tutorSubjects.push({
        name: dbTutor.headline,
        code: isOL ? "IGCSE" : "IAL",
        level: isOL ? "OL" : "AL",
        levelBadge: isOL ? "London O/L" : "London A/L",
      });
    }

    const hasAL = tutorSubjects.some((s) => s.level === "AL");
    const hasOL = tutorSubjects.some((s) => s.level === "OL");
    const levelVal = hasAL && hasOL ? "BOTH" : hasOL ? "OL" : "AL";
    const levelLabel =
      hasAL && hasOL
        ? "London A/L & O/L"
        : hasOL
        ? "London O/L Specialist"
        : "London A/L Specialist";

    return {
      id: dbTutor.id,
      name: dbTutor.name || "Faculty Tutor",
      avatar: dbTutor.avatar || "",
      headline: dbTutor.headline || "Verified Academic Faculty Tutor",
      bio: parseTutorBio(dbTutor.bio),
      category:
        dbTutor.createdCourses?.[0]?.category ||
        "Chemistry & Biology",
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
