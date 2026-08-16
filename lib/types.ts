export type UserRole = "ADMIN" | "INSTRUCTOR" | "STUDENT";

export type CourseLevel =
  | "London O/L (IGCSE)"
  | "London A/L (AS Level)"
  | "London A/L (A2 Level)"
  | "Exam Series Revision"
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "All Levels";

export type ExamBoard = "Pearson Edexcel" | "Cambridge (CAIE)" | "Oxford AQA";

export type CourseCategory =
  | "Pure Mathematics & Mechanics"
  | "Physics (IAL & IGCSE)"
  | "Chemistry (IAL & IGCSE)"
  | "Biology & Life Sciences"
  | "Economics & Business Studies"
  | "Accounting & Finance"
  | "Computer Science & ICT"
  | string;

export interface Instructor {
  id: string;
  name: string;
  avatar: string;
  roleTitle: string;
  institution?: string;
  bio?: string;
  rating?: number;
  studentsCount?: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  examBoard?: ExamBoard;
  subjectCode?: string;
  thumbnail: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  studentsEnrolled: number;
  durationHours: number;
  lessonsCount: number;
  featured?: boolean;
  bestseller?: boolean;
  instructor: Instructor;
  tags: string[];
  skills: string[];
}

export interface StudentScholar {
  id: string;
  studentNumber: string;
  name: string;
  email: string;
  avatar: string;
  qualification: "London A/L (IAL)" | "London O/L (IGCSE)";
  examBoard: ExamBoard;
  targetSeries: "May/June 2026" | "Oct/Nov 2026" | "Jan 2027";
  enrolledSubjects: string[];
  mockAverage: string;
  status: "ACTIVE" | "PENDING_MOCK" | "ACCREDITED";
  feeStatus: "PAID" | "PARTIAL" | "OVERDUE";
  registeredDate: string;
}

export type CandidateStudent = StudentScholar;

export interface MockExamPaper {
  id: string;
  paperCode: string;
  title: string;
  examBoard: ExamBoard;
  level: "London A/L (IAL)" | "London O/L (IGCSE)";
  durationMins: number;
  totalMarks: number;
  submittedCount: number;
  gradedCount: number;
  avgPercentage: number;
  releaseDate: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  affiliation: string;
  avatar: string;
  content: string;
  rating: number;
  userType: UserRole;
  verifiedCourse?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
  roleTarget: string;
  ctaText: string;
}

export interface PlatformMetric {
  label: string;
  value: string;
  subtext: string;
  growth: string;
}
