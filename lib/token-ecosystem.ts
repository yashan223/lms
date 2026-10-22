import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { sendLowTokenBalanceEmail } from "@/lib/email";
import { TokenGrantStatus } from "@prisma/client";
import { getEventDurationHours } from "@/lib/scheduling";
import { removeLiveClassNotifications } from "@/lib/notifications";

export const DEFAULT_PAY_GRADES = {
  IGCSE: 750, // LKR per hour / token
  IAL_IAS: 850, // LKR per hour / token
};

export const DEFAULT_BONUS_TIERS = {
  tier1MinHours: 50,
  tier1BonusLkr: 5000,
  tier2MinHours: 75,
  tier2BonusLkr: 7500,
  tier3MinHours: 100,
  tier3BonusLkr: 10000,
};

export interface PayGradeAndBonusSettings {
  igcseRateLkr: number;
  ialRateLkr: number;
  tier1MinHours: number;
  tier1BonusLkr: number;
  tier2MinHours: number;
  tier2BonusLkr: number;
  tier3MinHours: number;
  tier3BonusLkr: number;
}

/**
 * Returns current Admin Pay Grade rates and Bonus tier settings from the DB or defaults.
 */
export async function getPayGradeSettings(): Promise<PayGradeAndBonusSettings> {
  try {
    const setting = await prisma.payGradeSetting.findUnique({
      where: { id: "default_pay_grades" },
    });
    if (setting) {
      return {
        igcseRateLkr: setting.igcseRateLkr ?? DEFAULT_PAY_GRADES.IGCSE,
        ialRateLkr: setting.ialRateLkr ?? DEFAULT_PAY_GRADES.IAL_IAS,
        tier1MinHours: setting.tier1MinHours ?? DEFAULT_BONUS_TIERS.tier1MinHours,
        tier1BonusLkr: setting.tier1BonusLkr ?? DEFAULT_BONUS_TIERS.tier1BonusLkr,
        tier2MinHours: setting.tier2MinHours ?? DEFAULT_BONUS_TIERS.tier2MinHours,
        tier2BonusLkr: setting.tier2BonusLkr ?? DEFAULT_BONUS_TIERS.tier2BonusLkr,
        tier3MinHours: setting.tier3MinHours ?? DEFAULT_BONUS_TIERS.tier3MinHours,
        tier3BonusLkr: setting.tier3BonusLkr ?? DEFAULT_BONUS_TIERS.tier3BonusLkr,
      };
    }
  } catch (err) {
    console.warn("[PayGrades] Error fetching pay grade settings, using defaults:", err);
  }

  return {
    igcseRateLkr: DEFAULT_PAY_GRADES.IGCSE,
    ialRateLkr: DEFAULT_PAY_GRADES.IAL_IAS,
    tier1MinHours: DEFAULT_BONUS_TIERS.tier1MinHours,
    tier1BonusLkr: DEFAULT_BONUS_TIERS.tier1BonusLkr,
    tier2MinHours: DEFAULT_BONUS_TIERS.tier2MinHours,
    tier2BonusLkr: DEFAULT_BONUS_TIERS.tier2BonusLkr,
    tier3MinHours: DEFAULT_BONUS_TIERS.tier3MinHours,
    tier3BonusLkr: DEFAULT_BONUS_TIERS.tier3BonusLkr,
  };
}

/**
 * Updates Admin Pay Grade rates and Bonus tier settings in the database.
 */
