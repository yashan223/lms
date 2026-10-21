import { prisma } from "@/lib/prisma";
import { broadcastLMSEvent } from "@/lib/events";
import { sendClassReminderEmail } from "@/lib/email";
import { formatTimeInTimezone, formatDateInTimezone, DEFAULT_TIMEZONE } from "@/lib/timezones";

export interface ReminderRunResult {
  checkedCount: number;
  remindedCount: number;
  eventsReminded: Array<{
    eventId: string;
    eventTitle: string;
    studentEmail: string;
    scheduledFor: string;
  }>;
  errors: string[];
}

/**
 * Checks for upcoming classes scheduled approximately 30 minutes from now (20 - 35 minute window)
 * and sends automated 30-minute in-app alerts and direct student inbox email reminders.
 */
export async function checkAndDispatchClassReminders(): Promise<ReminderRunResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 20 * 60 * 1000); // 20 mins from now
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);   // 35 mins from now

  const result: ReminderRunResult = {
    checkedCount: 0,
    remindedCount: 0,
    eventsReminded: [],
    errors: [],
  };

  try {
    const upcomingEvents = await prisma.event.findMany({
      where: {
        status: "SCHEDULED",
        reminderSent: false,
        dueDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        course: {
          include: {
            tutor: {
              select: {
                id: true,
                name: true,
                email: true,
                timezone: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            timezone: true,
          },
        },
        enrollmentRequest: {
          select: {
            classType: true,
            hoursPerWeek: true,
            duration: true,
          },
        },
      },
    });

    result.checkedCount = upcomingEvents.length;

    for (const event of upcomingEvents) {
      try {
        let student = event.user;
        let tutor = event.course?.tutor || null;

        if (!tutor && event.requestedBy) {
          tutor = await prisma.user.findUnique({
            where: { id: event.requestedBy },
            select: { id: true, name: true, email: true, timezone: true },
          });
        }

        // If event.user is not a student (or is null), try course enrollments
        if (!student || student.role !== "STUDENT") {
          if (event.courseId) {
            const firstEnrollment = await prisma.enrollment.findFirst({
              where: { courseId: event.courseId },
              include: {
                user: {
                  select: { id: true, name: true, email: true, role: true, timezone: true },
                },
              },
            });
            if (firstEnrollment?.user) {
              student = firstEnrollment.user;
            }
          }
        }

        if (!student || !student.email) {
          // If no student can be found to remind, mark reminderSent to avoid stuck loop
          await prisma.event.update({
            where: { id: event.id },
            data: { reminderSent: true, reminderSentAt: new Date() },
          });
          continue;
        }

        const studentTz = student.timezone || DEFAULT_TIMEZONE;
        const timeFormatted = formatTimeInTimezone(event.dueDate, studentTz, { includeAbbr: true });
        const dateFormatted = formatDateInTimezone(event.dueDate, studentTz, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const fullTimeStr = `${dateFormatted} at ${timeFormatted}`;
        const tutorName = tutor?.name || "Your Academic Tutor";

        // 1. Create In-App Notification for Student
        await prisma.notification.create({
          data: {
            userId: student.id,
            title: "⏰ Class Starting in 30 Minutes",
            message: `Your class "${event.title}" with ${tutorName} begins in 30 minutes (${timeFormatted}). Please get ready to enter the live room!`,
            type: "WARNING",
            link: "/dashboard",
          },
        });
        broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: student.id });

        // 2. Dispatch Student Email Notification
        const emailRes = await sendClassReminderEmail({
          email: student.email,
          name: student.name,
          classTitle: event.title,
          courseTitle: event.course?.title,
          tutorName: tutorName,
          startTimeFormatted: fullTimeStr,
          meetingLink: event.meetingLink,
          classType: event.enrollmentRequest?.classType || undefined,
        });

        if (!emailRes.success) {
          console.warn(`[Class Reminder] Email delivery warning for ${student.email}:`, emailRes.error);
        }

        // 3. Create In-App Notification for Tutor if present
        if (tutor?.id) {
          await prisma.notification.create({
            data: {
              userId: tutor.id,
              title: "⏰ Upcoming Class in 30 Minutes",
              message: `Your class "${event.title}" with student ${student.name} starts in 30 minutes (${timeFormatted}).`,
              type: "INFO",
              link: "/tutor?tab=classes",
            },
          });
          broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: tutor.id });
        }

        // 4. Mark Event Reminder as Dispatched
        await prisma.event.update({
          where: { id: event.id },
          data: {
            reminderSent: true,
            reminderSentAt: new Date(),
          },
        });

        result.remindedCount++;
        result.eventsReminded.push({
          eventId: event.id,
          eventTitle: event.title,
          studentEmail: student.email,
          scheduledFor: fullTimeStr,
        });
      } catch (innerErr: any) {
        console.error(`[Class Reminder] Error processing event ${event.id}:`, innerErr);
        result.errors.push(`Event ${event.id}: ${innerErr?.message || innerErr}`);
      }
    }
  } catch (error: any) {
    console.error("[Class Reminder] Main check error:", error);
    result.errors.push(error?.message || String(error));
  }

  return result;
}
