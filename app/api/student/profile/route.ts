import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hashPassword, verifyPassword } from "@/lib/auth";
import { broadcastLMSEvent } from "@/lib/events";
import { Role } from "@prisma/client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/student/profile
 * Returns the authenticated student's full profile details
 */
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
        badges: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            awardedAt: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        walletBalance: student.tokenWallet?.balance || 0,
        enrollmentsCount: student.enrollments.length,
        badgesCount: student.badges.length,
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

/**
 * PUT /api/student/profile
 * Updates the student's profile information (name, headline, bio, phone, country, academicLevel, avatar)
 * or updates their password securely.
 */
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

    // Sub-action: Change Password
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

    // Default action: Update profile info
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
    if (academicLevel !== undefined) {
      updateData.academicLevel = academicLevel === "OL" ? "OL" : "AL";
    }
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
