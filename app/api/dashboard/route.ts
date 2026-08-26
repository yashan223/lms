import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStorageFile } from "@/lib/storage";
import { broadcastLMSEvent } from "@/lib/events";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    const searchParams = request.nextUrl.searchParams;
    const roleParam = searchParams.get("role");
    const emailCookie = request.cookies.get("edupulse_user_email")?.value;
    const roleCookie = request.cookies.get("edupulse_user_role")?.value;

    let targetWhere: any = {};
    if (auth.user) {
      targetWhere = { id: auth.user.id };
    } else if (emailCookie) {
      targetWhere = { email: emailCookie.toLowerCase() };
    } else if (roleParam) {
      targetWhere = { role: roleParam };
    } else if (roleCookie) {
      targetWhere = { role: roleCookie };
    } else {
      targetWhere = { role: "STUDENT" };
    }

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

    let eventWhere: any = {};
    if (user?.role === "STUDENT") {
      const enrolledCourseIds = (user.enrollments || []).map((e) => e.courseId);
      eventWhere = {
        OR: [

          { userId: user.id },

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
      const auth = await getAuthenticatedUser(request);
      const { fileName, fileSize, fileType, fileUrl, userId } = body;
      const targetUserId = auth.user ? auth.user.id : userId;

      if (!targetUserId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
      }

      const newFile = await prisma.privateFile.create({
        data: {
          fileName,
          fileSize: fileSize || "1.2 MB",
          fileType: fileType || "application/pdf",
          fileUrl: fileUrl || null,
          userId: targetUserId,
        },
      });
      broadcastLMSEvent("MATERIALS_CHANGED");
      return NextResponse.json({ success: true, file: newFile });
    }

    if (action === "delete_private_file") {
      const auth = await getAuthenticatedUser(request);
      const { fileId } = body;

      const existing = await prisma.privateFile.findUnique({ where: { id: fileId } });
      if (existing) {
        if (auth.user && auth.user.role !== "ADMIN" && existing.userId !== auth.user.id) {
          return NextResponse.json({ error: "Forbidden: You cannot delete another user's file" }, { status: 403 });
        }

        if (existing.fileUrl && existing.fileUrl.startsWith("/api/files/")) {
          const fileKey = existing.fileUrl.replace("/api/files/", "");
          await deleteStorageFile(fileKey);
        }
        await prisma.privateFile.delete({ where: { id: fileId } });
        broadcastLMSEvent("MATERIALS_CHANGED");
      }
      return NextResponse.json({ success: true });
    }

    if (action === "grade_submission") {
      const { studentName, paperTitle, marks, remarks } = body;
      return NextResponse.json({
        success: true,
        message: `Marks recorded for ${studentName}: ${marks} marks with remarks.`,
      });
    }

    if (action === "reschedule_event") {
      const { eventId, scheduledDate, reason } = body;
      if (!eventId || !scheduledDate) {
        return NextResponse.json(
          { error: "Event ID and new scheduled date & time are required." },
          { status: 400 }
        );
      }

      const parsedDate = new Date(scheduledDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format provided." },
          { status: 400 }
        );
      }

      const existing = await prisma.event.findUnique({ where: { id: eventId } });
      if (!existing) {
        return NextResponse.json({ error: "Session event not found." }, { status: 404 });
      }

      let updatedDesc = existing.description || "";
      if (reason && reason.trim()) {
        updatedDesc = `${updatedDesc}\n\n[Rescheduled by Student: ${reason.trim()}]`.trim();
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          dueDate: parsedDate,
          description: updatedDesc,
          status: "SCHEDULED",
          endedAt: null,
        },
        include: {
          course: true,
          user: true,
        },
      });

      broadcastLMSEvent("EVENTS_CHANGED");

      return NextResponse.json({
        success: true,
        message: "Class session rescheduled successfully.",
        event: updatedEvent,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Dashboard POST error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
