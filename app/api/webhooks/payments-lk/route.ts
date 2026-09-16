import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import {
  verifyPaymentsLkWebhookSignature,
  getPaymentsLkWebhookSecret,
} from "@/lib/payments-lk";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("payments-signature");
    const webhookSecret = getPaymentsLkWebhookSecret();

    // Verify signature if secret is configured
    if (webhookSecret) {
      const isValid = verifyPaymentsLkWebhookSignature(
        signature,
        rawBody,
        webhookSecret
      );
      if (!isValid) {
        console.warn("Payments.lk webhook rejected: invalid signature");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 400 }
        );
      }
    } else {
      console.warn(
        "PAYMENTS_LK_WEBHOOK_SECRET is not configured. Webhook received without signature validation."
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { type, data } = payload;
    if (!type || !data) {
      return NextResponse.json(
        { error: "Invalid event structure" },
        { status: 400 }
      );
    }

    console.log(`Payments.lk webhook event received: ${type}`, {
      reference: data.reference,
      checkoutId: data.checkoutId || data.id,
      amountCents: data.amountCents,
    });

    const reference = data.reference || data.orderId || data.checkoutReference;
    const checkoutId = data.checkoutId || (type.startsWith("checkout.") ? data.id : undefined);

    // Find the corresponding payment in our database
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(reference ? [{ reference }] : []),
          ...(checkoutId ? [{ checkoutId }] : []),
        ],
      },
      include: {
        user: true,
      },
    });

    if (!payment) {
      console.warn("Payment record not found for webhook reference:", {
        reference,
        checkoutId,
      });
      // Return 200 so Payments.lk doesn't keep retrying unknown non-existent orders
      return NextResponse.json(
        { received: true, message: "Payment record not found in system" },
        { status: 200 }
      );
    }

    if (type === "payment.succeeded") {
      // Idempotency check: if already processed, do not double credit
      if (payment.status === "SUCCEEDED") {
        return NextResponse.json(
          { received: true, message: "Already processed" },
          { status: 200 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // 1. Mark payment as SUCCEEDED
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            paymentMethod: data.card?.scheme || data.paymentMethod || "CARD",
            rawWebhook: payload,
          },
        });

        // 2. Fulfill based on itemType
        if (payment.itemType === "TOKEN_BUNDLE") {
          const tokensToAdd = payment.tokens || 0;

          // Find or create wallet
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

          // Credit wallet
          await tx.tokenWallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: tokensToAdd },
            },
          });

          // Create transaction
          await tx.tokenTransaction.create({
            data: {
              walletId: wallet.id,
              amount: tokensToAdd,
              type: "PURCHASE",
              description: `Purchased ${payment.itemTitle} via Payments.lk (+${tokensToAdd} Hours)`,
              referenceId: payment.reference,
            },
          });

          // Notify student
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
          // Find course
          const course = await tx.course.findFirst({
            where: {
              OR: [{ id: payment.itemId }, { slug: payment.itemId }],
            },
          });

          if (course) {
            // Check if already enrolled
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
                  description: `Purchased via Payments.lk. All lectures, materials, and masterclasses are now unlocked.`,
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

      // Broadcast real-time events to connected clients
      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: payment.userId });
      broadcastLMSEvent("ENROLLMENTS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");

      return NextResponse.json({ received: true, fulfilled: true });
    }

    if (type === "payment.failed") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          rawWebhook: payload,
        },
      });

      await prisma.notification.create({
        data: {
          userId: payment.userId,
          title: "⚠️ Card Payment Declined",
          message: `Your payment of Rs. ${(payment.amountCents / 100).toLocaleString("en-LK")} for ${payment.itemTitle} was declined by the card issuer.`,
          type: "INFO",
          link: "/dashboard",
        },
      });

      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: payment.userId });
      return NextResponse.json({ received: true, status: "failed" });
    }

    if (type === "checkout.expired") {
      if (payment.status === "PENDING") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "EXPIRED",
            rawWebhook: payload,
          },
        });
      }
      return NextResponse.json({ received: true, status: "expired" });
    }

    return NextResponse.json({ received: true, unhandled: type });
  } catch (error: any) {
    console.error("Payments.lk webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
