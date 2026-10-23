import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import { isCourseOL, isCourseAL } from "@/lib/currency";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request).catch(() => ({ user: null }));
    const studentUser = auth?.user?.role === Role.STUDENT ? auth.user : null;

    const { searchParams } = new URL(request.url);
    const queryGrade = searchParams.get("grade") || searchParams.get("level");

    let effectiveGrade: "O/L" | "A/L" | null = null;
    if (studentUser) {
      const rawGrade = studentUser.student_grade || studentUser.academicLevel;
      effectiveGrade =
        rawGrade?.includes("O/L") || rawGrade?.includes("OL") || rawGrade?.includes("IGCSE")
          ? "O/L"
          : "A/L";
    } else if (queryGrade) {
      const norm = queryGrade.toUpperCase();
      if (
        norm.includes("O/L") ||
        norm.includes("OL") ||
        norm.includes("IGCSE") ||
        norm === "INTERMEDIATE"
      ) {
        effectiveGrade = "O/L";
      } else if (norm.includes("A/L") || norm.includes("AL") || norm === "ADVANCED") {
        effectiveGrade = "A/L";
      }
    }

    const tutorWhere: any = {
      role: { in: [Role.TUTOR, Role.INSTRUCTOR] },
    };

    if (effectiveGrade === "O/L") {
      tutorWhere.teaches_ol = true;
    } else if (effectiveGrade === "A/L") {
      tutorWhere.teaches_al = true;
    }

    const isTutorUser =
      auth?.user?.role === Role.TUTOR ||
      auth?.user?.role === Role.INSTRUCTOR ||
      auth?.user?.role === Role.ADMIN;

    const courseWhere: any = isTutorUser && auth?.user?.id
      ? {
          OR: [
            { status: "PUBLISHED" },
            { tutorId: auth.user.id },
          ],
        }
      : {
          status: "PUBLISHED",
        };

    if (effectiveGrade === "O/L") {
      courseWhere.tutor = { teaches_ol: true };
    } else if (effectiveGrade === "A/L") {
      courseWhere.tutor = { teaches_al: true };
    }

    const [rawCourses, rawTutors] = await Promise.all([
      prisma.course.findMany({
        where: courseWhere,
        include: {
          tutor: {
            select: {
              id: true,
              tutorId: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
              headline: true,
              bio: true,
              country: true,
              timezone: true,
              teaches_ol: true,
              teaches_al: true,
            },
          },
          modules: {
            include: {
              lessons: true,
            },
            orderBy: { position: "asc" },
          },
          enrollments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: tutorWhere,
        select: {
          id: true,
          tutorId: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          headline: true,
          bio: true,
          country: true,
          timezone: true,
          teaches_ol: true,
          teaches_al: true,
          ialIasPayRate: true,
          igcsePayRate: true,
          createdCourses: {
            where: { status: "PUBLISHED" },
          },
          events: {
            where: {
              status: { in: ["SCHEDULED", "LIVE", "COMPLETED"] },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    let courses = rawCourses.map((c) => ({
      ...c,
      instructor: c.tutor,
    }));

    if (effectiveGrade === "O/L") {
      courses = courses.filter((c) => isCourseOL(c));
    } else if (effectiveGrade === "A/L") {
      courses = courses.filter((c) => isCourseAL(c));
    }

    const tutors = (rawTutors as any[])
      .filter(
        (t: any) =>
          (t.createdCourses?.length || 0) > 0 || (t.events?.length || 0) > 0
      )
      .map((t: any) => ({
        ...t,
        classesCount: (t.createdCourses?.length || 0) + (t.events?.length || 0),
        subjects: Array.from(
          new Set(
            (t.createdCourses || [])
              .map((c: any) => c.category)
              .filter(Boolean)
          )
        ),
      }));

    return NextResponse.json({ courses, tutors });
  } catch (error) {
    console.error("Courses API error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
