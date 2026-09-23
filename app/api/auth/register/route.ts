import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`register:${ip}`, 5, 60);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please try again in ${rateLimit.resetSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const { name, email, password, phone, qualification, examBoard, targetSeries, country, agreedToTerms } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { error: "Full name must be between 2 and 100 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 254) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (!agreedToTerms) {
      return NextResponse.json(
        { error: "You must accept the Terms & Conditions and No-Refund Policy to register" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Password cannot exceed 128 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address is already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = hashPassword(password);

    // 1. Create the new student account with unverified email status
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        phone: phone ? phone.trim() : null,
        country: country ? country.trim() : null,
        role: Role.STUDENT,
        academicLevel: qualification?.includes("O/L") || qualification?.includes("IGCSE") ? "OL" : "AL",
        emailVerified: null, // Student must verify via email!
        headline: `${qualification || "London A/L"} Student${country ? ` • ${country}` : ""} (${targetSeries || "Spring / Summer 2026"})`,
        bio: `Enrolled student ${country ? `from ${country} ` : ""}studying ${examBoard || "London A/L & O/L"} curriculum. Agreed to Terms & Conditions and No-Refund Policy.`,
        avatar: null,
        tokenWallet: {
          create: {
            balance: 0,
          },
        },
      },
    });

    // 2. Generate a secure 24-hour verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        token: verificationToken,
        userId: newUser.id,
        expiresAt,
      },
    });

    // 3. Dispatch verification email via Resend
    let emailSent = false;
    let emailNotice: string | undefined;
    try {
      const emailResult = await sendVerificationEmail({
        email: newUser.email,
        name: newUser.name,
        token: verificationToken,
      });
      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailNotice = emailResult.error;
      }
    } catch (err: any) {
      console.error("Failed to dispatch initial verification email:", err);
      emailNotice = err?.message;
    }

    // Return redirect to verify-email without auto-session
    return NextResponse.json({
      success: true,
      email: newUser.email,
      requiresVerification: true,
      redirectTo: `/verify-email?email=${encodeURIComponent(newUser.email)}`,
      message: emailSent
        ? "Registration successful! A verification link has been sent to your email address."
        : "Registration successful! Please verify your email address to activate your account.",
      emailNotice,
    });
  } catch (error: any) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: error?.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
