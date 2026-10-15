import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  hashPassword,
  isLegacyPasswordHash,
  attachSessionCookies,
  syncDefaultAdminFromEnv,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`login:${ip}`, 10, 60);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${rateLimit.resetSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Safely sync default admin from .env
    try {
      await syncDefaultAdminFromEnv();
    } catch (syncErr) {
      console.warn("Non-fatal syncDefaultAdminFromEnv warning:", syncErr);
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        enrollments: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid academic email or credentials" },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password entered" },
        { status: 401 }
      );
    }

    // Require email verification before students or tutors can access the LMS.
    if ((user.role === "STUDENT" || user.role === "TUTOR" || (user.role as any) === "INSTRUCTOR") && !user.emailVerified) {
      let emailDispatched = false;

      try {
        // Prevent spamming Resend if user clicks login repeatedly within 60 seconds
        const recentToken = await prisma.emailVerificationToken.findFirst({
          where: {
            userId: user.id,
            used: false,
            createdAt: {
              gte: new Date(Date.now() - 60 * 1000),
            },
          },
        });

        if (!recentToken) {
          // Invalidate old unused tokens for this user
          await prisma.emailVerificationToken.deleteMany({
            where: { userId: user.id, used: false },
          });

          // Generate a secure 24-hour verification token
          const verificationToken = crypto.randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await prisma.emailVerificationToken.create({
            data: {
              token: verificationToken,
              userId: user.id,
              expiresAt,
            },
          });

          // Dispatch verification email (e.g., when tutor logs in for the 1st time)
          const emailResult = await sendVerificationEmail({
            email: user.email,
            name: user.name,
            token: verificationToken,
          });
          emailDispatched = emailResult.success;
        } else {
          emailDispatched = true;
        }
      } catch (emailErr) {
        console.error("Error dispatching verification email during login:", emailErr);
      }

      const isTutorRole = user.role === "TUTOR" || (user.role as any) === "INSTRUCTOR";
      const message = isTutorRole
        ? (emailDispatched
            ? "A verification link has been sent to your email address. Please verify your email before accessing your tutor portal."
            : "Your tutor account requires email verification. We encountered an issue sending the verification link; please check your spam folder or request a new link.")
        : (emailDispatched
            ? "Your academic email address has not been verified yet. A verification link has been sent to your email."
            : "Your academic email address has not been verified yet. Please check your inbox or request a new verification link.");

      return NextResponse.json(
        {
          error: message,
          requiresVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Seamlessly upgrade legacy/plaintext password hashes to cryptographic scrypt
    if (isLegacyPasswordHash(user.passwordHash)) {
      try {
        const upgradedHash = hashPassword(password);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: upgradedHash },
        });
      } catch (upgradeErr) {
        console.error("Non-fatal password upgrade error:", upgradeErr);
      }
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      headline: user.headline,
      enrolledCount: user.enrollments.length,
    };

    let redirectPath = "/dashboard";
    if (user.role === "ADMIN") {
      redirectPath = "/admin";
    } else if (user.role === "TUTOR" || (user.role as any) === "INSTRUCTOR") {
      redirectPath = "/tutor";
    }

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      redirectTo: redirectPath,
    });

    // Attach HMAC-signed HttpOnly session token + client UI sync cookies
    attachSessionCookies(response, user);

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    const msg = error?.message || "";
    const isDbError =
      msg.includes("connect") ||
      msg.includes("SSL") ||
      msg.includes("relation") ||
      msg.includes("does not exist") ||
      error?.code === "P2021" ||
      error?.code === "P1001" ||
      error?.code === "ECONNREFUSED";

    return NextResponse.json(
      {
        error: isDbError
          ? "Database not initialized or unreachable. Please run 'npx prisma db push' and 'npx prisma db seed' on your remote database."
          : "Authentication system error",
      },
      { status: 500 }
    );
  }
}