export async function updatePayGradeSettings(rates: {
  igcseRateLkr?: number;
  ialRateLkr?: number;
  tier1MinHours?: number;
  tier1BonusLkr?: number;
  tier2MinHours?: number;
  tier2BonusLkr?: number;
  tier3MinHours?: number;
  tier3BonusLkr?: number;
}): Promise<PayGradeAndBonusSettings> {
  const current = await getPayGradeSettings();
  const updated = await prisma.payGradeSetting.upsert({
    where: { id: "default_pay_grades" },
    create: {
      id: "default_pay_grades",
      igcseRateLkr: rates.igcseRateLkr ?? current.igcseRateLkr,
      ialRateLkr: rates.ialRateLkr ?? current.ialRateLkr,
      tier1MinHours: rates.tier1MinHours ?? current.tier1MinHours,
      tier1BonusLkr: rates.tier1BonusLkr ?? current.tier1BonusLkr,
      tier2MinHours: rates.tier2MinHours ?? current.tier2MinHours,
      tier2BonusLkr: rates.tier2BonusLkr ?? current.tier2BonusLkr,
      tier3MinHours: rates.tier3MinHours ?? current.tier3MinHours,
      tier3BonusLkr: rates.tier3BonusLkr ?? current.tier3BonusLkr,
    },
    update: {
      ...(rates.igcseRateLkr !== undefined ? { igcseRateLkr: rates.igcseRateLkr } : {}),
      ...(rates.ialRateLkr !== undefined ? { ialRateLkr: rates.ialRateLkr } : {}),
      ...(rates.tier1MinHours !== undefined ? { tier1MinHours: rates.tier1MinHours } : {}),
      ...(rates.tier1BonusLkr !== undefined ? { tier1BonusLkr: rates.tier1BonusLkr } : {}),
      ...(rates.tier2MinHours !== undefined ? { tier2MinHours: rates.tier2MinHours } : {}),
      ...(rates.tier2BonusLkr !== undefined ? { tier2BonusLkr: rates.tier2BonusLkr } : {}),
      ...(rates.tier3MinHours !== undefined ? { tier3MinHours: rates.tier3MinHours } : {}),
      ...(rates.tier3BonusLkr !== undefined ? { tier3BonusLkr: rates.tier3BonusLkr } : {}),
    },
  });

  return {
    igcseRateLkr: updated.igcseRateLkr,
    ialRateLkr: updated.ialRateLkr,
    tier1MinHours: updated.tier1MinHours,
    tier1BonusLkr: updated.tier1BonusLkr,
    tier2MinHours: updated.tier2MinHours,
    tier2BonusLkr: updated.tier2BonusLkr,
    tier3MinHours: updated.tier3MinHours,
    tier3BonusLkr: updated.tier3BonusLkr,
  };
}

/**
 * Calculates non-stacking monthly bonus according to highest achieved tier.
 * Tiers strictly evaluate the final total of completed hours in the month.
 * Rule: Only the single highest tier is awarded (Example: 85 hours gives Tier 2 only, not Tier 1 + 2).
 */
export function calculateTutorMonthlyBonus(
  totalHours: number,
  config?: Partial<PayGradeAndBonusSettings>
) {
  const t1Min = config?.tier1MinHours ?? DEFAULT_BONUS_TIERS.tier1MinHours;
  const t1Bonus = config?.tier1BonusLkr ?? DEFAULT_BONUS_TIERS.tier1BonusLkr;
  const t2Min = config?.tier2MinHours ?? DEFAULT_BONUS_TIERS.tier2MinHours;
  const t2Bonus = config?.tier2BonusLkr ?? DEFAULT_BONUS_TIERS.tier2BonusLkr;
  const t3Min = config?.tier3MinHours ?? DEFAULT_BONUS_TIERS.tier3MinHours;
  const t3Bonus = config?.tier3BonusLkr ?? DEFAULT_BONUS_TIERS.tier3BonusLkr;

  let unlockedBonusLkr = 0;
  let currentTier: "Tier 1" | "Tier 2" | "Tier 3" | null = null;
  let nextTier: "Tier 1" | "Tier 2" | "Tier 3" | null = null;
  let nextTierMinHours = t1Min;
  let hoursToNextTier = Math.max(0, t1Min - totalHours);

  if (totalHours >= t3Min) {
    unlockedBonusLkr = t3Bonus;
    currentTier = "Tier 3";
    nextTier = null;
    nextTierMinHours = t3Min;
    hoursToNextTier = 0;
  } else if (totalHours >= t2Min) {
    unlockedBonusLkr = t2Bonus;
    currentTier = "Tier 2";
    nextTier = "Tier 3";
    nextTierMinHours = t3Min;
    hoursToNextTier = Math.max(0, t3Min - totalHours);
  } else if (totalHours >= t1Min) {
    unlockedBonusLkr = t1Bonus;
    currentTier = "Tier 1";
    nextTier = "Tier 2";
    nextTierMinHours = t2Min;
    hoursToNextTier = Math.max(0, t2Min - totalHours);
  } else {
    unlockedBonusLkr = 0;
    currentTier = null;
    nextTier = "Tier 1";
    nextTierMinHours = t1Min;
    hoursToNextTier = Math.max(0, t1Min - totalHours);
  }

  // Progress relative to highest tier (100 hours)
  const progressPercent = Math.min(100, Math.round((totalHours / t3Min) * 100));

  const tiers = [
    {
      id: "tier1",
      name: "Tier 1",
      minHours: t1Min,
      maxHours: t2Min - 1,
      bonusLkr: t1Bonus,
      achieved: totalHours >= t1Min,
      active: currentTier === "Tier 1",
    },
    {
      id: "tier2",
      name: "Tier 2",
      minHours: t2Min,
      maxHours: t3Min - 1,
      bonusLkr: t2Bonus,
      achieved: totalHours >= t2Min,
      active: currentTier === "Tier 2",
    },
    {
      id: "tier3",
      name: "Tier 3",
      minHours: t3Min,
      maxHours: null,
      bonusLkr: t3Bonus,
      achieved: totalHours >= t3Min,
      active: currentTier === "Tier 3",
    },
  ];

  return {
    totalHours,
    unlockedBonusLkr,
    currentTier,
    nextTier,
    nextTierMinHours,
    hoursToNextTier,
    progressPercent,
    tiers,
  };
}

