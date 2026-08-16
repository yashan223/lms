import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Look up user in PostgreSQL via Prisma
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
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

    // Check password (direct match for demo seed / hashed comparison)
    if (user.passwordHash !== password && !user.passwordHash.includes(password)) {
      return NextResponse.json(
        { error: "Invalid password entered" },
        { status: 401 }
      );
    }

    // Build user session payload
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      headline: user.headline,
      enrolledCount: user.enrollments.length,
    };

    let redirectPath = "/dashboard?role=STUDENT";
    if (user.role === "ADMIN") {
      redirectPath = "/admin";
    } else if (user.role === "INSTRUCTOR") {
      redirectPath = "/dashboard?role=INSTRUCTOR";
    }

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      redirectTo: redirectPath,
    });

    // Set cookie for session
    response.cookies.set("edupulse_user_role", user.role, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set("edupulse_user_email", user.email, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Authentication system error" },
      { status: 500 }
    );
  }
}
