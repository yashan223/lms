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
