import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { getBundles } from "@/lib/bundles";
import { getPackageCurrency } from "@/lib/currency";
import { resolveGeoLocation } from "@/lib/geo";
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

    const geo = await resolveGeoLocation(request.headers);
    const requestedCurrency = typeof body.currency === "string" ? body.currency.toUpperCase() : null;
    const resolvedCurrency: "LKR" | "USD" =
      requestedCurrency === "USD" || requestedCurrency === "LKR"
        ? requestedCurrency
        : (geo.isSriLanka ? "LKR" : "USD");

    let amountCents = 0;
    let gatewayAmountCents = 0;
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

      const isOL =
        (user as any).academicLevel === "OL" ||
        user.headline?.includes("O/L") ||
        user.headline?.includes("IGCSE");

      const baseUsd =
        isOL && bundle.olPrice && bundle.olPrice > 0
          ? bundle.olPrice
          : bundle.price;

      const baseLkr =
        isOL && bundle.olLkrPrice && bundle.olLkrPrice > 0
          ? bundle.olLkrPrice
          : bundle.lkrPrice || Math.round(baseUsd * 300);

      const hasDiscount = Boolean(bundle.discountEnabled && bundle.discountPercent && Number(bundle.discountPercent) > 0);
      const discountPercent = hasDiscount ? Math.min(100, Math.max(0, Number(bundle.discountPercent))) : 0;
      const discountFactor = hasDiscount ? (100 - discountPercent) / 100 : 1;

      const effectiveUsd = hasDiscount ? Math.round(baseUsd * discountFactor * 100) / 100 : baseUsd;
      const effectiveLkr = hasDiscount ? Math.round(baseLkr * discountFactor) : baseLkr;

      const discountTag = hasDiscount ? ` (${discountPercent}% OFF)` : "";
      itemTitle = `${bundle.name}${isOL ? " (O/L Tier)" : ""}${discountTag}`;
      tokens = bundle.tokens;

      if (resolvedCurrency === "USD") {
        amountCents = Math.round(effectiveUsd * 100);
        gatewayAmountCents = Math.round(effectiveLkr * 100);
        description = `PulseEDU - ${bundle.name} (${bundle.tokens} Learning Hours${isOL ? " - O/L Tier" : ""}${discountTag}) - $${effectiveUsd.toFixed(2)} USD`;
      } else {
        amountCents = Math.round(effectiveLkr * 100);
        gatewayAmountCents = amountCents;
        description = `PulseEDU - ${bundle.name} (${bundle.tokens} Learning Hours${isOL ? " - O/L Tier" : ""}${discountTag}) - Rs. ${effectiveLkr.toLocaleString("en-LK")} LKR`;
      }
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

      const isOL =
        (user as any).academicLevel === "OL" ||
        user.headline?.includes("O/L") ||
        user.headline?.includes("IGCSE");

      const effectiveCourseTokens =
        isOL && (course as any).olPrice !== null && (course as any).olPrice !== undefined && Number((course as any).olPrice) >= 0
          ? Number((course as any).olPrice)
          : (course.price !== null && course.price !== undefined && !isNaN(Number(course.price))
              ? Number(course.price)
              : 0);

      const effectiveCourseLkr = Math.max(1, effectiveCourseTokens * 1200);
      const effectiveCourseUsd = Math.max(1, effectiveCourseTokens * 4);

      itemTitle = `${course.title}${isOL ? " (O/L Tier)" : ""}`;

      if (resolvedCurrency === "USD") {
        amountCents = Math.round(effectiveCourseUsd * 100);
        gatewayAmountCents = Math.round(effectiveCourseLkr * 100);
        description = `PulseEDU Enrollment: ${course.title}${isOL ? " (O/L Tier)" : ""} - $${effectiveCourseUsd.toFixed(2)} USD`;
      } else {
        amountCents = Math.round(effectiveCourseLkr * 100);
        gatewayAmountCents = amountCents;
        description = `PulseEDU Enrollment: ${course.title}${isOL ? " (O/L Tier)" : ""} - Rs. ${effectiveCourseLkr.toLocaleString("en-LK")} LKR`;
      }
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

    const reference = `EDU-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const successRedirectUrl =
      returnUrl ||
      `${origin}/payments/success?reference=${reference}`;
    const cancelRedirectUrl =
      cancelUrl ||
      `${origin}/payments/cancel?reference=${reference}`;

    const payment = await prisma.payment.create({
      data: {
        reference,
        userId: user.id,
        amountCents,
        currency: resolvedCurrency,
        status: "PENDING",
        itemType,
        itemId,
        itemTitle,
        tokens,
      },
    });

    if (isPaymentsLkConfigured()) {
      try {
        const gatewayDescription =
          resolvedCurrency === "USD"
            ? `${description} (Rs. ${(gatewayAmountCents / 100).toLocaleString("en-LK")} LKR)`
            : description;

        const checkout = await createPaymentsLkCheckout({
          amountCents: gatewayAmountCents,
          description: gatewayDescription,
          reference,
          customer: {
            name: user.name || "Student",
            email: user.email,
          },
          successUrl: successRedirectUrl,
          cancelUrl: cancelRedirectUrl,
          idempotencyKey: reference,
        });

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
          currency: resolvedCurrency,
          amountCents,
          gatewayAmountCents,
          gatewayCurrency: "LKR",
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
      currency: resolvedCurrency,
      amountCents,
      gatewayAmountCents,
      gatewayCurrency: "LKR",
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
