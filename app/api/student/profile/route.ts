import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  hashPassword,
  verifyPassword,
  clearSessionCookies,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { broadcastLMSEvent } from "@/lib/events";
import { Role } from "@prisma/client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ensureStudentIdForUser } from "@/lib/student-id";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const student = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        headline: true,
        bio: true,
        phone: true,
        country: true,
        academicLevel: true,
        guardianName: true,
        guardianRelationship: true,
        guardianPhone: true,
        emailVerified: true,
        createdAt: true,
        tokenWallet: {
          select: {
            balance: true,
          },
        },
        enrollments: {
          select: {
            id: true,
            courseId: true,
            course: {
              select: {
                id: true,
                title: true,
                subjectCode: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    let finalStudentId = student.studentId;
    if (!finalStudentId && student.role === "STUDENT") {
      finalStudentId = await ensureStudentIdForUser(student.id);
    }

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        studentId: finalStudentId,
        walletBalance: student.tokenWallet?.balance || 0,
        enrollmentsCount: student.enrollments.length,
      },
    });
  } catch (error: any) {
    console.error("Student profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve student profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`profile-edit:${auth.user.id}:${ip}`, 10, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many profile update attempts. Please wait ${rateLimit.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "change_password") {
      const { currentPassword, newPassword, confirmPassword } = body;

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "Current password and new password are required." },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters in length." },
          { status: 400 }
        );
      }

      if (newPassword.length > 128) {
        return NextResponse.json(
          { error: "New password cannot exceed 128 characters." },
          { status: 400 }
        );
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: "New password and confirmation password do not match." },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { id: true, passwordHash: true },
      });

      if (!existingUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      const isCurrentValid = verifyPassword(currentPassword, existingUser.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Incorrect current password. Please re-enter your existing password." },
          { status: 400 }
        );
      }

      const newHash = hashPassword(newPassword);
      await prisma.user.update({
        where: { id: auth.user.id },
        data: { passwordHash: newHash },
      });

      return NextResponse.json({
        success: true,
        message: "Your account password was updated successfully.",
      });
    }

    const { name, headline, bio, phone, country, academicLevel, avatar, guardianName, guardianRelationship, guardianPhone } = body;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
        return NextResponse.json(
          { error: "Full name must be between 2 and 100 characters." },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (headline !== undefined) updateData.headline = headline?.trim() || null;
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (country !== undefined) updateData.country = country?.trim() || null;
    if (guardianName !== undefined) updateData.guardianName = guardianName?.trim() || null;
    if (guardianRelationship !== undefined) updateData.guardianRelationship = guardianRelationship?.trim() || null;
    if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone?.trim() || null;

    if (avatar !== undefined) {
      if (avatar === null || avatar === "") {
        updateData.avatar = null;
      } else if (typeof avatar === "string") {
        const isSafe =
          avatar.startsWith("/api/files/") ||
          avatar.startsWith("data:image/");
        if (isSafe) {
          updateData.avatar = avatar.trim();
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: updateData,
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        headline: true,
        bio: true,
        phone: true,
        country: true,
        academicLevel: true,
        guardianName: true,
        guardianRelationship: true,
        guardianPhone: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    broadcastLMSEvent("USERS_CHANGED");

    return NextResponse.json({
      success: true,
      message: "Student profile updated successfully.",
      student: updated,
    });
  } catch (error: any) {
    console.error("Student profile PUT error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update student profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    if (auth.user.role !== Role.STUDENT) {
      return NextResponse.json(
        { error: "Only student accounts can be self-deleted." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Student account not found." }, { status: 404 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Please enter your current account password to confirm account deletion." },
        { status: 400 }
      );
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect password. Account deletion aborted." },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: user.id },
    });

    broadcastLMSEvent("USERS_CHANGED");
    broadcastLMSEvent("ENROLLMENTS_CHANGED");

    try {
      const cookieStore = await cookies();
      cookieStore.delete(SESSION_COOKIE_NAME);
      cookieStore.delete("edupulse_user_role");
      cookieStore.delete("edupulse_user_email");
    } catch (cookieErr) {
      console.error("Failed to delete cookies directly:", cookieErr);
    }

    const response = NextResponse.json({
      success: true,
      message: "Your student account has been permanently deleted.",
    });

    clearSessionCookies(response);
    return response;
  } catch (error: any) {
    console.error("Student profile DELETE error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete student account." },
      { status: 500 }
    );
  }
}
