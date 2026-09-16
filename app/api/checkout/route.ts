import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { getBundles } from "@/lib/bundles";
import {
  createPaymentsLkCheckout,
  isPaymentsLkConfigured,
} from "@/lib/payments-lk";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Please sign in to proceed with payment." },
        { status: auth.status || 401 }
      );
    }

    const user = auth.user;
    const body = await request.json().catch(() => ({}));
    const { itemType, itemId, returnUrl, cancelUrl } = body;

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: "itemType and itemId are required." },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    let amountCents = 0;
    let description = "";
    let itemTitle = "";
    let tokens: number | null = null;

    if (itemType === "TOKEN_BUNDLE") {
      const bundles = await getBundles();
      const bundle = bundles.find((b) => b.id === itemId);

      if (!bundle) {
        return NextResponse.json(
          { error: "Selected token bundle not found." },
          { status: 404 }
        );
      }

      // Payments.lk accepts LKR in cents: Rs. 7,200 is 720000 cents
      const lkrPrice = bundle.lkrPrice || bundle.price * 300;
      amountCents = Math.round(lkrPrice * 100);
      description = `PulseEDU - ${bundle.name} (${bundle.tokens} Learning Hours)`;
      itemTitle = bundle.name;
      tokens = bundle.tokens;
    } else if (itemType === "COURSE") {
      const course = await prisma.course.findFirst({
        where: {
          OR: [{ id: itemId }, { slug: itemId }],
        },
      });

      if (!course) {
        return NextResponse.json(
          { error: "Selected course not found." },
          { status: 404 }
        );
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: course.id,
          },
        },
      });

      if (existingEnrollment) {
        return NextResponse.json(
          { error: "You are already enrolled in this course.", alreadyEnrolled: true },
          { status: 400 }
        );
      }

      // Convert course token price to LKR (1 Token = ~Rs. 1,200)
      const courseLkrPrice = Math.max(1, (course.price || 10) * 1200);
      amountCents = Math.round(courseLkrPrice * 100);
      description = `PulseEDU Enrollment: ${course.title}`;
      itemTitle = course.title;
    } else {
      return NextResponse.json(
        { error: `Unsupported itemType: ${itemType}` },
        { status: 400 }
      );
    }

    if (amountCents <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount." },
        { status: 400 }
      );
    }

    // Unique payment reference
    const reference = `EDU-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Target return and cancel URLs
    const successRedirectUrl =
      returnUrl ||
      `${origin}/payments/success?reference=${reference}`;
    const cancelRedirectUrl =
      cancelUrl ||
      `${origin}/payments/cancel?reference=${reference}`;

    // Create DB Payment record
    const payment = await prisma.payment.create({
      data: {
        reference,
        userId: user.id,
        amountCents,
        currency: "LKR",
        status: "PENDING",
        itemType,
        itemId,
        itemTitle,
        tokens,
      },
    });

    // Check if Payments.lk API key is active
    if (isPaymentsLkConfigured()) {
      try {
        const checkout = await createPaymentsLkCheckout({
          amountCents,
          description,
          reference,
          customer: {
            name: user.name || "Student",
            email: user.email,
          },
          successUrl: successRedirectUrl,
          cancelUrl: cancelRedirectUrl,
          idempotencyKey: reference,
        });

        // Update payment with checkout info
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            checkoutId: checkout.id,
            checkoutUrl: checkout.url,
          },
        });

        return NextResponse.json({
          success: true,
          checkoutUrl: checkout.url,
          checkoutId: checkout.id,
          reference,
          mode: "live_or_sandbox",
        });
      } catch (err: any) {
        console.error("Failed to create Payments.lk checkout via API:", err);
        return NextResponse.json(
          { error: err.message || "Payments gateway unavailable. Please try again." },
          { status: 502 }
        );
      }
    }

    // If API key is not yet set in .env, offer interactive sandbox test checkout
    const mockCheckoutUrl = `${origin}/payments/sandbox-checkout?reference=${reference}`;
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        checkoutId: `chk_test_${reference}`,
        checkoutUrl: mockCheckoutUrl,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: mockCheckoutUrl,
      checkoutId: `chk_test_${reference}`,
      reference,
      mode: "sandbox_simulator",
      notice:
        "Running in Payments.lk Sandbox Simulator. Configure PAYMENTS_LK_SECRET_KEY in .env for official hosted checkouts.",
    });
  } catch (error: any) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: "Internal error creating checkout session." },
      { status: 500 }
    );
  }
}
