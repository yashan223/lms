import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  hashPassword,
  isLegacyPasswordHash,
  attachSessionCookies,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

    // Check if student has verified their academic email
    if (user.role === "STUDENT" && !user.emailVerified) {
      return NextResponse.json(
        {
          error: "Please verify your academic email address before logging in.",
          requireEmailVerification: true,
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
    } else if (user.role === "INSTRUCTOR") {
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
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Authentication system error" },
      { status: 500 }
    );
  }
}
