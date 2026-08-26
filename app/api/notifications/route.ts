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
