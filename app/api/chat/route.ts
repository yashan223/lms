import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role, TrialStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Checks whether userA and userB are permitted to communicate via direct message.
 * Rule: Students and tutors can only message if the student has requested a 1-on-1 trial
 * with the tutor OR has enrolled in / purchased a course taught by the tutor.
 * Admin users are permitted full communication oversight.
 */
async function canUsersChat(
  userA: { id: string; role: Role | string; email?: string | null },
  userB: { id: string; role: Role | string; email?: string | null }
): Promise<boolean> {
  if (userA.id === userB.id) return false;
  if (userA.role === Role.ADMIN || userB.role === Role.ADMIN) return true;

  const isAStudent = userA.role === Role.STUDENT;
  const isBStudent = userB.role === Role.STUDENT;
  const isATutor = userA.role === Role.TUTOR || (userA.role as any) === "INSTRUCTOR";
  const isBTutor = userB.role === Role.TUTOR || (userB.role as any) === "INSTRUCTOR";

  // Messaging is only permitted between a student and a tutor/instructor
  if (!((isAStudent && isBTutor) || (isBStudent && isATutor))) {
    return false;
  }

  const student = isAStudent ? userA : userB;
  const tutor = isATutor ? userA : userB;

  // 1. Check if the student has purchased / enrolled in any course taught by this tutor
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: student.id,
      course: {
        tutorId: tutor.id,
      },
    },
    select: { id: true },
  });

  if (enrollment) {
    return true;
  }

  // 2. Check if the student has requested a 1-on-1 trial with this tutor (direct or course-linked)
  const studentOrConditions: any[] = [{ studentId: student.id }];
  if (student.email) {
    const sEmail = student.email.trim();
    studentOrConditions.push({ studentEmail: { in: [sEmail.toLowerCase(), sEmail] } });
  }

  const trial = await prisma.trialRequest.findFirst({
    where: {
      OR: studentOrConditions,
      AND: [
        {
          OR: [
            { tutorId: tutor.id },
            { course: { tutorId: tutor.id } },
          ],
        },
      ],
      status: { not: TrialStatus.REJECTED },
    },
    select: { id: true },
  });

  if (trial) {
    return true;
  }

  return false;
}

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

      // Filter conversations: only keep those where participants are authorized to chat
      const authorizedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const otherUser = conv.participantAId === currentUserId ? conv.participantB : conv.participantA;
          if (user.role === Role.ADMIN || otherUser.role === Role.ADMIN) {
            return conv;
          }
          const canChat = await canUsersChat(user, otherUser);
          return canChat ? conv : null;
        })
      );

      const validConversations = authorizedConversations.filter((c): c is typeof conversations[0] => c !== null);

      const enrichedConversations = await Promise.all(
        validConversations.map(async (conv) => {
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
          participantA: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          participantB: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      if (
        conversation.participantAId !== currentUserId &&
        conversation.participantBId !== currentUserId &&
        user.role !== Role.ADMIN
      ) {
        return NextResponse.json({ error: "Forbidden access to conversation" }, { status: 403 });
      }

      const otherUser = conversation.participantAId === currentUserId ? conversation.participantB : conversation.participantA;

      if (user.role !== Role.ADMIN && otherUser.role !== Role.ADMIN) {
        const canChat = await canUsersChat(user, otherUser);
        if (!canChat) {
          return NextResponse.json(
            { error: "Direct messaging is only permitted between students and tutors who have requested a 1-on-1 trial or enrolled in a course." },
            { status: 403 }
          );
        }
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

      if (userRole === Role.STUDENT) {
        // Students can only see tutors whose courses they enrolled in / purchased OR with whom they requested a 1-on-1 trial
        const [enrolledCourses, trials] = await Promise.all([
          prisma.enrollment.findMany({
            where: { userId: currentUserId },
            select: {
              course: {
                select: {
                  tutor: {
                    select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
                  },
                },
              },
            },
          }),
          prisma.trialRequest.findMany({
            where: {
              OR: [
                { studentId: currentUserId },
                ...(user.email ? [{ studentEmail: { in: [user.email.trim().toLowerCase(), user.email.trim()] } }] : []),
              ],
              status: { not: TrialStatus.REJECTED },
            },
            select: {
              tutorId: true,
              tutor: {
                select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
              },
              course: {
                select: {
                  tutor: {
                    select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
                  },
                },
              },
            },
          }),
        ]);

        const contactsMap = new Map<string, any>();

        for (const e of enrolledCourses) {
          const tutor = e.course?.tutor;
          if (tutor && tutor.id !== currentUserId) {
            contactsMap.set(tutor.id, tutor);
          }
        }

        const missingTutorIds: string[] = [];
        for (const t of trials) {
          const tutor = t.tutor || t.course?.tutor;
          if (tutor && tutor.id !== currentUserId) {
            contactsMap.set(tutor.id, tutor);
          } else if (t.tutorId && t.tutorId !== currentUserId && !contactsMap.has(t.tutorId)) {
            missingTutorIds.push(t.tutorId);
          }
        }

        if (missingTutorIds.length > 0) {
          const resolvedTutors = await prisma.user.findMany({
            where: { id: { in: missingTutorIds } },
            select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
          });
          for (const rt of resolvedTutors) {
            if (rt.id !== currentUserId) {
              contactsMap.set(rt.id, rt);
            }
          }
        }

        contacts = Array.from(contactsMap.values());
      } else if (userRole === Role.TUTOR || (userRole as any) === "INSTRUCTOR") {
        // Tutors can only see students who enrolled in their courses or requested a 1-on-1 trial with them
        const [enrollments, trials] = await Promise.all([
          prisma.enrollment.findMany({
            where: {
              course: {
                tutorId: currentUserId,
              },
            },
            select: {
              user: {
                select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
              },
            },
          }),
          prisma.trialRequest.findMany({
            where: {
              OR: [
                { tutorId: currentUserId },
                { course: { tutorId: currentUserId } },
              ],
              status: { not: TrialStatus.REJECTED },
            },
            select: {
              studentId: true,
              studentEmail: true,
              student: {
                select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
              },
            },
          }),
        ]);

        const contactsMap = new Map<string, any>();

        for (const e of enrollments) {
          if (e.user && e.user.id !== currentUserId) {
            contactsMap.set(e.user.id, e.user);
          }
        }

        const unresolvedEmails: string[] = [];
        for (const t of trials) {
          if (t.student && t.student.id !== currentUserId) {
            contactsMap.set(t.student.id, t.student);
          } else if (t.studentEmail) {
            unresolvedEmails.push(t.studentEmail.toLowerCase());
          }
        }

        if (unresolvedEmails.length > 0) {
          const resolvedStudents = await prisma.user.findMany({
            where: {
              email: { in: unresolvedEmails, mode: "insensitive" },
            },
            select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
          });
          for (const s of resolvedStudents) {
            if (s.id !== currentUserId) {
              contactsMap.set(s.id, s);
            }
          }
        }

        contacts = Array.from(contactsMap.values());
      } else if (userRole === Role.ADMIN) {
        contacts = await prisma.user.findMany({
          where: { id: { not: currentUserId } },
          select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
          take: 100,
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

      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, name: true, email: true, role: true, avatar: true, headline: true },
      });

      if (!recipient) {
        return NextResponse.json({ error: "Recipient user not found" }, { status: 404 });
      }

      if (user.role !== Role.ADMIN && recipient.role !== Role.ADMIN) {
        const canChat = await canUsersChat(user, recipient);
        if (!canChat) {
          return NextResponse.json(
            {
              error: "Direct messaging is only permitted between students and tutors who have requested a 1-on-1 trial or enrolled in a course.",
            },
            { status: 403 }
          );
        }
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
        include: {
          participantA: { select: { id: true, name: true, email: true, role: true } },
          participantB: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      if (conversation.participantAId !== currentUserId && conversation.participantBId !== currentUserId) {
        return NextResponse.json({ error: "Unauthorized conversation access" }, { status: 403 });
      }

      const receiver = conversation.participantAId === currentUserId ? conversation.participantB : conversation.participantA;

      if (receiver.id !== receiverId) {
        return NextResponse.json({ error: "Invalid receiver ID for conversation" }, { status: 400 });
      }

      if (user.role !== Role.ADMIN && receiver.role !== Role.ADMIN) {
        const canChat = await canUsersChat(user, receiver);
        if (!canChat) {
          return NextResponse.json(
            {
              error: "Direct messaging is only permitted between students and tutors who have requested a 1-on-1 trial or enrolled in a course.",
            },
            { status: 403 }
          );
        }
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
      const receiverLink = receiverUser?.role === "ADMIN" ? "/admin" : (receiverUser?.role === "TUTOR" || (receiverUser?.role as any) === "INSTRUCTOR") ? "/tutor" : "/dashboard";

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
