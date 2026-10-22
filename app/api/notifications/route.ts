import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const userId = auth.user.id;

    // Auto-reconcile: If all chat messages for this user are already read, mark any stale CHAT_MESSAGE notifications as read
    const unreadMessagesCount = await prisma.message.count({
      where: { receiverId: userId, isRead: false },
    }).catch(() => 0);

    if (unreadMessagesCount === 0) {
      await prisma.notification.updateMany({
        where: { userId, type: "CHAT_MESSAGE", isRead: false },
        data: { isRead: true },
      }).catch(() => {});
    }

    // Auto-remove any stale "Live Now" or pre-class reminder notifications if the class is completed or ended
    const liveNotifications = await prisma.notification.findMany({
      where: {
        userId,
        OR: [
          { type: "CLASS_LIVE" },
          { title: { contains: "Live Now" } },
          { title: { contains: "Starting in 30 Minutes" } },
          { title: { contains: "Upcoming Class in 30 Minutes" } },
        ],
      },
    });

    if (liveNotifications.length > 0) {
      const staleIds: string[] = [];
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

      for (const notif of liveNotifications) {
        let eventId: string | null = null;
        let trialId: string | null = null;

        if (notif.link) {
          const evMatch = notif.link.match(/[?&]eventId=([^&]+)/);
          if (evMatch) eventId = evMatch[1];
          const trMatch = notif.link.match(/[?&]trialId=([^&]+)/);
          if (trMatch) trialId = trMatch[1];
        }

        if (eventId) {
          const ev = await prisma.event.findUnique({
            where: { id: eventId },
            select: { status: true, endedAt: true },
          });
          if (!ev || ev.status === "COMPLETED" || ev.status === "CANCELLED" || ev.endedAt) {
            staleIds.push(notif.id);
          }
        } else if (trialId) {
          const tr = await prisma.trialRequest.findUnique({
            where: { id: trialId },
            select: { status: true, actualEndTime: true },
          });
          if (!tr || tr.status === "COMPLETED" || tr.status === "REJECTED" || tr.status === "CANCELLED" || tr.actualEndTime) {
            staleIds.push(notif.id);
          }
        } else if (new Date(notif.createdAt) < threeHoursAgo) {
          staleIds.push(notif.id);
        }
      }

      if (staleIds.length > 0) {
        await prisma.notification.deleteMany({
          where: { id: { in: staleIds } },
        }).catch(() => {});
      }
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const userId = auth.user.id;
    const body = await req.json();
    const { action, notificationId } = body;

    if (action === "mark_as_read" && notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
      });
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId });
      return NextResponse.json({ success: true });
    }

    if (action === "mark_all_read") {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId });
      return NextResponse.json({ success: true });
    }

    if (action === "clear_read") {
      await prisma.notification.deleteMany({
        where: { userId, isRead: true },
      });
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const { recipientId, title, message, type, link } = body;

    if (!recipientId || !title || !message) {
      return NextResponse.json(
        { error: "Missing required notification fields" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId: recipientId,
        title,
        message,
        type: type || "INFO",
        link: link || null,
      },
    });

    broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: recipientId });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
