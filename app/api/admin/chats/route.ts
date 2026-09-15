import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { broadcastLMSEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, [Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    // Fetch messages for a specific conversation
    if (conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participantA: {
            select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
          },
          participantB: {
            select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      const messages = await prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          receiver: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 300,
      });

      return NextResponse.json({
        conversation,
        messages,
      });
    }

    // Otherwise, fetch all conversations with summary stats
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    const [allConversations, totalMessagesCount] = await Promise.all([
      prisma.conversation.findMany({
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
            select: {
              id: true,
              senderId: true,
              receiverId: true,
              encryptedContent: true,
              iv: true,
              createdAt: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      }),
      prisma.message.count(),
    ]);

    // Apply search filter in memory for participant names / emails
    let filteredConversations = allConversations;
    if (search) {
      filteredConversations = allConversations.filter((c) => {
        const nameA = c.participantA?.name?.toLowerCase() || "";
        const emailA = c.participantA?.email?.toLowerCase() || "";
        const nameB = c.participantB?.name?.toLowerCase() || "";
        const emailB = c.participantB?.email?.toLowerCase() || "";
        return (
          nameA.includes(search) ||
          emailA.includes(search) ||
          nameB.includes(search) ||
          emailB.includes(search)
        );
      });
    }

    return NextResponse.json({
      conversations: filteredConversations,
      stats: {
        totalConversations: allConversations.length,
        totalMessages: totalMessagesCount,
      },
    });
  } catch (error: any) {
    console.error("Admin chats GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req, [Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const messageId = searchParams.get("messageId");

    if (messageId) {
      await prisma.message.delete({
        where: { id: messageId },
      });
      broadcastLMSEvent("CHAT_MESSAGE");
      return NextResponse.json({ success: true, message: "Message deleted successfully." });
    }

    if (conversationId) {
      await prisma.$transaction(async (tx) => {
        await tx.message.deleteMany({ where: { conversationId } });
        await tx.conversation.delete({ where: { id: conversationId } });
      });
      broadcastLMSEvent("CHAT_MESSAGE");
      return NextResponse.json({ success: true, message: "Conversation deleted successfully." });
    }

    return NextResponse.json(
      { error: "Provide either conversationId or messageId to delete." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Admin chats DELETE error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete chat record" },
      { status: 500 }
    );
  }
}
