import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";

export async function fulfillPayment(
  paymentIdOrReference: string,
  paymentMethod?: string,
  rawPayload?: any
) {
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { id: paymentIdOrReference },
        { reference: paymentIdOrReference },
        { checkoutId: paymentIdOrReference },
      ],
    },
    include: {
      user: true,
    },
  });

  if (!payment) {
    console.warn("fulfillPayment: Payment not found for identifier:", paymentIdOrReference);
    return { success: false, error: "Payment not found" };
  }

  if (payment.itemType === "TOKEN_BUNDLE") {
    const existingTx = await prisma.tokenTransaction.findFirst({
      where: { referenceId: payment.reference },
    });

    if (existingTx) {
      if (payment.status !== "SUCCEEDED") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED" },
        });
      }
      return { success: true, alreadyFulfilled: true, payment };
    }
  } else if (payment.itemType === "COURSE") {
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: payment.userId,
        course: {
          OR: [{ id: payment.itemId }, { slug: payment.itemId }],
        },
      },
    });

    if (existingEnrollment) {
      if (payment.status !== "SUCCEEDED") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED" },
        });
      }
      return { success: true, alreadyFulfilled: true, payment };
    }
  }

  const tokensToAdd = payment.tokens || 0;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        paymentMethod: paymentMethod || payment.paymentMethod || "CARD",
        ...(rawPayload ? { rawWebhook: rawPayload } : {}),
      },
    });

    if (payment.itemType === "TOKEN_BUNDLE" && tokensToAdd > 0) {
      let wallet = await tx.tokenWallet.findUnique({
        where: { userId: payment.userId },
      });

      if (!wallet) {
        wallet = await tx.tokenWallet.create({
          data: {
            userId: payment.userId,
            balance: 0,
          },
        });
      }

      await tx.tokenWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: tokensToAdd },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          walletId: wallet.id,
          amount: tokensToAdd,
          type: "PURCHASE",
          description: `Purchased ${payment.itemTitle} via Payments.lk (+${tokensToAdd} Hours)`,
          referenceId: payment.reference,
        },
      });

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days lifespan
      const costLkr =
        payment.currency === "USD"
          ? (payment.amountCents / 100) * 300
          : payment.amountCents / 100;

      await tx.tokenGrant.create({
        data: {
          walletId: wallet.id,
          userId: payment.userId,
          packageName: payment.itemTitle || `${tokensToAdd} Hours Pack`,
          tokensGranted: tokensToAdd,
          tokensRemaining: tokensToAdd,
          costLkr: costLkr,
          purchasedAt: now,
          expiresAt: expiresAt,
          status: "ACTIVE",
          referenceId: payment.reference,
        },
      });

      const formattedPaid =
        payment.currency === "USD"
          ? `$${(payment.amountCents / 100).toFixed(2)} USD`
          : `Rs. ${(payment.amountCents / 100).toLocaleString("en-LK")}`;

      await tx.notification.create({
        data: {
          userId: payment.userId,
          title: "💳 Payment Confirmed - Hours Credited!",
          message: `Your payment of ${formattedPaid} was successful! ${tokensToAdd} learning hours have been added to your academic wallet.`,
          type: "INFO",
          link: "/dashboard",
        },
      });
    } else if (payment.itemType === "COURSE") {
      const course = await tx.course.findFirst({
        where: {
          OR: [{ id: payment.itemId }, { slug: payment.itemId }],
        },
      });

      if (course) {
        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: payment.userId,
              courseId: course.id,
            },
          },
        });

        if (!existingEnrollment) {
          await tx.enrollment.create({
            data: {
              userId: payment.userId,
              courseId: course.id,
            },
          });

          await tx.event.create({
            data: {
              title: `Welcome to ${course.title}`,
              description: `Purchased via Payments.lk. All classes, materials, and individual classes are now unlocked.`,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              courseId: course.id,
              userId: payment.userId,
            },
          });

          await tx.notification.create({
            data: {
              userId: payment.userId,
              title: "🎉 Individual Class Access Unlocked!",
              message: `Payment successful for "${course.title}". You now have full access to all curriculum modules and study handbooks.`,
              type: "INFO",
              link: `/classes/${course.slug}`,
            },
          });

          if (course.tutorId) {
            await tx.notification.create({
              data: {
                userId: course.tutorId,
                title: "🎓 New Student Enrolled!",
                message: `${payment.user?.name || "A student"} (${payment.user?.email || ""}) has enrolled in your class "${course.title}".`,
                type: "SUCCESS",
                link: `/tutor?tab=students`,
              },
            });
          }
        }
      }
    }
  });

  try {
    broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: payment.userId });
    if (payment.itemType === "COURSE") {
      const c = await prisma.course.findFirst({
        where: { OR: [{ id: payment.itemId }, { slug: payment.itemId }] },
        select: { tutorId: true },
      });
      if (c?.tutorId) {
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: c.tutorId });
      }
    }
    broadcastLMSEvent("ENROLLMENTS_CHANGED");
    broadcastLMSEvent("COURSES_CHANGED");
    broadcastLMSEvent("EVENTS_CHANGED");
    broadcastLMSEvent("USERS_CHANGED");
  } catch (err) {
    console.error("Failed to broadcast LMS event after fulfillment:", err);
  }

  return { success: true, fulfilled: true, payment };
}
