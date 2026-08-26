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

    const user = auth.user;
    const currentUserId = user.id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "conversations";

    if (action === "conversations") {
      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [
            { participantAId: currentUserId },
            { participantBId: currentUserId },
          ],
        },
        include: {
          participantA: {
            select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
          },
          participantB: {
            select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: "desc" },
      });

      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const otherUser = conv.participantAId === currentUserId ? conv.participantB : conv.participantA;
          const unreadCount = await prisma.message.count({
            where: {
              conversationId: conv.id,
              receiverId: currentUserId,
              isRead: false,
            },
          });

          return {
            id: conv.id,
            otherUser,
            lastMessage: conv.messages[0] || null,
            lastMessageAt: conv.lastMessageAt,
            unreadCount,
            createdAt: conv.createdAt,
          };
        })
      );

      return NextResponse.json({ conversations: enrichedConversations });
    }

    if (action === "messages") {
      const conversationId = searchParams.get("conversationId");
      if (!conversationId) {
        return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participantA: { select: { id: true, name: true, avatar: true } },
          participantB: { select: { id: true, name: true, avatar: true } },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      if (conversation.participantAId !== currentUserId && conversation.participantBId !== currentUserId) {
        return NextResponse.json({ error: "Forbidden access to conversation" }, { status: 403 });
      }

      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        take: 150,
      });

      await prisma.message.updateMany({
        where: {
          conversationId,
          receiverId: currentUserId,
          isRead: false,
        },
        data: { isRead: true },
      });

      const otherUser = conversation.participantAId === currentUserId ? conversation.participantB : conversation.participantA;

      return NextResponse.json({
        conversation: {
          id: conversation.id,
          otherUser,
        },
        messages,
      });
    }

    if (action === "contacts") {
      const userRole = user.role;
      let contacts: any[] = [];

      if (userRole === "STUDENT") {
        const tutors = await prisma.user.findMany({
          where: {
            role: "INSTRUCTOR",
            id: { not: currentUserId },
          },
          select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
        });
        contacts = tutors;
      } else if (userRole === "INSTRUCTOR") {
        const enrollments = await prisma.enrollment.findMany({
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
            },
          },
        });

        const uniqueStudentsMap = new Map();
        enrollments.forEach((e) => {
          if (e.user && e.user.id !== currentUserId && !uniqueStudentsMap.has(e.user.id)) {
            uniqueStudentsMap.set(e.user.id, e.user);
          }
        });

        const allStudents = await prisma.user.findMany({
          where: {
            role: "STUDENT",
            id: { not: currentUserId },
          },
          select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
          take: 50,
        });
        allStudents.forEach((st) => {
          if (!uniqueStudentsMap.has(st.id)) {
            uniqueStudentsMap.set(st.id, st);
          }
        });

        const peers = await prisma.user.findMany({
          where: {
            role: "INSTRUCTOR",
            id: { not: currentUserId },
          },
          select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
        });

        contacts = [...Array.from(uniqueStudentsMap.values()), ...peers];
      } else {
        contacts = await prisma.user.findMany({
          where: { id: { not: currentUserId } },
          select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
          take: 50,
        });
      }

      return NextResponse.json({ contacts });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Chat GET error:", error);
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const user = auth.user;
    const currentUserId = user.id;
    const currentUserName = user.name || "Academic Contact";
    const body = await req.json();
    const { action } = body;

    if (action === "get_or_create_conversation") {
      const { recipientId, courseId } = body;
      if (!recipientId || recipientId === currentUserId) {
        return NextResponse.json({ error: "Invalid recipient ID" }, { status: 400 });
      }

      let conversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            { participantAId: currentUserId, participantBId: recipientId },
            { participantAId: recipientId, participantBId: currentUserId },
          ],
        },
        include: {
          participantA: { select: { id: true, name: true, email: true, role: true, avatar: true, headline: true } },
          participantB: { select: { id: true, name: true, email: true, role: true, avatar: true, headline: true } },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            participantAId: currentUserId,
            participantBId: recipientId,
            courseId: courseId || null,
          },
          include: {
            participantA: { select: { id: true, name: true, email: true, role: true, avatar: true, headline: true } },
            participantB: { select: { id: true, name: true, email: true, role: true, avatar: true, headline: true } },
          },
        });
      }

      const otherUser = conversation.participantAId === currentUserId ? conversation.participantB : conversation.participantA;

      return NextResponse.json({
        success: true,
        conversation: {
          id: conversation.id,
          otherUser,
          createdAt: conversation.createdAt,
        },
      });
    }

    if (action === "send_message") {
      const { conversationId, receiverId, encryptedContent, iv, senderPublicKey } = body;

      if (!conversationId || !receiverId || !encryptedContent || !iv) {
        return NextResponse.json(
          { error: "Missing required ciphertext or initialization vector parameters" },
          { status: 400 }
        );
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      if (conversation.participantAId !== currentUserId && conversation.participantBId !== currentUserId) {
        return NextResponse.json({ error: "Unauthorized conversation access" }, { status: 403 });
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: currentUserId,
          receiverId,
          encryptedContent,
          iv,
          senderPublicKey: senderPublicKey || null,
          isRead: false,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      const receiverUser = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { role: true },
      });
      const receiverLink = receiverUser?.role === "ADMIN" ? "/admin" : receiverUser?.role === "INSTRUCTOR" ? "/tutor" : "/dashboard";

      await prisma.notification.create({
        data: {
          userId: receiverId,
          title: `New Message from ${currentUserName}`,
          message: "You have a new message in your academic chat.",
          type: "CHAT_MESSAGE",
          link: receiverLink,
        },
      });

      broadcastLMSEvent("CHAT_MESSAGE", {
        conversationId,
        senderId: currentUserId,
        receiverId,
        messageId: message.id,
      });

      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: receiverId });

      return NextResponse.json({ success: true, message });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Chat POST error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
