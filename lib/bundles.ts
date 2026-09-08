import fs from "fs";
import path from "path";

export interface TokenBundle {
  id: string;
  name: string;
  hours: number;
  tokens: number;
  price: number;
  popular: boolean;
  badge: string;
  description: string;
}

const DEFAULT_BUNDLES: TokenBundle[] = [
  {
    id: "pack-6",
    name: "6 Hours Flexi Pack",
    hours: 6,
    tokens: 6,
    price: 24,
    popular: false,
    badge: "Starter",
    description:
      "6 hours of learning tokens. Use anytime for 1-on-1 tutor consultations or topic revision.",
  },
  {
    id: "pack-16",
    name: "16 Hours Standard Bundle",
    hours: 16,
    tokens: 16,
    price: 58,
    popular: true,
    badge: "Most Popular",
    description:
      "16 hours of learning tokens. Perfect for weekly tutoring sessions, past paper walkthroughs & unit mastery.",
  },
  {
    id: "pack-24",
    name: "24 Hours Mastery Vault",
    hours: 24,
    tokens: 24,
    price: 84,
    popular: false,
    badge: "Best Value",
    description:
      "24 hours of learning tokens. Total flexibility for full London A/L & O/L examination preparation.",
  },
];

const BUNDLES_FILE = path.join(process.cwd(), "storage", "bundles.json");

export function getBundles(): TokenBundle[] {
  try {
    if (fs.existsSync(BUNDLES_FILE)) {
      const raw = fs.readFileSync(BUNDLES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as TokenBundle[];
      }
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_BUNDLES;
}

export function saveBundles(bundles: TokenBundle[]): void {
  const dir = path.dirname(BUNDLES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(BUNDLES_FILE, JSON.stringify(bundles, null, 2), "utf-8");
}