/**
 * Classifies course/class academic tier into IGCSE (750 LKR) or IAL/IAS (850 LKR).
 */
export function determineClassTier(course?: {
  title?: string | null;
  slug?: string | null;
  subjectCode?: string | null;
  level?: string | null;
  category?: string | null;
} | null, studentLevel?: string | null): {
  tier: "IGCSE" | "IAL_IAS";
  label: string;
} {
  const text = `${course?.title || ""} ${course?.slug || ""} ${course?.subjectCode || ""} ${course?.level || ""} ${studentLevel || ""}`.toLowerCase();

  // If text explicitly points to O/L, IGCSE, GCSE, or Beginner/Intermediate -> IGCSE
  if (
    text.includes("igcse") ||
    text.includes("gcse") ||
    text.includes("o/l") ||
    text.includes("ol") ||
    text.includes("o-level") ||
    course?.level === "BEGINNER" ||
    studentLevel === "OL"
  ) {
    return { tier: "IGCSE", label: "IGCSE Level (O/L)" };
  }

  // Default to A-Level: IAL & IAS
  return { tier: "IAL_IAS", label: "IAL & IAS (A-Level)" };
}

/**
 * Records a new token grant for a student with a lifespan of exactly 365 days (1 year).
 */
export async function grantStudentTokens(params: {
  userId: string;
  tokens: number;
  packageName: string;
  costLkr?: number;
  referenceId?: string;
}): Promise<any> {
  const { userId, tokens, packageName, costLkr = 0, referenceId } = params;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // exactly 365 days

  let wallet = await prisma.tokenWallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.tokenWallet.create({
      data: { userId, balance: 0 },
    });
  }

  const grant = await prisma.tokenGrant.create({
    data: {
      walletId: wallet.id,
      userId,
      packageName,
      tokensGranted: tokens,
      tokensRemaining: tokens,
      costLkr,
      purchasedAt: now,
      expiresAt,
      status: TokenGrantStatus.ACTIVE,
      referenceId,
    },
  });

  await prisma.tokenWallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: tokens } },
  });

  await prisma.tokenTransaction.create({
    data: {
      walletId: wallet.id,
      amount: tokens,
      type: "PURCHASE",
      description: `Granted ${packageName} (+${tokens} Tokens)`,
      referenceId: referenceId || grant.id,
    },
  });

  return grant;
}

/**
 * Audits and expires any token grants older than 365 days.
 */
export async function expireOverdueTokenGrants(userId?: string): Promise<number> {
  const now = new Date();
  const expiredGrants = await prisma.tokenGrant.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: TokenGrantStatus.ACTIVE,
      expiresAt: { lt: now },
      tokensRemaining: { gt: 0 },
    },
    include: { wallet: true },
  });

  let totalExpired = 0;
  for (const grant of expiredGrants) {
    const expiredCount = grant.tokensRemaining;
    await prisma.$transaction(async (tx) => {
      await tx.tokenGrant.update({
        where: { id: grant.id },
        data: {
          status: TokenGrantStatus.EXPIRED,
          tokensRemaining: 0,
        },
      });

      await tx.tokenWallet.update({
        where: { id: grant.walletId },
        data: {
          balance: { decrement: expiredCount },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          walletId: grant.walletId,
          amount: -expiredCount,
          type: "SPEND",
          description: `Token Package Expired: ${grant.packageName} (-${expiredCount} Tokens, 365-Day Lifespan)`,
          referenceId: grant.id,
        },
      });
    });

    totalExpired += expiredCount;
  }

  return totalExpired;
}

