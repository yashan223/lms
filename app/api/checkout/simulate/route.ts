import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import crypto from "node:crypto";
import { getPaymentsLkWebhookSecret } from "@/lib/payments-lk";

export const dynamic = "force-dynamic";

/**
 * Sandbox Simulator Action:
 * Simulates Payments.lk gateway processing and signed webhook dispatch
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reference, outcome, cardScheme, last4 } = body;

    const payment = await prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.userId !== auth.user.id && auth.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const webhookUrl = `${protocol}://${host}/api/webhooks/payments-lk`;

    const now = Math.floor(Date.now() / 1000);
    const eventType =
      outcome === "APPROVED" ? "payment.succeeded" : "payment.failed";

    const webhookPayload = {
      id: `evt_test_${crypto.randomBytes(8).toString("hex")}`,
      type: eventType,
      created: now,
      data: {
        id: `pay_test_${crypto.randomBytes(8).toString("hex")}`,
        reference: payment.reference,
        checkoutId: payment.checkoutId || `chk_test_${payment.reference}`,
        amountCents: payment.amountCents,
        feeCents: Math.round(payment.amountCents * 0.0229), // 2.29% Payments.lk tier
        status: outcome === "APPROVED" ? "succeeded" : "declined",
        card: {
          scheme: cardScheme || "visa",
          last4: last4 || "1019",
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const webhookSecret = getPaymentsLkWebhookSecret() || "sandbox_secret";

    // Generate valid Payments.lk HMAC-SHA256 signature header: t=<timestamp>,v1=<hex>
    const signatureDigest = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${now}.${rawPayload}`)
      .digest("hex");
    const signatureHeader = `t=${now},v1=${signatureDigest}`;

    // Dispatch webhook to internal endpoint
    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "payments-signature": signatureHeader,
      },
      body: rawPayload,
    });

    if (!webhookRes.ok) {
      const errText = await webhookRes.text();
      return NextResponse.json(
        { error: `Webhook simulation failed: ${errText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      outcome,
      redirectUrl:
        outcome === "APPROVED"
          ? `/payments/success?reference=${payment.reference}`
          : `/payments/cancel?reference=${payment.reference}`,
    });
  } catch (err: any) {
    console.error("Simulation error:", err);
    return NextResponse.json(
      { error: err.message || "Simulation failed" },
      { status: 500 }
    );
  }
}
