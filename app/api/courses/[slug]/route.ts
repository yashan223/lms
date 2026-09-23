import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role } from "@prisma/client";

async function findCourseBySlugOrId(rawSlug: string) {
  if (!rawSlug) return null;
  const decoded = decodeURIComponent(rawSlug).trim();

  const includeOptions = {
    tutor: {
      select: {
        id: true,
        name: true,
        avatar: true,
        headline: true,
        bio: true,
      },
    },
    modules: {
      include: {
        lessons: {
          orderBy: { position: "asc" as const },
        },
      },
      orderBy: { position: "asc" as const },
    },
    materials: {
      orderBy: { createdAt: "desc" as const },
    },
    enrollments: {
      select: {
        id: true,
        userId: true,
      },
    },
  };

  const course = await prisma.course.findFirst({
    where: {
      OR: [
        { slug: decoded },
        { id: decoded },
        { slug: rawSlug },
      ],
    },
    include: includeOptions,
  });

  if (course) {
    (course as any).instructor = course.tutor;
  }

  return course;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const course = await findCourseBySlugOrId(slug);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    let isEnrolled = false;
    let isLoggedIn = false;
    try {
      const auth = await getAuthenticatedUser(request);
      if (auth.user) {
        isLoggedIn = true;
        isEnrolled = course.enrollments.some((e) => e.userId === auth.user.id);
      }
    } catch {
      // Unauthenticated visitor
    }

    return NextResponse.json(
      {
        course,
        isEnrolled,
        isLoggedIn,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Course Detail API error:", error);
    return NextResponse.json({ error: "Failed to fetch course details" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { action } = body;

    const course = await findCourseBySlugOrId(slug);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (auth.user.role !== Role.ADMIN && course.tutorId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this course" }, { status: 403 });
    }

    if (action === "add_material") {
      const { title, description, fileUrl, fileSize, fileType, category } = body;

      if (!title || !fileUrl) {
        return NextResponse.json({ error: "Title and file are required" }, { status: 400 });
      }

      const material = await prisma.courseMaterial.create({
        data: {
          title,
          description: description || null,
          fileUrl,
          fileSize: fileSize || "1.5 MB",
          fileType: fileType || "application/pdf",
          category: category || "HANDOUT",
          courseId: course.id,
        },
      });

      broadcastLMSEvent("MATERIALS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");

      return NextResponse.json({ success: true, material });
    }

    if (action === "delete_material") {
      const { materialId } = body;
      const existing = await prisma.courseMaterial.findUnique({ where: { id: materialId } });
      if (existing && existing.fileUrl.startsWith("/api/files/")) {
        const fileKey = existing.fileUrl.replace("/api/files/", "");
        await deleteStorageFile(fileKey);
      }
      await prisma.courseMaterial.delete({ where: { id: materialId } });

      broadcastLMSEvent("MATERIALS_CHANGED");
      broadcastLMSEvent("COURSES_CHANGED");

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Course POST API error:", error);
    return NextResponse.json({ error: "Failed to update course data" }, { status: 500 });
  }
}
