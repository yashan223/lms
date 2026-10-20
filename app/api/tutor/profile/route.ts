import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  verifyPassword,
  clearSessionCookies,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { broadcastLMSEvent } from "@/lib/events";
import { Role } from "@prisma/client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ensureTutorIdForUser } from "@/lib/tutor-id";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const tutor = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        tutorId: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        headline: true,
        bio: true,
        phone: true,
        country: true,
        timezone: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tutor profile not found." }, { status: 404 });
    }

    let finalTutorId = tutor.tutorId;
    if (!finalTutorId && (tutor.role === "TUTOR" || (tutor.role as any) === "INSTRUCTOR")) {
      finalTutorId = await ensureTutorIdForUser(tutor.id);
    }

    const coursesCount = await prisma.course.count({
      where: { tutorId: tutor.id },
    });

    const courses = await prisma.course.findMany({
      where: { tutorId: tutor.id },
      select: {
        enrollments: {
          select: { userId: true },
        },
      },
    });

    const studentIds = new Set<string>();
    courses.forEach((c) => {
      c.enrollments.forEach((e) => studentIds.add(e.userId));
    });

    const sessionsCount = await prisma.event.count({
      where: {
        course: { tutorId: tutor.id },
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      success: true,
      tutor: {
        ...tutor,
        tutorId: finalTutorId,
        coursesCount,
        studentsCount: studentIds.size,
        sessionsCount,
      },
    });
  } catch (error: any) {
    console.error("Tutor profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tutor profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`tutor-profile-edit:${auth.user.id}:${ip}`, 15, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many profile update attempts. Please wait ${rateLimit.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, headline, bio, phone, country, avatar } = body;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
        return NextResponse.json(
          { error: "Full legal/display name must be between 2 and 100 characters." },
          { status: 400 }
        );
      }
    }

    const existingTutor = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { bio: true },
    });

    let existingHourlyRate = "5000";
    let existingHourlyRateAL = "5000";
    let existingHourlyRateOL = "3500";
    if (existingTutor?.bio) {
      try {
        const parsedExisting = JSON.parse(existingTutor.bio);
        if (parsedExisting.hourlyRate) existingHourlyRate = String(parsedExisting.hourlyRate);
        existingHourlyRateAL = String(parsedExisting.hourlyRateAL || existingHourlyRate || "5000");
        existingHourlyRateOL = String(parsedExisting.hourlyRateOL || "3500");
      } catch {}
    }

    let finalBio = bio !== undefined ? (bio ? bio.trim() : null) : undefined;
    if (finalBio) {
      try {
        const parsedBio = JSON.parse(finalBio);
        if (typeof parsedBio === "object" && parsedBio !== null) {
          parsedBio.hourlyRate = existingHourlyRate;
          parsedBio.hourlyRateAL = existingHourlyRateAL;
          parsedBio.hourlyRateOL = existingHourlyRateOL;
          finalBio = JSON.stringify(parsedBio);
        }
      } catch {}
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (headline !== undefined) updateData.headline = headline?.trim() || null;
    if (finalBio !== undefined) updateData.bio = finalBio;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (country !== undefined) updateData.country = country?.trim() || null;

    if (avatar !== undefined) {
      if (avatar === null || avatar === "") {
        updateData.avatar = null;
      } else if (typeof avatar === "string") {
        updateData.avatar = avatar.trim();
      }
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: updateData,
      select: {
        id: true,
        tutorId: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        headline: true,
        bio: true,
        phone: true,
        country: true,
        timezone: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    broadcastLMSEvent("USERS_CHANGED");

    return NextResponse.json({
      success: true,
      message: "Tutor profile updated successfully.",
      tutor: updated,
    });
  } catch (error: any) {
    console.error("Tutor profile PUT error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update tutor profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.TUTOR]);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Tutor account not found." }, { status: 404 });
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
    broadcastLMSEvent("COURSES_CHANGED");

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
      message: "Your tutor account has been permanently deleted.",
    });

    clearSessionCookies(response);
    return response;
  } catch (error: any) {
    console.error("Tutor profile DELETE error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete tutor account." },
      { status: 500 }
    );
  }
}
