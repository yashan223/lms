import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { getPaymentsLkCheckout, isPaymentsLkConfigured } from "@/lib/payments-lk";
import { fulfillPayment } from "@/lib/payment-fulfillment";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    const checkoutId = searchParams.get("checkoutId");

    if (!reference && !checkoutId) {
      return NextResponse.json(
        { error: "reference or checkoutId is required." },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(reference ? [{ reference }] : []),
          ...(checkoutId ? [{ checkoutId }] : []),
        ],
        // Allow admins to view any payment, students view only their own
        ...(auth.user.role === "ADMIN" ? {} : { userId: auth.user.id }),
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // If payment is pending and Payments.lk is configured and checkoutId is present, query Payments.lk API
    if (
      payment.checkoutId &&
      isPaymentsLkConfigured() &&
      !payment.checkoutId.startsWith("chk_test_")
    ) {
      try {
        const checkoutInfo = await getPaymentsLkCheckout(payment.checkoutId);
        if (checkoutInfo.payment?.status === "succeeded") {
          // Fulfill payment (credits wallet and creates transaction ledger row)
          await fulfillPayment(
            payment.id,
            checkoutInfo.payment.card?.scheme || "CARD",
            checkoutInfo
          );
          payment.status = "SUCCEEDED";
        }
      } catch (err) {
        console.warn("Could not query Payments.lk checkout status:", err);
      }
    } else if (payment.status === "SUCCEEDED") {
      // Ensure fulfillment was completed even if status was updated elsewhere
      await fulfillPayment(payment.id);
    }

    return NextResponse.json({
      success: true,
      status: payment.status,
      paid: payment.status === "SUCCEEDED",
      reference: payment.reference,
      itemType: payment.itemType,
      itemTitle: payment.itemTitle,
      amountCents: payment.amountCents,
      currency: payment.currency,
      tokens: payment.tokens,
      createdAt: payment.createdAt,
    });
  } catch (error: any) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve payment status" },
      { status: 500 }
    );
  }
}
