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
  createdCourses?: Array<{
    id: string;
    title: string;
    slug: string;
    subjectCode?: string;
    category?: string;
    level?: string;
  }>;
}

export const DEFAULT_FACULTY_TUTORS: FacultyTutor[] = [
  {
    id: "tutor-sarah-jenkins",
    name: "Dr. Sarah Jenkins",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
    headline: "Senior Examiner & Pure Mathematics Specialist • 18+ Yrs Cambridge & Edexcel",
    bio: "Former university lecturer and Edexcel senior examiner specializing in calculus proofs, method marks, vector analysis, and step-by-step past paper techniques for high achievers.",
    category: "School of Mathematics & Computing",
    level: "BOTH",
    levelLabel: "London A/L & O/L Specialist",
    rating: 4.98,
    reviewCount: 342,
    country: "United Kingdom",
    classesCount: 6,
    subjects: [
      { name: "Pure Mathematics (P1 & P2)", code: "WMA11/12", level: "AL", levelBadge: "London A/L" },
      { name: "Pure Mathematics (P3 & P4)", code: "WMA13/14", level: "AL", levelBadge: "London A/L" },
      { name: "Mechanics (M1)", code: "WME01", level: "AL", levelBadge: "London A/L" },
      { name: "Statistics (S1)", code: "WST01", level: "AL", levelBadge: "London A/L" },
      { name: "IGCSE Mathematics Higher Tier", code: "4MA1", level: "OL", levelBadge: "London O/L" },
      { name: "Additional Mathematics", code: "0606", level: "OL", levelBadge: "London O/L" },
    ],
  },
  {
    id: "tutor-marcus-vance",
    name: "Marcus Vance, M.Eng.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
    headline: "Software Architect & Cambridge A/L Computer Science (9618) Lead",
    bio: "Experienced tech lead with 12+ years teaching Cambridge 9618 algorithms, OOP Python, data structures, processor architecture, and computational problem solving.",
    category: "School of Mathematics & Computing",
    level: "BOTH",
    levelLabel: "London A/L & O/L Specialist",
    rating: 4.97,
    reviewCount: 215,
    country: "Singapore",
    classesCount: 4,
    subjects: [
      { name: "Computer Science Paper 1 (Theory)", code: "9618/12", level: "AL", levelBadge: "London A/L" },
      { name: "Computer Science Paper 2 (Algorithms & OOP)", code: "9618/22", level: "AL", levelBadge: "London A/L" },
      { name: "Advanced Programming (Paper 4 Python)", code: "9618/42", level: "AL", levelBadge: "London A/L" },
      { name: "IGCSE Computer Science", code: "0478", level: "OL", levelBadge: "London O/L" },
    ],
  },
  {
    id: "tutor-david-thorne",
    name: "Prof. David Thorne",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    headline: "Head of Physics & Engineering • Cambridge & Edexcel IAL Lead",
    bio: "Cambridge-educated physicist with 15+ years guiding students to A* in Edexcel IAL Physics with rigorous unit-by-unit syllabus breakdowns and experimental mechanics labs.",
    category: "School of Computing & Engineering",
    level: "AL",
    levelLabel: "London A/L Specialist",
    rating: 4.96,
    reviewCount: 289,
    country: "United Kingdom",
    classesCount: 4,
    subjects: [
      { name: "Physics Unit 1 (Mechanics & Materials)", code: "WPH11", level: "AL", levelBadge: "London A/L" },
      { name: "Physics Unit 2 (Waves & Electricity)", code: "WPH12", level: "AL", levelBadge: "London A/L" },
      { name: "Physics Unit 4 & 5 (Fields, Thermal & Nuclear)", code: "WPH14/15", level: "AL", levelBadge: "London A/L" },
      { name: "Physics Unit 3 & 6 (Practical Lab Skills)", code: "WPH13/16", level: "AL", levelBadge: "London A/L" },
    ],
  },
  {
    id: "tutor-rachel-aris",
    name: "Dr. Rachel Aris",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80",
    headline: "Doctor of Chemistry • Edexcel IAL & IGCSE Sciences Mentor",
    bio: "Specialist in breaking down complex organic synthesis, kinetics, equilibria, and experimental mark schemes with an intuitive visual coaching methodology.",
    category: "School of Science & O/L Academy",
    level: "BOTH",
    levelLabel: "London A/L & O/L Specialist",
    rating: 4.99,
    reviewCount: 418,
    country: "Canada",
    classesCount: 5,
    subjects: [
      { name: "Chemistry Unit 1 & 2 (Core Inorganic & Organic)", code: "WCH11/12", level: "AL", levelBadge: "London A/L" },
      { name: "Chemistry Unit 4 & 5 (Rates, Equilibria & Organic)", code: "WCH14/15", level: "AL", levelBadge: "London A/L" },
      { name: "IGCSE Chemistry (Double & Single Award)", code: "4CH1 / 0620", level: "OL", levelBadge: "London O/L" },
      { name: "IGCSE Combined Sciences", code: "0653", level: "OL", levelBadge: "London O/L" },
    ],
  },
  {
    id: "tutor-kavinda-wickramasinghe",
    name: "Kavinda Wickramasinghe",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    headline: "Lead O/L Academy Mentor • Cambridge & Edexcel IGCSE Specialist",
    bio: "Dedicated O/L mentor focused on building solid foundations for students transitioning into London IGCSE exams. Proven track record in A* scoring strategies.",
    category: "School of Science & O/L Academy",
    level: "OL",
    levelLabel: "London O/L (IGCSE) Lead",
    rating: 4.95,
    reviewCount: 194,
    country: "Sri Lanka",
    classesCount: 4,
    subjects: [
      { name: "IGCSE Mathematics (Core & Extended)", code: "0580 / 4MA1", level: "OL", levelBadge: "London O/L" },
      { name: "IGCSE Physics", code: "0625 / 4PH1", level: "OL", levelBadge: "London O/L" },
      { name: "IGCSE Biology", code: "0610 / 4BI1", level: "OL", levelBadge: "London O/L" },
      { name: "IGCSE English as a Second Language", code: "0510 / 4EA1", level: "OL", levelBadge: "London O/L" },
    ],
  },
  {
    id: "tutor-elena-rostova",
    name: "Elena Rostova, M.Sc.",
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&auto=format&fit=crop&q=80",
    headline: "Senior Economics Faculty • Cambridge & Edexcel Lead",
    bio: "Former economic policy advisor training students in high-scoring essay structures, data-response evaluation, and real-world micro/macro case analysis.",
    category: "School of Economics & Commerce",
    level: "BOTH",
    levelLabel: "London A/L & O/L Specialist",
    rating: 4.98,
    reviewCount: 312,
    country: "United Kingdom",
    classesCount: 4,
    subjects: [
      { name: "Economics Unit 1 (Markets in Action)", code: "WEC11", level: "AL", levelBadge: "London A/L" },
      { name: "Economics Unit 2 (Macroeconomic Performance)", code: "WEC12", level: "AL", levelBadge: "London A/L" },
      { name: "Economics Unit 3 & 4 (Business & Global Economy)", code: "WEC13/14", level: "AL", levelBadge: "London A/L" },
      { name: "IGCSE Economics & Business Studies", code: "0455 / 0450", level: "OL", levelBadge: "London O/L" },
    ],
  },
];

