import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { sendLowTokenBalanceEmail } from "@/lib/email";
import { TokenGrantStatus } from "@prisma/client";

export const DEFAULT_PAY_GRADES = {
  IGCSE: 750, // LKR per hour / token
  IAL_IAS: 850, // LKR per hour / token
};

/**
 * Returns current Admin Pay Grade rates from the DB or defaults.
 */
export async function getPayGradeSettings(): Promise<{ igcseRateLkr: number; ialRateLkr: number }> {
  try {
    const setting = await prisma.payGradeSetting.findUnique({
      where: { id: "default_pay_grades" },
    });
    if (setting) {
      return {
        igcseRateLkr: setting.igcseRateLkr,
        ialRateLkr: setting.ialRateLkr,
      };
    }
  } catch (err) {
    console.warn("[PayGrades] Error fetching pay grade settings, using defaults:", err);
  }

  return {
    igcseRateLkr: DEFAULT_PAY_GRADES.IGCSE,
    ialRateLkr: DEFAULT_PAY_GRADES.IAL_IAS,
  };
}

/**
 * Updates Admin Pay Grade rates in the database.
 */
export async function updatePayGradeSettings(rates: {
  igcseRateLkr?: number;
  ialRateLkr?: number;
}): Promise<{ igcseRateLkr: number; ialRateLkr: number }> {
  const current = await getPayGradeSettings();
  const updated = await prisma.payGradeSetting.upsert({
    where: { id: "default_pay_grades" },
    create: {
      id: "default_pay_grades",
      igcseRateLkr: rates.igcseRateLkr ?? current.igcseRateLkr,
      ialRateLkr: rates.ialRateLkr ?? current.ialRateLkr,
    },
    update: {
      ...(rates.igcseRateLkr !== undefined ? { igcseRateLkr: rates.igcseRateLkr } : {}),
      ...(rates.ialRateLkr !== undefined ? { ialRateLkr: rates.ialRateLkr } : {}),
    },
  });

  return {
    igcseRateLkr: updated.igcseRateLkr,
    ialRateLkr: updated.ialRateLkr,
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

    // Find earliest unexpired active grant
    const activeGrants = await prisma.tokenGrant.findMany({
      where: {
        userId: studentId,
        status: TokenGrantStatus.ACTIVE,
        expiresAt: { gte: now },
        tokensRemaining: { gt: 0 },
      },
      orderBy: { expiresAt: "asc" },
    });

    if (activeGrants.length > 0) {
      const grant = activeGrants[0];
      const newRemaining = grant.tokensRemaining - 1;
      await prisma.tokenGrant.update({
        where: { id: grant.id },
        data: {
          tokensRemaining: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? TokenGrantStatus.EXHAUSTED : TokenGrantStatus.ACTIVE,
        },
      });
    }

    // Decrement wallet balance
    await prisma.tokenWallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: 1 },
      },
    });

    await prisma.tokenTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -1,
        type: "SPEND",
        description: `Completed 1-Hour Class: ${event.title} (-1 Token)`,
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
    const amountLkr = tier === "IGCSE" ? payGrades.igcseRateLkr : payGrades.ialRateLkr;

    // Calendar month key (e.g. "2026-10")
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;

    earningRecord = await prisma.tutorEarningRecord.create({
      data: {
        tutorId,
        eventId: event.id,
        courseId: event.courseId,
        studentId: studentId,
        tier,
        amountLkr,
        tokenCount: 1,
        description: `Completed 1-Hour Class: ${event.title} (${tierLabel})`,
        monthKey,
        year,
        month,
      },
    });

    // Notify tutor of credited earnings
    await prisma.notification.create({
      data: {
        userId: tutorId,
        title: "💰 Class Earnings Credited",
        message: `Rs. ${amountLkr.toLocaleString("en-LK")} LKR credited to your monthly earnings ledger for completed 1-hour session: "${event.title}" (${tierLabel}).`,
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
    message: "Class marked as Completed. 1 token deducted from student and earnings credited to tutor.",
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

  const igcseRecords = currentRecords.filter((r) => r.tier === "IGCSE");
  const ialRecords = currentRecords.filter((r) => r.tier !== "IGCSE");

  const igcseHours = igcseRecords.reduce((acc, r) => acc + r.tokenCount, 0);
  const igcseEarningsLkr = igcseRecords.reduce((acc, r) => acc + r.amountLkr, 0);

  const ialHours = ialRecords.reduce((acc, r) => acc + r.tokenCount, 0);
  const ialEarningsLkr = ialRecords.reduce((acc, r) => acc + r.amountLkr, 0);

  const totalAmountLkr = igcseEarningsLkr + ialEarningsLkr;
  const totalHours = igcseHours + ialHours;

  // Archive previous months if not already archived
  const pastMonthRecords = await prisma.tutorEarningRecord.findMany({
    where: {
      tutorId,
      monthKey: { not: currentMonthKey },
    },
    select: { monthKey: true, amountLkr: true, tokenCount: true, tier: true },
  });

  const pastMonthsMap = new Map<string, { totalAmount: number; totalHours: number; igcseHours: number; ialHours: number }>();
  for (const r of pastMonthRecords) {
    const cur = pastMonthsMap.get(r.monthKey) || { totalAmount: 0, totalHours: 0, igcseHours: 0, ialHours: 0 };
    cur.totalAmount += r.amountLkr;
    cur.totalHours += r.tokenCount;
    if (r.tier === "IGCSE") cur.igcseHours += r.tokenCount;
    else cur.ialHours += r.tokenCount;
    pastMonthsMap.set(r.monthKey, cur);
  }

  for (const [mKey, stats] of pastMonthsMap.entries()) {
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
        status: "PAYABLE",
      },
      update: {
        totalAmountLkr: stats.totalAmount,
        totalHours: stats.totalHours,
        igcseHours: stats.igcseHours,
        ialHours: stats.ialHours,
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
      records: currentRecords,
    },
    archivedMonths,
  };
}