/**
 * Checks student's token balance after every deduction.
 * If balance hits 0 (or is less than upcoming scheduled classes), triggers in-app alert & email.
 */
export async function checkAndNotifyLowTokenBalance(studentId: string): Promise<void> {
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { tokenWallet: true },
    });

    if (!student || !student.email) return;

    // Refresh active balance (first expiring any overdue tokens)
    await expireOverdueTokenGrants(student.id);

    const activeGrants = await prisma.tokenGrant.findMany({
      where: {
        userId: student.id,
        status: TokenGrantStatus.ACTIVE,
        expiresAt: { gte: new Date() },
      },
    });

    const activeBalance = activeGrants.length > 0
      ? activeGrants.reduce((acc, g) => acc + g.tokensRemaining, 0)
      : Math.max(0, student.tokenWallet?.balance || 0);

    const enrolledCourseIds = (
      await prisma.enrollment.findMany({
        where: { userId: student.id },
        select: { courseId: true },
      })
    ).map((e) => e.courseId);

    const upcomingClassesCount = await prisma.event.count({
      where: {
        OR: [
          { userId: student.id },
          ...(enrolledCourseIds.length > 0 ? [{ courseId: { in: enrolledCourseIds } }] : []),
        ],
        status: "SCHEDULED",
        dueDate: { gte: new Date() },
      },
    });

    // Low / zero balance condition
    if (activeBalance <= 0 || activeBalance < upcomingClassesCount) {
      // 1. In-App Notification
      await prisma.notification.create({
        data: {
          userId: student.id,
          title: "⚠️ Token Balance Alert",
          message: `Update your tokens to continue your scheduled classes. (Current balance: ${activeBalance} Token${activeBalance === 1 ? "" : "s"}, Upcoming classes: ${upcomingClassesCount}).`,
          type: "WARNING",
          link: "/dashboard#tokens",
        },
      });
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: student.id });

      // 2. Email Notification
      await sendLowTokenBalanceEmail({
        email: student.email,
        name: student.name,
        currentBalance: activeBalance,
        upcomingClassesCount,
      });
    }
  } catch (err) {
    console.error("[LowBalanceAlert] Error checking student balance:", err);
  }
}

/**
 * Centralized completion trigger:
 * When a scheduled 1-hour class is marked as Done or Completed:
 * 1. Deducts exactly 1 token from student's active balance (FIFO on grants).
 * 2. Checks token balance and triggers low-balance in-app + email notification if needed.
 * 3. Reads class tier (IGCSE or IAL/IAS) and credits exact LKR equivalent (e.g. 750 or 850 LKR) to tutor's internal earnings ledger.
 */
