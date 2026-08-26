import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword, attachSessionCookies } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

    const { name, email, password, phone, qualification, examBoard, targetSeries } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
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
        headline: `${qualification || "London A/L"} Student (${targetSeries || "Spring / Summer 2026"})`,
        bio: `Enrolled student studying ${examBoard || "London A/L & O/L"} curriculum.`,
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
      },
    });

    const sampleCourse = await prisma.course.findFirst({
      where: { status: "PUBLISHED" },
    });

    if (sampleCourse) {
      await prisma.enrollment.create({
        data: {
          userId: newUser.id,
          courseId: sampleCourse.id,
        },
      });
    }

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      headline: newUser.headline,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      redirectTo: "/dashboard",
    });

    // Attach HMAC-signed HttpOnly session token + client UI sync cookies
    attachSessionCookies(response, newUser);

    return response;
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
