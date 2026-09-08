import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

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

    const { name, email, password, phone, qualification, examBoard, targetSeries, country } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

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

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        phone: phone ? phone.trim() : null,
        role: Role.STUDENT,
        emailVerified: null, // Requires email verification via Resend
        headline: `${qualification || "London A/L"} Student${country ? ` • ${country}` : ""} (${targetSeries || "Spring / Summer 2026"})`,
        bio: `Enrolled student ${country ? `from ${country} ` : ""}studying ${examBoard || "London A/L & O/L"} curriculum.`,
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
        tokenWallet: {
          create: {
            balance: 0,
          },
        },
      },
    });

    // Generate 32-byte secure verification token (valid for 24 hours)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        token: verificationToken,
        userId: newUser.id,
        expiresAt,
      },
    });

    // Send verification email via Resend (safeguarded against email provider issues)
    try {
      await sendVerificationEmail({
        email: newUser.email,
        name: newUser.name,
        token: verificationToken,
      });
    } catch (emailErr) {
      console.error("Non-fatal registration verification email send error:", emailErr);
    }

    return NextResponse.json({
      success: true,
      requireVerification: true,
      email: newUser.email,
      redirectTo: `/verify-email?email=${encodeURIComponent(newUser.email)}&sent=true`,
      message: "Registration successful! A verification email has been sent to your inbox.",
    });
  } catch (error: any) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: error?.message || "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
