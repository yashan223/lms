import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { broadcastLMSEvent } from "@/lib/events";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper to calculate event duration in minutes
function getEventDurationMinutes(title: string, description?: string | null): number {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (text.includes("2h") || text.includes("2 hours") || text.includes("2-hour") || text.includes("120 min")) {
    return 120;
  }
  if (text.includes("1.5h") || text.includes("1.5 hour") || text.includes("90 min")) {
    return 90;
  }
  if (text.includes("1h") || text.includes("1 hour") || text.includes("60 min")) {
    return 60;
  }
  if (text.includes("45 min") || text.includes("45m")) {
    return 45;
  }
  if (text.includes("30 min") || text.includes("30m")) {
    return 30;
  }
  return 60; // default 60 mins for class sessions
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reqTutorId = searchParams.get("tutorId");
    const reqCourseId = searchParams.get("courseId");
    let reqStudentId = searchParams.get("studentId");
    const trialId = searchParams.get("trialId");
    const daysCount = Math.min(Math.max(parseInt(searchParams.get("days") || "14", 10), 1), 30);

    let resolvedTutorId = reqTutorId;
    let resolvedStudentId = reqStudentId;

    // If trialId provided, resolve tutor and student from trial
    if (trialId) {
      const trial = await prisma.trialRequest.findUnique({
        where: { id: trialId },
        include: { course: true, tutor: true, student: true },
      });
      if (trial) {
        if (!resolvedTutorId) resolvedTutorId = trial.tutorId || trial.course?.tutorId || null;
        if (!resolvedStudentId) resolvedStudentId = trial.studentId || null;
      }
    }

    // If courseId provided, resolve tutor from course
    if (!resolvedTutorId && reqCourseId) {
      const course = await prisma.course.findUnique({
        where: { id: reqCourseId },
        select: { tutorId: true },
      });
      if (course) {
        resolvedTutorId = course.tutorId;
      }
    }

    // If still not resolved, check auth
    if (!resolvedTutorId) {
      const auth = await getAuthenticatedUser(request);
      if (auth.user && (auth.user.role === Role.TUTOR || auth.user.role === Role.INSTRUCTOR)) {
        resolvedTutorId = auth.user.id;
      }
    }

    // Fallback to first tutor in database
    if (!resolvedTutorId) {
      const firstTutor = await prisma.user.findFirst({
        where: { role: { in: [Role.TUTOR, Role.INSTRUCTOR] } },
        select: { id: true },
      });
      resolvedTutorId = firstTutor?.id || null;
    }

    if (!resolvedTutorId) {
      return NextResponse.json(
        { error: "No faculty tutor found." },
        { status: 404 }
      );
    }

    const tutor = await prisma.user.findUnique({
      where: { id: resolvedTutorId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        headline: true,
        bio: true,
        phone: true,
      },
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tutor not found." }, { status: 404 });
    }

    // Optional: Fetch student availability if studentId resolved
    let studentData: any = null;
    if (resolvedStudentId) {
      const sUser = await prisma.user.findUnique({
        where: { id: resolvedStudentId },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          phone: true,
        },
      });
      if (sUser) {
        const sAvail = await prisma.studentAvailability.findMany({
          where: { studentId: resolvedStudentId, isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        });
        studentData = {
          ...sUser,
          availabilities: sAvail,
        };
      }
    }

    // 1. Fetch tutor's configured availability slots
    const rawAvailabilities = await prisma.tutorAvailability.findMany({
      where: {
        tutorId: resolvedTutorId,
        isActive: true,
      },
      include: {
        course: {
          select: { id: true, title: true, subjectCode: true },
        },
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });

    // 2. Fetch all tutor's courses
    const tutorCourses = await prisma.course.findMany({
      where: { tutorId: resolvedTutorId },
      select: { id: true },
    });
    const tutorCourseIds = tutorCourses.map((c) => c.id);

    // 3. Fetch all currently scheduled events/classes for this tutor
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeEnd = new Date(rangeStart.getTime() + daysCount * 24 * 60 * 60 * 1000);

    const scheduledClasses = await prisma.event.findMany({
      where: {
        OR: [
          { userId: resolvedTutorId },
          { requestedBy: resolvedTutorId },
          { courseId: { in: tutorCourseIds } },
          { course: { tutorId: resolvedTutorId } },
        ],
        dueDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        status: { notIn: ["CANCELLED", "REJECTED"] as any },
      },
      include: {
        course: {
          select: { id: true, title: true, subjectCode: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // 4. Fetch all confirmed or pending trials for this tutor
    const scheduledTrials = await prisma.trialRequest.findMany({
      where: {
        OR: [
          { tutorId: resolvedTutorId },
          { courseId: { in: tutorCourseIds } },
        ],
        preferredDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        status: { notIn: ["CANCELLED", "REJECTED"] as any },
        ...(trialId ? { id: { not: trialId } } : {}), // Exclude current trial if rescheduling
      },
      include: {
        course: {
          select: { id: true, title: true, subjectCode: true },
        },
      },
      orderBy: { preferredDate: "asc" },
    });

    // Format scheduled busy intervals
    const busyIntervals: Array<{
      start: Date;
      end: Date;
      type: "CLASS" | "TRIAL";
      title: string;
      id: string;
      courseTitle?: string;
    }> = [];

    scheduledClasses.forEach((ev) => {
      const start = new Date(ev.dueDate);
      const durationMin = getEventDurationMinutes(ev.title, ev.description);
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      busyIntervals.push({
        start,
        end,
        type: "CLASS",
        title: ev.title,
        id: ev.id,
        courseTitle: ev.course?.title,
      });
    });

    scheduledTrials.forEach((tr) => {
      const start = new Date(tr.preferredDate);
      const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min trial
      busyIntervals.push({
        start,
        end,
        type: "TRIAL",
        title: `1-on-1 Free Trial: ${tr.studentName}`,
        id: tr.id,
        courseTitle: tr.course?.title,
      });
    });

    // 5. Compute concrete days and time slots
    const daysData = [];

    for (let dayOffset = 0; dayOffset < daysCount; dayOffset++) {
      const currentDate = new Date(rangeStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const currentDayOfWeek = currentDate.getDay(); // 0 = Sun, 1 = Mon ...
      const dateStr = currentDate.toISOString().split("T")[0];

      // Find matching availability windows for this date
      let windows = rawAvailabilities.filter((av) => {
        if (av.specificDate) {
          return av.specificDate.toISOString().split("T")[0] === dateStr;
        }
        if (av.isRecurring && av.dayOfWeek !== null) {
          return av.dayOfWeek === currentDayOfWeek;
        }
        return false;
      });

      // Default fallback availability if tutor hasn't defined custom slots yet:
      // Mon - Fri: 09:00-12:00 and 14:00-18:00
      // Sat: 10:00-14:00
      if (rawAvailabilities.length === 0) {
        if (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) {
          windows = [
            { startTime: "09:00", endTime: "12:00", title: "Morning Consultation" },
            { startTime: "14:00", endTime: "18:00", title: "Afternoon Live Classes" },
          ] as any;
        } else if (currentDayOfWeek === 6) {
          windows = [
            { startTime: "10:00", endTime: "14:00", title: "Weekend Masterclass" },
          ] as any;
        }
      }

      // Generate 30-minute intervals within each window
      const slots: Array<{
        startTime: string; // ISO string
        endTime: string;   // ISO string
        timeDisplay: string;
        isAvailable: boolean;
        isPast: boolean;
        matchesStudentAvailability?: boolean;
        conflict?: {
          type: "CLASS" | "TRIAL";
          id: string;
          title: string;
          courseTitle?: string;
          start: string;
          end: string;
        } | null;
        windowTitle?: string;
      }> = [];

      windows.forEach((win) => {
        const [startH, startM] = win.startTime.split(":").map(Number);
        const [endH, endM] = win.endTime.split(":").map(Number);

        let curMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        while (curMinutes + 30 <= endMinutes) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(Math.floor(curMinutes / 60), curMinutes % 60, 0, 0);

          const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

          // Check if in past
          const isPast = slotStart.getTime() < Date.now();

          // Check for conflicts with scheduled classes or trials
          let conflict: any = null;
          for (const busy of busyIntervals) {
            // Overlap condition: slotStart < busy.end && slotEnd > busy.start
            if (slotStart.getTime() < busy.end.getTime() && slotEnd.getTime() > busy.start.getTime()) {
              conflict = {
                type: busy.type,
                id: busy.id,
                title: busy.title,
                courseTitle: busy.courseTitle,
                start: busy.start.toISOString(),
                end: busy.end.toISOString(),
              };
              break;
            }
          }

          const isAvailable = !isPast && !conflict;

          // Check if matches student availability
          let matchesStudentAvailability = false;
          if (studentData && studentData.availabilities.length > 0) {
            for (const sAv of studentData.availabilities) {
              let dayMatch = false;
              if (sAv.specificDate) {
                dayMatch = sAv.specificDate.toISOString().split("T")[0] === dateStr;
              } else if (sAv.isRecurring && sAv.dayOfWeek !== null) {
                dayMatch = sAv.dayOfWeek === currentDayOfWeek;
              }
              if (dayMatch) {
                const [sH, sM] = sAv.startTime.split(":").map(Number);
                const [eH, eM] = sAv.endTime.split(":").map(Number);
                const sStartMin = sH * 60 + sM;
                const sEndMin = eH * 60 + eM;
                if (curMinutes >= sStartMin && curMinutes + 30 <= sEndMin) {
                  matchesStudentAvailability = true;
                  break;
                }
              }
            }
          }

          const timeDisplay = slotStart.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            timeDisplay,
            isAvailable,
            isPast,
            matchesStudentAvailability,
            conflict,
            windowTitle: win.title || undefined,
          });

          curMinutes += 30;
        }
      });

      // Sort slots by start time
      slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      daysData.push({
        date: dateStr,
        dateLabel: currentDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        dayOfWeek: currentDayOfWeek,
        hasAvailableSlots: slots.some((s) => s.isAvailable),
        totalSlots: slots.length,
        availableSlotsCount: slots.filter((s) => s.isAvailable).length,
        conflictSlotsCount: slots.filter((s) => s.conflict).length,
        slots,
      });
    }

    return NextResponse.json({
      success: true,
      tutor,
      student: studentData,
      availabilities: rawAvailabilities,
      scheduledClasses: scheduledClasses.map((c) => ({
        id: c.id,
        title: c.title,
        dueDate: c.dueDate,
        durationMin: getEventDurationMinutes(c.title, c.description),
        course: c.course,
      })),
      scheduledTrialsCount: scheduledTrials.length,
      days: daysData,
    });
  } catch (error: any) {
    console.error("Tutor Availability GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch tutor availability." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request, [Role.TUTOR, Role.ADMIN]);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const tutor = auth.user;
    const body = await request.json();
    const { action } = body;

    // 1. Batch add or set multiple availability times
    if (action === "set_availability" || action === "batch_add") {
      const slots = Array.isArray(body.slots) ? body.slots : [body];

      if (!slots || slots.length === 0) {
        return NextResponse.json(
          { error: "At least one availability slot is required." },
          { status: 400 }
        );
      }

      const createdList = [];

      for (const s of slots) {
        const {
          dayOfWeek,
          specificDate,
          startTime,
          endTime,
          isRecurring = true,
          title,
          courseId,
          slotType = "ALL",
        } = s;

        if (!startTime || !endTime) {
          continue;
        }

        const newSlot = await prisma.tutorAvailability.create({
          data: {
            tutorId: tutor.id,
            dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? Number(dayOfWeek) : null,
            specificDate: specificDate ? new Date(specificDate) : null,
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            isRecurring: Boolean(isRecurring),
            isActive: true,
            title: title?.trim() || null,
            courseId: courseId || null,
            slotType: slotType || "ALL",
          },
        });

        createdList.push(newSlot);
      }

      broadcastLMSEvent("TUTOR_AVAILABILITY_CHANGED", { tutorId: tutor.id });

      return NextResponse.json({
        success: true,
        message: `Successfully configured ${createdList.length} available time slots.`,
        created: createdList,
      });
    }

    // 2. Delete availability slot
    if (action === "delete_availability") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "Slot ID is required." }, { status: 400 });
      }

      await prisma.tutorAvailability.deleteMany({
        where: {
          id,
          tutorId: tutor.id,
        },
      });

      broadcastLMSEvent("TUTOR_AVAILABILITY_CHANGED", { tutorId: tutor.id });

      return NextResponse.json({
        success: true,
        message: "Availability slot removed.",
      });
    }

    // 3. Toggle slot active status
    if (action === "toggle_availability") {
      const { id, isActive } = body;
      if (!id) {
        return NextResponse.json({ error: "Slot ID is required." }, { status: 400 });
      }

      const existing = await prisma.tutorAvailability.findUnique({ where: { id } });
      if (!existing || existing.tutorId !== tutor.id) {
        return NextResponse.json({ error: "Slot not found or unauthorized." }, { status: 404 });
      }

      const updated = await prisma.tutorAvailability.update({
        where: { id },
        data: {
          isActive: isActive !== undefined ? Boolean(isActive) : !existing.isActive,
        },
      });

      broadcastLMSEvent("TUTOR_AVAILABILITY_CHANGED", { tutorId: tutor.id });

      return NextResponse.json({
        success: true,
        message: `Availability slot ${updated.isActive ? "activated" : "deactivated"}.`,
        slot: updated,
      });
    }

    // 4. Quick preset generator
    if (action === "apply_preset") {
      const { preset } = body; // "WEEKDAYS", "WEEKENDS", "FULL_SCHEDULE"

      // Clear existing recurring slots if requested
      if (body.replaceExisting) {
        await prisma.tutorAvailability.deleteMany({
          where: { tutorId: tutor.id, isRecurring: true },
        });
      }

      const slotsToInsert = [];

      if (preset === "WEEKDAYS" || preset === "FULL_SCHEDULE") {
        // Mon (1) to Fri (5): 10:00 - 12:00, 14:00 - 17:00
        for (let d = 1; d <= 5; d++) {
          slotsToInsert.push({
            tutorId: tutor.id,
            dayOfWeek: d,
            startTime: "10:00",
            endTime: "12:00",
            isRecurring: true,
            isActive: true,
            title: "Morning Academic Clinic",
            slotType: "ALL",
          });
          slotsToInsert.push({
            tutorId: tutor.id,
            dayOfWeek: d,
            startTime: "14:00",
            endTime: "17:00",
            isRecurring: true,
            isActive: true,
            title: "Afternoon Classes & Consultation",
            slotType: "ALL",
          });
        }
      }

      if (preset === "WEEKENDS" || preset === "FULL_SCHEDULE") {
        // Sat (6): 09:30 - 13:30
        slotsToInsert.push({
          tutorId: tutor.id,
          dayOfWeek: 6,
          startTime: "09:30",
          endTime: "13:30",
          isRecurring: true,
          isActive: true,
          title: "Weekend Masterclass Window",
          slotType: "ALL",
        });
      }

      if (slotsToInsert.length > 0) {
        await prisma.tutorAvailability.createMany({
          data: slotsToInsert,
        });
      }

      broadcastLMSEvent("TUTOR_AVAILABILITY_CHANGED", { tutorId: tutor.id });

      return NextResponse.json({
        success: true,
        message: `Applied ${preset} schedule preset (${slotsToInsert.length} slots generated).`,
      });
    }

    // 5. Clear all availability slots
    if (action === "clear_all") {
      await prisma.tutorAvailability.deleteMany({
        where: { tutorId: tutor.id },
      });

      broadcastLMSEvent("TUTOR_AVAILABILITY_CHANGED", { tutorId: tutor.id });

      return NextResponse.json({
        success: true,
        message: "All availability slots cleared.",
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Tutor Availability POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update tutor availability." },
      { status: 500 }
    );
  }
}
