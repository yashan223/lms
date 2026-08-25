import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    // 4. Fetch timeline events strictly assigned to the student or instructor
    let eventWhere: any = {};
    if (user?.role === "STUDENT") {
      const enrolledCourseIds = (user.enrollments || []).map((e) => e.courseId);
      eventWhere = {
        OR: [
          // Directly assigned to this student (e.g. 1-on-1 session, individual assessment)
          { userId: user.id },
          // Assigned to one of the student's enrolled courses (and not assigned exclusively to another student)
          {
            courseId: { in: enrolledCourseIds },
            OR: [
              { userId: null },
              { userId: user.id },
            ],
          },
        ],
      };
    } else if (user?.role === "INSTRUCTOR") {
      const instructorCourseIds = (user.createdCourses || []).map((c) => c.id);
      eventWhere = {
        OR: [
          { userId: user.id },
          { courseId: { in: instructorCourseIds } },
          { course: { instructorId: user.id } },
        ],
      };
    }

    const timelineEvents = await prisma.event.findMany({
      where: eventWhere,
      orderBy: { dueDate: "asc" },
      include: {
        course: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create_event") {
      const roleCookie = request.cookies.get("edupulse_user_role")?.value;
      if (roleCookie === "STUDENT") {
        return NextResponse.json(
          { error: "Students cannot create calendar events. Academic events and classes are scheduled by faculty tutors and administrators." },
          { status: 403 }
        );
      }

      const { title, description, dueDate, courseId, userId, type } = body;

      if (!title || typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "Event title is required." }, { status: 400 });
      }

      let parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        parsedDueDate = new Date();
      }

      const validTypes = ["LIVE_SEMINAR", "DEADLINE"];
      const validatedType = validTypes.includes(type) ? type : "LIVE_SEMINAR";

      let validCourseId: string | null = null;
      if (courseId && typeof courseId === "string" && courseId.trim() !== "" && courseId !== "none" && courseId !== "all") {
        const courseExists = await prisma.course.findUnique({ where: { id: courseId.trim() } });
        if (courseExists) {
          validCourseId = courseExists.id;
        }
      }

      let validUserId: string | null = null;
      if (userId && typeof userId === "string" && userId.trim() !== "") {
        const userExists = await prisma.user.findUnique({ where: { id: userId.trim() } });
        if (userExists) {
          validUserId = userExists.id;
        }
      }

      const newEvent = await prisma.event.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          dueDate: parsedDueDate,
          courseId: validCourseId,
          userId: validUserId,
          type: validatedType as any,
        },
        include: {
          course: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, event: newEvent });
    }

    if (action === "delete_event") {
      const { eventId } = body;
      if (!eventId) {
        return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
      }

      await prisma.event.delete({
        where: { id: eventId },
      });

      broadcastLMSEvent("EVENTS_CHANGED");
      return NextResponse.json({ success: true, message: "Event deleted successfully." });
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
      broadcastLMSEvent("MATERIALS_CHANGED");
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
      broadcastLMSEvent("MATERIALS_CHANGED");
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
