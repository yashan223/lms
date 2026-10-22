import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";

/**
 * Automatically removes active/stale live class notifications and pre-class reminders
 * once a class session or trial consultation has ended or been completed.
 */
export async function removeLiveClassNotifications(opts: {
  eventId?: string | null;
  trialId?: string | null;
  title?: string | null;
}): Promise<void> {
  try {
    const orConditions: any[] = [];

    if (opts.eventId) {
      orConditions.push({ link: { contains: opts.eventId } });
    }

    if (opts.trialId) {
      orConditions.push({ link: { contains: opts.trialId } });
    }

    if (opts.title && opts.title.trim().length > 2) {
      orConditions.push({ message: { contains: opts.title.trim() } });
    }

    if (orConditions.length === 0) return;

    // Safety constraint: only match transient live notifications or pre-session reminders,
    // never permanent business records (such as earnings credits, recording links, receipts, or audit logs)
    const targetWhere = {
      AND: [
        {
          OR: [
            { type: "CLASS_LIVE" },
            { title: { contains: "Live Now" } },
            { title: { contains: "Starting in 30 Minutes" } },
            { title: { contains: "Upcoming Class in 30 Minutes" } },
          ],
        },
        {
          OR: orConditions,
        },
      ],
    };

    const matched = await prisma.notification.findMany({
      where: targetWhere,
      select: { id: true, userId: true },
    });

    if (matched.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: matched.map((m) => m.id) } },
      });

      const uniqueUserIds = Array.from(new Set(matched.map((m) => m.userId)));
      uniqueUserIds.forEach((userId) => {
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId });
      });
    }
  } catch (err) {
    console.warn("[removeLiveClassNotifications] Notice:", err);
  }
}