export async function completeClassAndProcessEcosystem(
  eventId: string,
  opts?: {
    manualStartTime?: Date;
    manualEndTime?: Date;
    recordingUrl?: string;
    isNoShow?: boolean;
  }
): Promise<{
  success: boolean;
  tokenDeducted: boolean;
  earningsCredited: boolean;
  earningRecord?: any;
  message?: string;
}> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      course: true,
      user: true,
      enrollmentRequest: true,
    },
  });

  if (!event) {
    return { success: false, tokenDeducted: false, earningsCredited: false, message: "Event not found" };
  }

  const now = new Date();

  // Step 1: Update event status to COMPLETED
  await prisma.event.update({
    where: { id: event.id },
    data: {
      status: "COMPLETED",
      endedAt: opts?.manualEndTime || now,
      actualEndTime: opts?.manualEndTime || now,
      ...(opts?.manualStartTime ? { startedAt: opts.manualStartTime, actualStartTime: opts.manualStartTime } : {}),
      ...(opts?.recordingUrl ? { recordingUrl: opts.recordingUrl, recordingStatus: "AVAILABLE" } : {}),
    },
  });

  // Automatically remove live class notifications and pre-class reminders once ended
  await removeLiveClassNotifications({ eventId: event.id, title: event.title }).catch(() => {});

  // Check if this event represents a 30-Minute Free Trial session
  const isTrialSession = Boolean(
    event.title?.toLowerCase().includes("trial") ||
    event.description?.toLowerCase().includes("trial")
  );

  let linkedTrial: any = null;
  if (isTrialSession || event.description) {
    const trialIdMatch = event.description?.match(/Trial ID:\s*([a-zA-Z0-9_-]+)/i);
    const candidateTrialId = trialIdMatch ? trialIdMatch[1] : null;
    if (candidateTrialId) {
      linkedTrial = await prisma.trialRequest.findUnique({
        where: { id: candidateTrialId },
      });
    } else {
      linkedTrial = await prisma.trialRequest.findFirst({
        where: {
          OR: [
            ...(event.meetingSpaceId ? [{ meetingSpaceId: event.meetingSpaceId }] : []),
            ...(event.meetingLink ? [{ meetingLink: event.meetingLink }] : []),
            ...(event.userId ? [{ studentId: event.userId }] : []),
          ],
        },
      });
    }
  }

  // 🎯 Hard business rule:
  // 30-Minute Trial sessions are 100% free for students (0 tokens deducted).
  // Tutors receive NO payment or income for trial sessions (only paid for completed enrolled 1-hour classes).
  if (isTrialSession || linkedTrial) {
    if (linkedTrial && linkedTrial.status !== "COMPLETED") {
      await prisma.trialRequest.update({
        where: { id: linkedTrial.id },
        data: {
          status: "COMPLETED",
          actualEndTime: opts?.manualEndTime || now,
          ...(opts?.manualStartTime ? { actualStartTime: opts.manualStartTime } : {}),
          ...(opts?.recordingUrl ? { recordingUrl: opts.recordingUrl, recordingStatus: "AVAILABLE" } : {}),
        },
      });
      broadcastLMSEvent("TRIALS_CHANGED", { trialId: linkedTrial.id, completed: true });
      await removeLiveClassNotifications({ trialId: linkedTrial.id }).catch(() => {});
    }

    broadcastLMSEvent("EVENTS_CHANGED", { eventId: event.id, ended: true });
    broadcastLMSEvent("USERS_CHANGED");

    return {
      success: true,
      tokenDeducted: false,
      earningsCredited: false,
      message: "30-Minute Free Trial concluded. No tokens deducted and no tutor payment credited (trials are free).",
    };
  }

  // If tokens already deducted for this event, do not double-deduct
  if (event.tokenDeducted) {
    return {
      success: true,
      tokenDeducted: false,
      earningsCredited: false,
      message: "Event already completed and tokens previously processed.",
    };
  }

  // Identify Student
  let studentId = event.userId;
  if (!studentId && event.courseId) {
    const firstEnr = await prisma.enrollment.findFirst({
      where: { courseId: event.courseId },
      select: { userId: true },
    });
    studentId = firstEnr?.userId || null;
  }

  // Identify Tutor
  let tutorId = event.course?.tutorId || event.requestedBy;
  if (!tutorId && event.courseId) {
    const c = await prisma.course.findUnique({
      where: { id: event.courseId },
      select: { tutorId: true },
    });
    tutorId = c?.tutorId || null;
  }

  let tokenDeducted = false;
  let earningRecord: any = null;

  // Determine duration in hours (e.g. 1 hour or 2-hour merged class)
  const durationHours = getEventDurationHours(event.title, event.description);
  const tokensToDeduct = Math.max(1, Math.round(durationHours));

  // Step 2: Automatic Token Deduction (1 Token = 1 Hour)
  if (studentId) {
    await expireOverdueTokenGrants(studentId);

    let wallet = await prisma.tokenWallet.findUnique({
      where: { userId: studentId },
    });

    if (!wallet) {
      wallet = await prisma.tokenWallet.create({
        data: { userId: studentId, balance: 0 },
      });
    }

    // Find earliest unexpired active grants
    const activeGrants = await prisma.tokenGrant.findMany({
      where: {
        userId: studentId,
        status: TokenGrantStatus.ACTIVE,
        expiresAt: { gte: now },
        tokensRemaining: { gt: 0 },
      },
      orderBy: { expiresAt: "asc" },
    });

    let remainingToDeduct = tokensToDeduct;
    for (const grant of activeGrants) {
      if (remainingToDeduct <= 0) break;
      const deductFromThis = Math.min(grant.tokensRemaining, remainingToDeduct);
      const newRemaining = grant.tokensRemaining - deductFromThis;
      await prisma.tokenGrant.update({
        where: { id: grant.id },
        data: {
          tokensRemaining: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? TokenGrantStatus.EXHAUSTED : TokenGrantStatus.ACTIVE,
        },
      });
      remainingToDeduct -= deductFromThis;
    }

    // Decrement wallet balance
    await prisma.tokenWallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: tokensToDeduct },
      },
    });

    const txDesc = opts?.isNoShow
      ? `Student No-Show Policy (-${tokensToDeduct} Token${tokensToDeduct > 1 ? "s" : ""}): ${event.title}`
      : `Completed ${durationHours}-Hour Class: ${event.title} (-${tokensToDeduct} Token${tokensToDeduct > 1 ? "s" : ""})`;

    await prisma.tokenTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -tokensToDeduct,
        type: "SPEND",
        description: txDesc,
        referenceId: event.id,
      },
    });

    tokenDeducted = true;

    // Check balance & trigger low-balance notification if needed
    await checkAndNotifyLowTokenBalance(studentId);
  }

  // Step 3: Tutor Earnings & Pay Grade Conversion
  if (tutorId) {
    const payGrades = await getPayGradeSettings();
    const { tier, label: tierLabel } = determineClassTier(event.course, (event.user as any)?.academicLevel);
    const hourlyRate = tier === "IGCSE" ? payGrades.igcseRateLkr : payGrades.ialRateLkr;
    const amountLkr = hourlyRate * durationHours;

    // Calendar month key (e.g. "2026-10")
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;

    const earningDesc = opts?.isNoShow
      ? `Student No-Show Policy (Tutor waited 15+ mins): ${event.title} (${tierLabel})`
      : `Completed ${durationHours}-Hour Class: ${event.title} (${tierLabel})`;

    earningRecord = await prisma.tutorEarningRecord.create({
      data: {
        tutorId,
        eventId: event.id,
        courseId: event.courseId,
        studentId: studentId,
        tier,
        amountLkr,
        tokenCount: durationHours,
        description: earningDesc,
        monthKey,
        year,
        month,
      },
    });

    // Notify tutor of credited earnings
    const notifMsg = opts?.isNoShow
      ? `Rs. ${amountLkr.toLocaleString("en-LK")} LKR credited for student no-show after completing mandatory 15-minute wait: "${event.title}" (${tierLabel} @ Rs. ${hourlyRate}/hr).`
      : `Rs. ${amountLkr.toLocaleString("en-LK")} LKR credited to your monthly earnings ledger for completed ${durationHours}-hour session: "${event.title}" (${tierLabel} @ Rs. ${hourlyRate}/hr).`;

    await prisma.notification.create({
      data: {
        userId: tutorId,
        title: "💰 Class Earnings Credited",
        message: notifMsg,
        type: "SUCCESS",
        link: "/tutor?tab=history",
      },
    });

    broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: tutorId });
  }

  // Mark event as token deducted
  await prisma.event.update({
    where: { id: event.id },
    data: {
      tokenDeducted: true,
      tokenDeductedAt: now,
    },
  });

  broadcastLMSEvent("EVENTS_CHANGED", { eventId: event.id, ended: true });
  broadcastLMSEvent("USERS_CHANGED");

  return {
    success: true,
    tokenDeducted,
    earningsCredited: Boolean(earningRecord),
    earningRecord,
    message: `Class marked as Completed. ${tokensToDeduct} token${tokensToDeduct > 1 ? "s" : ""} deducted from student and Rs. ${earningRecord?.amountLkr || 0} LKR credited to tutor.`,
  };
}

