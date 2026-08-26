import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const { name, email, password, phone, qualification, examBoard, targetSeries } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
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

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: password,
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

    response.cookies.set("edupulse_user_role", newUser.role, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set("edupulse_user_email", newUser.email, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
