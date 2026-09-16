import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import {
  verifyPaymentsLkWebhookSignature,
  getPaymentsLkWebhookSecret,
} from "@/lib/payments-lk";
import { fulfillPayment } from "@/lib/payment-fulfillment";

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
      const result = await fulfillPayment(
        payment.id,
        data.card?.scheme || data.paymentMethod || "CARD",
        payload
      );
      return NextResponse.json({ received: true, ...result });
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