/**
 * Returns monthly earnings data for a tutor.
 * Automatically respects the calendar month cycle (1st of month to final day of month)
 * and generates archives for completed previous months.
 */
export async function getTutorMonthlyEarnings(tutorId: string): Promise<{
  currentMonth: {
    monthKey: string;
    monthLabel: string;
    totalAmountLkr: number;
    totalHours: number;
    igcseHours: number;
    igcseEarningsLkr: number;
    ialHours: number;
    ialEarningsLkr: number;
    bonus: ReturnType<typeof calculateTutorMonthlyBonus>;
    totalEstimatedPayoutLkr: number;
    records: any[];
  };
  archivedMonths: any[];
}> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthLabel = `${monthNames[currentMonthNum - 1]} ${currentYear}`;

  const paySettings = await getPayGradeSettings();

  // Current month records
  const currentRecords = await prisma.tutorEarningRecord.findMany({
    where: {
      tutorId,
      monthKey: currentMonthKey,
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, subjectCode: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Enrolled 1-hour classes only (filter out any trial sessions from billable earnings)
  const billableRecords = currentRecords.filter(
    (r) => !r.description?.toLowerCase().includes("trial")
  );

  const igcseRecords = billableRecords.filter((r) => r.tier === "IGCSE");
  const ialRecords = billableRecords.filter((r) => r.tier !== "IGCSE");

  const igcseHours = igcseRecords.reduce((acc, r) => acc + r.tokenCount, 0);
  const igcseEarningsLkr = igcseRecords.reduce((acc, r) => acc + r.amountLkr, 0);

  const ialHours = ialRecords.reduce((acc, r) => acc + r.tokenCount, 0);
  const ialEarningsLkr = ialRecords.reduce((acc, r) => acc + r.amountLkr, 0);

  const totalAmountLkr = igcseEarningsLkr + ialEarningsLkr;
  const totalHours = igcseHours + ialHours;

  // Calculate monthly bonus (non-stacking, highest achieved tier)
  const bonus = calculateTutorMonthlyBonus(totalHours, paySettings);

  // Archive previous months if not already archived
  const pastMonthRecords = await prisma.tutorEarningRecord.findMany({
    where: {
      tutorId,
      monthKey: { not: currentMonthKey },
    },
    select: { monthKey: true, amountLkr: true, tokenCount: true, tier: true, description: true },
  });

  const billablePastMonthRecords = pastMonthRecords.filter(
    (r) => !r.description?.toLowerCase().includes("trial")
  );

  const pastMonthsMap = new Map<string, { totalAmount: number; totalHours: number; igcseHours: number; ialHours: number }>();
  for (const r of billablePastMonthRecords) {
    const cur = pastMonthsMap.get(r.monthKey) || { totalAmount: 0, totalHours: 0, igcseHours: 0, ialHours: 0 };
    cur.totalAmount += r.amountLkr;
    cur.totalHours += r.tokenCount;
    if (r.tier === "IGCSE") cur.igcseHours += r.tokenCount;
    else cur.ialHours += r.tokenCount;
    pastMonthsMap.set(r.monthKey, cur);
  }

  for (const [mKey, stats] of pastMonthsMap.entries()) {
    const pastBonus = calculateTutorMonthlyBonus(stats.totalHours, paySettings);
    await prisma.tutorMonthlyPayoutArchive.upsert({
      where: {
        tutorId_monthKey: {
          tutorId,
          monthKey: mKey,
        },
      },
      create: {
        tutorId,
        monthKey: mKey,
        totalAmountLkr: stats.totalAmount,
        totalHours: stats.totalHours,
        igcseHours: stats.igcseHours,
        ialHours: stats.ialHours,
        bonusAmountLkr: pastBonus.unlockedBonusLkr,
        bonusTier: pastBonus.currentTier,
        status: "PAYABLE",
      },
      update: {
        totalAmountLkr: stats.totalAmount,
        totalHours: stats.totalHours,
        igcseHours: stats.igcseHours,
        ialHours: stats.ialHours,
        bonusAmountLkr: pastBonus.unlockedBonusLkr,
        bonusTier: pastBonus.currentTier,
      },
    });
  }

  const archivedMonths = await prisma.tutorMonthlyPayoutArchive.findMany({
    where: { tutorId },
    orderBy: { monthKey: "desc" },
  });

  return {
    currentMonth: {
      monthKey: currentMonthKey,
      monthLabel: currentMonthLabel,
      totalAmountLkr,
      totalHours,
      igcseHours,
      igcseEarningsLkr,
      ialHours,
      ialEarningsLkr,
      bonus,
      totalEstimatedPayoutLkr: totalAmountLkr + bonus.unlockedBonusLkr,
      records: currentRecords,
    },
    archivedMonths,
  };
}

/**
 * Returns comprehensive overview of tutor payouts & performance bonuses for Admin Portal.
 * Columns: Tutor Name, Subject Tier, Hourly Pay Grade, Total Hours This Month, Current Unlocked Bonus.
 */
export async function getAdminTutorPayoutOverview(): Promise<{
  monthKey: string;
  monthLabel: string;
  payGrades: PayGradeAndBonusSettings;
  tutors: Array<{
    id: string;
    name: string;
    email: string;
    tutorId?: string | null;
    subjectTier: "IGCSE" | "IAL_IAS" | "Both (IGCSE & IAL/IAS)";
    hourlyPayGrade: string;
    hourlyRateLkr: number;
    totalHoursThisMonth: number;
    igcseHours: number;
    ialHours: number;
    baseEarningsLkr: number;
    unlockedBonusLkr: number;
    bonusTierName: string | null;
    totalEstimatedPayoutLkr: number;
    nextTierHoursRemaining: number;
    progressPercent: number;
  }>;
}> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthLabel = `${monthNames[currentMonthNum - 1]} ${currentYear}`;

  const paySettings = await getPayGradeSettings();

  // Find all tutors
  const tutors = await prisma.user.findMany({
    where: {
      role: { in: ["TUTOR", "INSTRUCTOR"] as any },
    },
    include: {
      createdCourses: {
        select: { id: true, title: true, category: true, subjectCode: true, level: true },
      },
      tutorEarnings: {
        where: { monthKey: currentMonthKey },
        select: { amountLkr: true, tokenCount: true, tier: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = tutors.map((t) => {
    // Determine subject tier based on taught courses
    let hasIgcse = false;
    let hasIal = false;

    if (t.createdCourses && t.createdCourses.length > 0) {
      for (const c of t.createdCourses) {
        const { tier } = determineClassTier(c);
        if (tier === "IAL_IAS") hasIal = true;
        else hasIgcse = true;
      }
    } else {
      // Default to IGCSE if no courses yet
      hasIgcse = true;
    }

    let subjectTier: "IGCSE" | "IAL_IAS" | "Both (IGCSE & IAL/IAS)" = "IGCSE";
    let hourlyPayGrade = `Rs. ${paySettings.igcseRateLkr} / hr`;
    let primaryRate = paySettings.igcseRateLkr;

    if (hasIal && hasIgcse) {
      subjectTier = "Both (IGCSE & IAL/IAS)";
      hourlyPayGrade = `Rs. ${paySettings.igcseRateLkr} (O/L) • Rs. ${paySettings.ialRateLkr} (A/L)`;
      primaryRate = paySettings.ialRateLkr;
    } else if (hasIal) {
      subjectTier = "IAL_IAS";
      hourlyPayGrade = `Rs. ${paySettings.ialRateLkr} / hr`;
      primaryRate = paySettings.ialRateLkr;
    }

    const earningsRecords = (t.tutorEarnings || []).filter(
      (r: any) => !r.description?.toLowerCase().includes("trial")
    );
    const igcseHours = earningsRecords
      .filter((r: { tier: string }) => r.tier === "IGCSE")
      .reduce((sum: number, r: { tokenCount: number }) => sum + r.tokenCount, 0);
    const ialHours = earningsRecords
      .filter((r: { tier: string }) => r.tier !== "IGCSE")
      .reduce((sum: number, r: { tokenCount: number }) => sum + r.tokenCount, 0);
    const totalHoursThisMonth = igcseHours + ialHours;
    const baseEarningsLkr = earningsRecords.reduce((sum: number, r: { amountLkr: number }) => sum + r.amountLkr, 0);

    const bonus = calculateTutorMonthlyBonus(totalHoursThisMonth, paySettings);

    return {
      id: t.id,
      name: t.name,
      email: t.email,
      tutorId: t.tutorId,
      subjectTier,
      hourlyPayGrade,
      hourlyRateLkr: primaryRate,
      totalHoursThisMonth,
      igcseHours,
      ialHours,
      baseEarningsLkr,
      unlockedBonusLkr: bonus.unlockedBonusLkr,
      bonusTierName: bonus.currentTier,
      totalEstimatedPayoutLkr: baseEarningsLkr + bonus.unlockedBonusLkr,
      nextTierHoursRemaining: bonus.hoursToNextTier,
      progressPercent: bonus.progressPercent,
    };
  });

  return {
    monthKey: currentMonthKey,
    monthLabel: currentMonthLabel,
    payGrades: paySettings,
    tutors: rows,
  };
}
