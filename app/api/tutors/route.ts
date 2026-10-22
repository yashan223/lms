import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";

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

    const rawTutors = await prisma.user.findMany({
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
          select: {
            id: true,
            title: true,
            category: true,
            level: true,
            subjectCode: true,
            enrollments: { select: { id: true } },
          },
        },
        events: {
          where: {
            status: { in: ["SCHEDULED", "LIVE", "COMPLETED"] },
          },
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

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

    return NextResponse.json({ tutors });
  } catch (error) {
    console.error("Tutors API error:", error);
    return NextResponse.json({ error: "Failed to fetch tutors" }, { status: 500 });
  }
}
