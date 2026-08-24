import {
  Testimonial,
  FaqItem,
  PricingPlan,
  PlatformMetric,
} from "./types";

export const PLATFORM_METRICS: PlatformMetric[] = [
  {
    label: "Enrolled Scholars & Students",
    value: "28,400+",
    subtext: "London A/L (IAL) & London O/L (IGCSE)",
    growth: "+34% YoY",
  },
  {
    label: "A* & A Grade Success Rate",
    value: "96.4%",
    subtext: "Verified Academic Curriculum Results",
    growth: "Rank #1 Academy",
  },
  {
    label: "Coursework & Masterclasses",
    value: "3,800+",
    subtext: "Unit-by-Unit Topic Walkthroughs",
    growth: "2015-2026 Curriculum",
  },
  {
    label: "Academic Partner Centers",
    value: "140+",
    subtext: "International Academic Partner Colleges",
    growth: "UK Recognized",
  },
];

export const ACADEMY_TESTIMONIALS: Testimonial[] = [
  {
    id: "test-1",
    name: "Tariq Al-Mansoor",
    role: "London A/L Scholar (4 A* Achieved)",
    affiliation: "Admitted to Imperial College London (Mechanical Engineering)",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    content: "The Pure Maths P1-P4 and Physics Unit 1-6 walkthroughs were the exact reason I got 4 A*s. The lecturer breakdowns showed exactly where students master calculus and theory proofs.",
    rating: 5,
    userType: "STUDENT",
    verifiedCourse: "London A/L Pure Mathematics & Physics",
  },
  {
    id: "test-2",
    name: "Dr. Sarah Jenkins",
    role: "Senior Academic Lecturer in Mathematics",
    affiliation: "Chief Lecturer in Pure Mathematics & Mechanics",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    content: "Our goal is simple: ensure every student understands the curriculum inside out. EduPulse provides students with interactive step-by-step video proofs and instant teacher remarks.",
    rating: 5,
    userType: "INSTRUCTOR",
  },
  {
    id: "test-3",
    name: "Alastair Vance, M.Ed.",
    role: "Chief Academic Registrar & System Administrator",
    affiliation: "London International Academy Network",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    content: "Administering student registrations, coursework grading queues, and tracking syllabus progress across 140 academic centers has never been smoother.",
    rating: 5,
    userType: "ADMIN",
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "tier-student",
    name: "Scholar Pro (Single Subject)",
    badge: "Most Popular",
    description: "Full unit specification access, live interactive seminars, video lesson vaults, and solution guides.",
    monthlyPrice: 25,
    annualPrice: 20,
    popular: true,
    roleTarget: "Individual Scholar (O/L or A/L)",
    ctaText: "Enroll in Subject",
    features: [
      "Full unit topic video lectures",
      "Comprehensive video theory vaults",
      "Full Coursework Assessments with faculty marking",
      "Downloadable unit summary notes & formula sheets",
      "Live weekly faculty Q&A & problem solving sessions",
      "Complete Coursework Rubrics for Spring/Summer Series",
    ],
  },
  {
    id: "tier-instructor",
    name: "Triple Science & Maths Bundle",
    description: "Complete all-in-one package for London A/L (Maths, Physics, Chemistry) or London O/L.",
    monthlyPrice: 65,
    annualPrice: 50,
    popular: false,
    roleTarget: "Full A/L or O/L Student",
    ctaText: "Get Full A/L Science Bundle",
    features: [
      "Access to all 3 A/L or O/L Science/Commerce subjects",
      "Weekly live seminar classes with Senior Faculty",
      "Unlimited Coursework submissions & detailed feedback",
      "Priority 24/7 AI & Tutor doubt-solving assistance",
      "Complete Virtual Laboratory & Practical video demonstrations",
      "University Admissions & UCAS Personal Statement review",
    ],
  },
  {
    id: "tier-enterprise",
    name: "Institutional Campus License",
    badge: "Institutional Center",
    description: "For international schools, academic partner colleges, and private tutoring institutes.",
    monthlyPrice: 199,
    annualPrice: 169,
    popular: false,
    roleTarget: "International School / College",
    ctaText: "Register Center",
    features: [
      "Multi-Campus System Administrator Command Console",
      "Unlimited student roster management",
      "Automated coursework grading & grade boundary distribution",
      "Single Sign-On (SAML 2.0, Microsoft Azure, Google)",
      "Dedicated School Academic Director & Training",
      "Custom branded portal with full curriculum analytics",
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    category: "General",
    question: "Are your courses strictly aligned with London A/L & O/L specifications?",
    answer: "Yes! All courses are mapped 100% to international London A/L and O/L curriculum specifications, taught by experienced Senior Faculty Lecturers.",
  },
  {
    id: "faq-2",
    category: "Assessments",
    question: "Do you provide coursework assessments with teacher evaluations?",
    answer: "Yes. Every unit includes standardized coursework assessments. When students submit their solutions, our verified faculty grade them against official academic rubrics with detailed margin remarks.",
  },
  {
    id: "faq-3",
    category: "London A/L",
    question: "How do you prepare students for laboratory and practical units?",
    answer: "We offer dedicated high-definition video laboratory walkthroughs demonstrating required core practicals, error analysis calculations, graph plotting standards, and uncertainty estimation.",
  },
  {
    id: "faq-4",
    category: "Admissions",
    question: "Can independent students and distance learners use this platform?",
    answer: "Absolutely. Thousands of independent scholars and distance learners use EduPulse as their complete primary study and academic learning academy.",
  },
  {
    id: "faq-5",
    category: "Academic",
    question: "What qualifications are covered on EduPulse?",
    answer: "We specialize in London A/L (IAL AS & A2), London O/L (IGCSE), GCE Advanced Levels, and specialized subject curriculum masterclasses.",
  },
];
