import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";

/**
 * Idempotently fulfills a successful payment:
 * - Credits the student's TokenWallet
 * - Creates a TokenTransaction ledger row
 * - Creates student in-app notifications
 * - Or enrolls into the course if itemType is COURSE
 */
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

  // Check if this payment reference was already fulfilled in TokenTransaction or Enrollment
  if (payment.itemType === "TOKEN_BUNDLE") {
    const existingTx = await prisma.tokenTransaction.findFirst({
      where: { referenceId: payment.reference },
    });

    if (existingTx) {
      // Already credited to wallet! Ensure payment status is SUCCEEDED
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
    // 1. Mark payment as SUCCEEDED
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        paymentMethod: paymentMethod || payment.paymentMethod || "CARD",
        ...(rawPayload ? { rawWebhook: rawPayload } : {}),
      },
    });

    // 2. Fulfill based on itemType
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

      // Credit student balance
      await tx.tokenWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: tokensToAdd },
        },
      });

      // Add to official audit ledger
      await tx.tokenTransaction.create({
        data: {
          walletId: wallet.id,
          amount: tokensToAdd,
          type: "PURCHASE",
          description: `Purchased ${payment.itemTitle} via Payments.lk (+${tokensToAdd} Hours)`,
          referenceId: payment.reference,
        },
      });

      // Notification
      await tx.notification.create({
        data: {
          userId: payment.userId,
          title: "💳 Payment Confirmed - Hours Credited!",
          message: `Your payment of Rs. ${(payment.amountCents / 100).toLocaleString("en-LK")} was successful! ${tokensToAdd} learning hours have been added to your academic wallet.`,
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
              description: `Purchased via Payments.lk. All classes, materials, and masterclasses are now unlocked.`,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              courseId: course.id,
              userId: payment.userId,
            },
          });

          await tx.notification.create({
            data: {
              userId: payment.userId,
              title: "🎉 Course Access Unlocked!",
              message: `Payment successful for "${course.title}". You now have full access to all curriculum modules and study handbooks.`,
              type: "INFO",
              link: `/courses/${course.slug}`,
            },
          });
        }
      }
    }
  });

  // Broadcast real-time LMS sync events
  try {
    broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: payment.userId });
    broadcastLMSEvent("ENROLLMENTS_CHANGED");
    broadcastLMSEvent("COURSES_CHANGED");
  } catch (err) {
    console.error("Failed to broadcast LMS event after fulfillment:", err);
  }

  return { success: true, fulfilled: true, payment };
}
