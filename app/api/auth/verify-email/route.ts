import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachSessionCookies } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/verify-email?token=...
 * Validates the email verification token, marks user as verified, and creates an authenticated session.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json(
        { valid: false, error: "Verification token is missing." },
        { status: 400 }
      );
    }

    const verificationRecord = await prisma.emailVerificationToken.findUnique({
      where: { token: token.trim() },
      include: { user: true },
    });

    if (!verificationRecord) {
      return NextResponse.json(
        { valid: false, error: "Invalid or nonexistent verification token." },
        { status: 400 }
      );
    }

    if (verificationRecord.used) {
      // If the user's email is already verified, gracefully treat as a successful authentication
      if (verificationRecord.user.emailVerified) {
        const user = verificationRecord.user;
        const safeUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          headline: user.headline,
        };

        const response = NextResponse.json({
          success: true,
          valid: true,
          alreadyVerified: true,
          message: "Your academic email address is already verified! Welcome back.",
          user: safeUser,
          redirectTo: user.role === "TUTOR" ? "/tutor" : "/dashboard",
        });

        attachSessionCookies(response, user);
        return response;
      }

      return NextResponse.json(
        { valid: false, error: "This email verification link has already been used. Please log in." },
        { status: 400 }
      );
    }

    if (new Date() > verificationRecord.expiresAt) {
      return NextResponse.json(
        {
          valid: false,
          error: "This verification link has expired. Please request a new verification email.",
          expired: true,
          email: verificationRecord.user.email,
        },
        { status: 400 }
      );
    }

    const user = verificationRecord.user;

    // Mark email as verified and token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationRecord.id },
        data: { used: true },
      }),
    ]);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      headline: user.headline,
    };

    const response = NextResponse.json({
      success: true,
      valid: true,
      message: "Academic email address verified successfully! Welcome to EduPulse Academy.",
      user: safeUser,
      redirectTo: user.role === "TUTOR" ? "/tutor" : "/dashboard",
    });

    // Automatically establish authenticated session upon successful verification
    attachSessionCookies(response, user);

    return response;
  } catch (error: any) {
    console.error("Verify email GET error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to verify email address. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/verify-email
 * Resends a fresh email verification link to the academic account email address.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`resend-verify:${ip}`, 3, 60);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification requests. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "A valid academic email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If user does not exist or is already verified, return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an unverified account with that email exists, a new verification link has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "This email address is already verified. You can log in directly.",
        redirectTo: "/login",
      });
    }

    // Invalidate old unused tokens for this user
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id, used: false },
    });

    // Create fresh 24-hour verification token
    const newToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        token: newToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Dispatch email via Resend
    const emailResult = await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: newToken,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          error: emailResult.error || "Failed to deliver verification email via Resend.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A new verification link has been dispatched to ${user.email}.`,
    });
  } catch (error: any) {
    console.error("Resend verification email error:", error);
    return NextResponse.json(
      { error: "Failed to resend verification email." },
      { status: 500 }
    );
  }
}
