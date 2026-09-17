import {
  Testimonial,
  FaqItem,
  PricingPlan,
  PlatformMetric,
} from "./types";

export const PLATFORM_METRICS: PlatformMetric[] = [
  {
    label: "Enrolled Students",
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
    label: "Curriculum Masterclasses",
    value: "3,800+",
    subtext: "Unit-by-Unit Topic Walkthroughs",
    growth: "2015-2026 Curriculum",
  },
  {
    label: "Academic Partner Centers",
    value: "140+",
    subtext: "International Academic Partner Colleges",
    growth: "Nationally Recognized",
  },
];

export const ACADEMY_TESTIMONIALS: Testimonial[] = [
  {
    id: "test-1",
    name: "Tariq Al-Mansoor",
    role: "London A/L Student (4 A* Achieved)",
    affiliation: "Admitted to Imperial College London (Mechanical Engineering)",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    content: "The study handbooks and formula sheets helped me master pure mathematics and physics. The step-by-step video proof lessons gave me the clarity to score full marks in Mechanics and Pure 4.",
    rating: 5,
    userType: "STUDENT",
  },
  {
    id: "test-2",
    name: "Dr. Fiona Abernathy, Ph.D.",
    role: "Senior Academic Tutor in Mathematics",
    affiliation: "Lead Tutor in Pure Mathematics & Mechanics",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    content: "Our goal is simple: ensure every student understands the curriculum inside out. EduPulse provides students with interactive step-by-step video proofs and comprehensive study materials.",
    rating: 5,
    userType: "TUTOR",
  },
  {
    id: "test-3",
    name: "Alastair Vance, M.Ed.",
    role: "Chief Academic Registrar & System Administrator",
    affiliation: "London International Academy Network",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    content: "Administering student registrations, tutor allocations, and tracking syllabus progress across 140 academic centers has never been smoother.",
    rating: 5,
    userType: "ADMIN",
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "pack-6",
    name: "6 Hours Flexi Pack",
    badge: "Starter",
    description: "6 learning hour tokens for targeted revision, consultation, or specific unit questions.",
    monthlyPrice: 24,
    annualPrice: 24,
    popular: false,
    roleTarget: "6 Tokens (6 Hours Tutoring)",
    ctaText: "Get 6 Hours Pack",
    features: [
      "6 tokens (1 token = 1 hour learning credit)",
      "Book 1-on-1 private tutoring with Senior Tutors",
      "Join live interactive syllabus masterclasses",
      "Instant token crediting to student wallet",
      "Full flexibility: student decides when & how to spend",
      "Access to course materials & study notes",
    ],
  },
  {
    id: "pack-16",
    name: "16 Hours Standard Bundle",
    badge: "Most Popular",
    description: "16 learning hour tokens for regular weekly tutoring, past paper walkthroughs & topic mastery.",
    monthlyPrice: 58,
    annualPrice: 58,
    popular: true,
    roleTarget: "16 Tokens (16 Hours Tutoring)",
    ctaText: "Get 16 Hours Bundle",
    features: [
      "16 tokens (1 token = 1 hour learning credit)",
      "Weekly 1-on-1 sessions with Tutors",
      "Access all subject live seminar masterclasses",
      "Priority scheduling & reschedule flexibility",
      "Comprehensive worked past paper clinics",
      "Direct encrypted messaging with Subject Tutors",
    ],
  },
  {
    id: "pack-24",
    name: "24 Hours Mastery Vault",
    badge: "Best Value",
    description: "24 learning hour tokens for complete London A/L & O/L examination preparation and revision.",
    monthlyPrice: 84,
    annualPrice: 84,
    popular: false,
    roleTarget: "24 Tokens (24 Hours Tutoring)",
    ctaText: "Get 24 Hours Vault",
    features: [
      "24 tokens (1 token = 1 hour learning credit)",
      "Total schedule control across Pure Maths & Sciences",
      "Unlimited 1-on-1 tutor booking",
      "Comprehensive syllabus & mock exam coverage",
      "Zero expiration: use tokens throughout the academic year",
      "VIP tutor support & study material downloads",
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    category: "General",
    question: "How does the token and hours purchase system work?",
    answer: "You purchase a bundle of tokens (6h, 16h, or 24h packs). Each token equals 1 hour of learning credit. As a student, you have complete freedom to decide how and when to spend your hours—whether on 1-on-1 private tutoring with tutors, live interactive masterclasses, or exam revision.",
  },
  {
    id: "faq-2",
    category: "Study Materials",
    question: "Do you provide downloadable past paper solutions and study handbooks?",
    answer: "Yes. Every course includes comprehensive downloadable study materials including official study handbooks, unit formula sheets, worked past paper solutions, and practical laboratory guides without any assignment grading burdens.",
  },
  {
    id: "faq-3",
    category: "Tutors",
    question: "Who are the tutors on EduPulse?",
    answer: "All courses and 1-on-1 sessions are conducted by experienced Tutors specialized in the London A/L and O/L curriculum specifications.",
  },
  {
    id: "faq-4",
    category: "London A/L",
    question: "How do you prepare students for laboratory and practical units?",
    answer: "We offer dedicated high-definition video laboratory walkthroughs demonstrating required core practicals, error analysis calculations, graph plotting standards, and uncertainty estimation.",
  },
  {
    id: "faq-5",
    category: "Admissions",
    question: "Can independent students and distance learners use this platform?",
    answer: "Absolutely. Thousands of independent students and distance learners use EduPulse as their complete primary study and academic learning academy.",
  },
  {
    id: "faq-6",
    category: "Academic",
    question: "What qualifications are covered on EduPulse?",
    answer: "We specialize in London A/L (IAL AS & A2), London O/L (IGCSE), GCE Advanced Levels, and specialized subject curriculum masterclasses.",
  },
];
