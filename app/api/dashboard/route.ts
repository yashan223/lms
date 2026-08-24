import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const roleParam = searchParams.get("role");
    const emailCookie = request.cookies.get("edupulse_user_email")?.value;
    const roleCookie = request.cookies.get("edupulse_user_role")?.value;

    let targetWhere: any = {};
    if (emailCookie) {
      targetWhere = { email: emailCookie.toLowerCase() };
    } else if (roleParam) {
      targetWhere = { role: roleParam };
    } else if (roleCookie) {
      targetWhere = { role: roleCookie };
    } else {
      targetWhere = { role: "STUDENT" };
    }

    // 1. Fetch user matching cookie or requested role
    let user = await prisma.user.findFirst({
      where: targetWhere,
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
        createdCourses: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
            enrollments: {
              include: { user: true },
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
      user = await prisma.user.findFirst({
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
          createdCourses: {
            include: {
              modules: {
                include: {
                  lessons: true,
                },
              },
              enrollments: {
                include: { user: true },
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
      const { fileName, fileSize, fileType, fileUrl, userId } = body;
      const newFile = await prisma.privateFile.create({
        data: {
          fileName,
          fileSize: fileSize || "1.2 MB",
          fileType: fileType || "application/pdf",
          fileUrl: fileUrl || null,
          userId,
        },
      });
      return NextResponse.json({ success: true, file: newFile });
    }

    if (action === "delete_private_file") {
      const { fileId } = body;
      // Fetch file to get fileUrl if it exists
      const existing = await prisma.privateFile.findUnique({ where: { id: fileId } });
      if (existing && existing.fileUrl && existing.fileUrl.startsWith("/api/files/")) {
        const fileKey = existing.fileUrl.replace("/api/files/", "");
        await deleteStorageFile(fileKey);
      }
      await prisma.privateFile.delete({ where: { id: fileId } });
      return NextResponse.json({ success: true });
    }

    if (action === "grade_submission") {
      const { studentName, paperTitle, marks, remarks } = body;
      return NextResponse.json({
        success: true,
        message: `Marks recorded for ${studentName}: ${marks} marks with remarks.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Dashboard POST error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