export function mergeFacultyTutors(dbTutors: any[] = []): FacultyTutor[] {
  if (!dbTutors || dbTutors.length === 0) {
    return DEFAULT_FACULTY_TUTORS;
  }

  const merged = [...DEFAULT_FACULTY_TUTORS];

  dbTutors.forEach((dbTutor) => {
    // Check if tutor already exists by name or id
    const existingIdx = merged.findIndex(
      (t) => t.id === dbTutor.id || t.name.toLowerCase().trim() === dbTutor.name?.toLowerCase().trim()
    );

    const tutorSubjects: TutorSubject[] = (dbTutor.createdCourses || []).map((c: any) => {
      const isOL = c.level === "BEGINNER" || c.title?.toLowerCase().includes("o/l") || c.title?.toLowerCase().includes("igcse");
      return {
        name: c.title,
        code: c.subjectCode || (isOL ? "IGCSE" : "IAL"),
        level: isOL ? "OL" : "AL",
        levelBadge: isOL ? "London O/L" : "London A/L",
      };
    });

    if (tutorSubjects.length === 0 && dbTutor.headline) {
      const isOL = dbTutor.headline.toLowerCase().includes("o/l") || dbTutor.headline.toLowerCase().includes("igcse");
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
    const levelLabel = hasAL && hasOL ? "London A/L & O/L" : hasOL ? "London O/L Specialist" : "London A/L Specialist";

    const formattedDbTutor: FacultyTutor = {
      id: dbTutor.id,
      name: dbTutor.name,
      avatar: dbTutor.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
      headline: dbTutor.headline || "Verified Academic Faculty Tutor",
      bio: dbTutor.bio || "Dedicated subject tutor delivering structured syllabus walkthroughs, past paper mastery, and personalized exam coaching.",
      category: dbTutor.createdCourses?.[0]?.category || "School of Science & O/L Academy",
      level: levelVal,
      levelLabel: levelLabel,
      rating: 4.98,
      reviewCount: 140,
      country: dbTutor.country || "Sri Lanka",
      classesCount: (dbTutor.createdCourses?.length || 0) + (dbTutor.events?.length || 0) || 1,
      subjects: tutorSubjects,
      createdCourses: dbTutor.createdCourses,
    };

    if (existingIdx >= 0) {
      merged[existingIdx] = {
        ...merged[existingIdx],
        ...formattedDbTutor,
        subjects: tutorSubjects.length > 0 ? tutorSubjects : merged[existingIdx].subjects,
      };
    } else {
      merged.unshift(formattedDbTutor);
    }
  });

  return merged;
}
