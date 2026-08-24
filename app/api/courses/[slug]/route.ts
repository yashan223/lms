import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";

async function findCourseBySlugOrId(rawSlug: string) {
  if (!rawSlug) return null;
  const decoded = decodeURIComponent(rawSlug).trim();
  const slugWithHyphens = decoded.replace(/[_\s]+/g, "-").toLowerCase();
  const slugWithUnderscores = decoded.replace(/[-\s]+/g, "_").toLowerCase();

  return await prisma.course.findFirst({
    where: {
      OR: [
        { slug: rawSlug },
        { slug: decoded },
        { slug: slugWithHyphens },
        { slug: slugWithUnderscores },
        { id: rawSlug },
        { id: decoded },
        { slug: { equals: rawSlug, mode: "insensitive" } },
        { slug: { equals: decoded, mode: "insensitive" } },
        { slug: { equals: slugWithHyphens, mode: "insensitive" } },
        { slug: { equals: slugWithUnderscores, mode: "insensitive" } },
      ],
    },
    include: {
      instructor: true,
      modules: {
        include: {
          lessons: {
            orderBy: { position: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
      materials: {
        orderBy: { createdAt: "desc" },
      },
      enrollments: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
      reviews: {
        include: { user: true },
      },
    },
  });
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

    return NextResponse.json({ course });
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
    const { slug } = await params;
    const body = await request.json();
    const { action } = body;

    const course = await findCourseBySlugOrId(slug);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
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

