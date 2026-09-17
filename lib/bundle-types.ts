export interface TokenBundle {
  id: string;
  name: string;
  hours: number;
  tokens: number;
  price: number;
  lkrPrice: number;
  popular: boolean;
  badge: string;
  description: string;
  roleTarget?: string;
  ctaText?: string;
  features: string[];
}

export const DEFAULT_BUNDLES: TokenBundle[] = [
  {
    id: "pack-6",
    name: "6 Hours Flexi Pack",
    hours: 6,
    tokens: 6,
    price: 24,
    lkrPrice: 7200,
    popular: false,
    badge: "Starter",
    description:
      "6 learning hour tokens for targeted revision, consultation, or specific unit questions.",
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
    hours: 16,
    tokens: 16,
    price: 58,
    lkrPrice: 17400,
    popular: true,
    badge: "Most Popular",
    description:
      "16 learning hour tokens for regular weekly tutoring, past paper walkthroughs & topic mastery.",
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
    hours: 24,
    tokens: 24,
    price: 84,
    lkrPrice: 25200,
    popular: false,
    badge: "Best Value",
    description:
      "24 learning hour tokens for complete London A/L & O/L examination preparation and revision.",
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
