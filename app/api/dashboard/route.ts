import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Fetch current student (or fallback to first student user)
    const user = await prisma.user.findFirst({
      where: { role: "STUDENT" },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                instructor: true,
                modules: {
                  include: {
                    lessons: true,
                  },
                },
              },
            },
          },
        },
        privateFiles: {
          orderBy: { createdAt: "desc" },
        },
        badges: {
          orderBy: { awardedAt: "desc" },
        },
        events: {
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Fetch all courses for calendar and navigation
    const allCourses = await prisma.course.findMany({
      include: {
        instructor: true,
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    // 3. Fetch active online users
    const onlineUsers = await prisma.user.findMany({
      take: 8,
      select: {
        id: true,
        name: true,
        role: true,
        avatar: true,
        headline: true,
      },
    });

    // 4. Fetch all timeline events
    const timelineEvents = await prisma.event.findMany({
      orderBy: { dueDate: "asc" },
      include: {
        course: true,
      },
    });

    return NextResponse.json({
      user,
      allCourses,
      onlineUsers,
      timelineEvents,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_event") {
      const { title, description, dueDate, courseId, userId, type } = body;
      const newEvent = await prisma.event.create({
        data: {
          title,
          description,
          dueDate: new Date(dueDate),
          courseId: courseId || null,
          userId: userId || null,
          type: type || "ASSIGNMENT",
        },
      });
      return NextResponse.json({ success: true, event: newEvent });
    }

    if (action === "add_private_file") {
      const { fileName, fileSize, fileType, userId } = body;
      const newFile = await prisma.privateFile.create({
        data: {
          fileName,
          fileSize: fileSize || "1.2 MB",
          fileType: fileType || "application/pdf",
          userId,
        },
      });
      return NextResponse.json({ success: true, file: newFile });
    }

    if (action === "delete_private_file") {
      const { fileId } = body;
      await prisma.privateFile.delete({ where: { id: fileId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Dashboard POST error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
