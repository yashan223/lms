import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

async function getAuthUser(request: NextRequest) {
  const emailCookie = request.cookies.get("edupulse_user_email")?.value;
  if (emailCookie) {
    const user = await prisma.user.findUnique({
      where: { email: emailCookie.toLowerCase() },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });
    if (user) return user;
  }
  return await prisma.user.findFirst({
    select: { id: true, name: true, email: true, role: true, avatar: true },
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = user.id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "conversations";

    // 1. Fetch all conversations for current user
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

      // Calculate unread count per conversation
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

    // 2. Fetch messages for a specific conversation
    if (action === "messages") {
      const conversationId = searchParams.get("conversationId");
      if (!conversationId) {
        return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
      }

      // Verify user is participant
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

      // Mark unread messages sent to this user as read
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

    // 3. Fetch potential chat contacts (Tutors, Enrolled Students, Peers)
    if (action === "contacts") {
      const userRole = user.role;
      let contacts: any[] = [];

      if (userRole === "STUDENT") {
        // Find instructors of student's enrolled courses + all instructors
        const tutors = await prisma.user.findMany({
          where: {
            role: "INSTRUCTOR",
            id: { not: currentUserId },
          },
          select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
        });
        contacts = tutors;
      } else if (userRole === "INSTRUCTOR") {
        // Find students enrolled in tutor's courses
        const enrollments = await prisma.enrollment.findMany({
          where: {
            course: { instructorId: currentUserId },
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
            },
          },
        });

        const uniqueStudentsMap = new Map();
        enrollments.forEach((e) => {
          if (e.user && !uniqueStudentsMap.has(e.user.id)) {
            uniqueStudentsMap.set(e.user.id, e.user);
          }
        });

        // Also add other faculty tutors
        const peers = await prisma.user.findMany({
          where: {
            role: "INSTRUCTOR",
            id: { not: currentUserId },
          },
          select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
        });

        contacts = [...Array.from(uniqueStudentsMap.values()), ...peers];
      } else {
        // Admin can chat with anyone
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
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = user.id;
    const currentUserName = user.name || "Academic Contact";
    const body = await req.json();
    const { action } = body;

    // A. Start or retrieve a 1-on-1 Conversation
    if (action === "get_or_create_conversation") {
      const { recipientId, courseId } = body;
      if (!recipientId || recipientId === currentUserId) {
        return NextResponse.json({ error: "Invalid recipient ID" }, { status: 400 });
      }

      // Check existing conversation in either orientation
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

    // B. Send an End-to-End Encrypted Message
    if (action === "send_message") {
      const { conversationId, receiverId, encryptedContent, iv, senderPublicKey } = body;

      if (!conversationId || !receiverId || !encryptedContent || !iv) {
        return NextResponse.json(
          { error: "Missing required ciphertext or initialization vector parameters" },
          { status: 400 }
        );
      }

      // Verify conversation and participation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      if (conversation.participantAId !== currentUserId && conversation.participantBId !== currentUserId) {
        return NextResponse.json({ error: "Unauthorized conversation access" }, { status: 403 });
      }

      // Store zero-knowledge ciphertext and IV
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

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      // Create in-app Notification for receiver
      await prisma.notification.create({
        data: {
          userId: receiverId,
          title: `New Encrypted Message from ${currentUserName}`,
          message: "You have a new end-to-end encrypted message in your academic chat.",
          type: "CHAT_MESSAGE",
          link: "/dashboard",
        },
      });

      // Broadcast Real-time sync events
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
