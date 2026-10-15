import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { broadcastLMSEvent } from "@/lib/events";
import { Role } from "@prisma/client";
import {
  DEFAULT_TIMEZONE,
  getRegionalTimezone,
  getDatePartsInTimezone,
  createDateFromTimezoneParts,
  formatTimeInTimezone,
  formatDateInTimezone,
  getDualTimeDisplay,
} from "@/lib/timezones";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  return 60;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reqTutorId = searchParams.get("tutorId");
    const reqCourseId = searchParams.get("courseId");
    let reqStudentId = searchParams.get("studentId");
    const trialId = searchParams.get("trialId");
    const requestedTimezone = searchParams.get("timezone") || searchParams.get("targetTimezone");
    const daysCount = Math.min(Math.max(parseInt(searchParams.get("days") || "14", 10), 1), 30);

    let resolvedTutorId = reqTutorId;
    let resolvedStudentId = reqStudentId;

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

    if (!resolvedTutorId && reqCourseId) {
      const course = await prisma.course.findUnique({
        where: { id: reqCourseId },
        select: { tutorId: true },
      });
      if (course) {
        resolvedTutorId = course.tutorId;
      }
    }

    if (!resolvedTutorId) {
      const auth = await getAuthenticatedUser(request);
      if (auth.user && (auth.user.role === Role.TUTOR || auth.user.role === Role.INSTRUCTOR)) {
        resolvedTutorId = auth.user.id;
      }
    }

    if (!resolvedTutorId) {
      const firstTutor = await prisma.user.findFirst({
        where: { role: { in: [Role.TUTOR, Role.INSTRUCTOR] } },
        select: { id: true },
      });
      resolvedTutorId = firstTutor?.id || null;
    }

    if (!resolvedTutorId) {
      return NextResponse.json(
        { error: "No tutor found." },
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
        country: true,
        timezone: true,
      },
    });

    if (!tutor) {
      return NextResponse.json({ error: "Tutor not found." }, { status: 404 });
    }

    const tutorTimezone = tutor.timezone || getRegionalTimezone(tutor.country).id || DEFAULT_TIMEZONE;
    const viewerTimezone = requestedTimezone ? getRegionalTimezone(requestedTimezone).id : tutorTimezone;

    let studentData: any = null;
    let studentTimezone = viewerTimezone;
    if (resolvedStudentId) {
      const sUser = await prisma.user.findUnique({
        where: { id: resolvedStudentId },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          phone: true,
          country: true,
          timezone: true,
        },
      });
      if (sUser) {
        studentTimezone = sUser.timezone || getRegionalTimezone(sUser.country).id || viewerTimezone;
        const sAvail = await prisma.studentAvailability.findMany({
          where: { studentId: resolvedStudentId, isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        });
        studentData = {
          ...sUser,
          timezone: studentTimezone,
          availabilities: sAvail,
        };
      }
    }

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

    const tutorCourses = await prisma.course.findMany({
      where: { tutorId: resolvedTutorId },
      select: { id: true },
    });
    const tutorCourseIds = tutorCourses.map((c) => c.id);

    const now = new Date();
    const nowTutorParts = getDatePartsInTimezone(now, tutorTimezone);
    const rangeStart = createDateFromTimezoneParts(nowTutorParts.dateStr, "00:00", tutorTimezone);
    const rangeEnd = new Date(rangeStart.getTime() + (daysCount + 1) * 24 * 60 * 60 * 1000);

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
        ...(trialId ? { id: { not: trialId } } : {}),
      },
      include: {
        course: {
          select: { id: true, title: true, subjectCode: true },
        },
      },
      orderBy: { preferredDate: "asc" },
    });

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
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      busyIntervals.push({
        start,
        end,
        type: "TRIAL",
        title: `1-on-1 Free Trial: ${tr.studentName}`,
        id: tr.id,
        courseTitle: tr.course?.title,
      });
    });

    const viewerDaysMap = new Map<
      string,
      {
        date: string;
        dateLabel: string;
        dayOfWeek: number;
        slots: Array<any>;
      }
    >();

    const viewerNowParts = getDatePartsInTimezone(now, viewerTimezone);
    const viewerBaseDate = createDateFromTimezoneParts(viewerNowParts.dateStr, "00:00", viewerTimezone);

    for (let dayOffset = 0; dayOffset < daysCount; dayOffset++) {
      const dayMoment = new Date(viewerBaseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000);
      const parts = getDatePartsInTimezone(dayMoment, viewerTimezone);
      const dLabel = formatDateInTimezone(dayMoment, viewerTimezone, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      viewerDaysMap.set(parts.dateStr, {
        date: parts.dateStr,
        dateLabel: dLabel,
        dayOfWeek: parts.dayOfWeek,
        slots: [],
      });
    }

    for (let dayOffset = 0; dayOffset < daysCount + 1; dayOffset++) {
      const dayMomentInTutorTz = new Date(rangeStart.getTime() + dayOffset * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000);
      const tutorDayParts = getDatePartsInTimezone(dayMomentInTutorTz, tutorTimezone);
      const tutorDateStr = tutorDayParts.dateStr;
      const tutorDayOfWeek = tutorDayParts.dayOfWeek;

      let windows = rawAvailabilities.filter((av) => {
        if (av.specificDate) {
          const specParts = getDatePartsInTimezone(av.specificDate, av.timezone || tutorTimezone);
          return specParts.dateStr === tutorDateStr;
        }
        if (av.isRecurring && av.dayOfWeek !== null) {
          return av.dayOfWeek === tutorDayOfWeek;
        }
        return false;
      });

      if (rawAvailabilities.length === 0) {
        if (tutorDayOfWeek >= 1 && tutorDayOfWeek <= 5) {
          windows = [
            { startTime: "09:00", endTime: "12:00", title: "Morning Consultation", timezone: tutorTimezone },
            { startTime: "14:00", endTime: "18:00", title: "Afternoon Live Classes", timezone: tutorTimezone },
          ] as any;
        } else if (tutorDayOfWeek === 6) {
          windows = [
            { startTime: "10:00", endTime: "14:00", title: "Weekend Individual Class", timezone: tutorTimezone },
          ] as any;
        }
      }

      for (const win of windows) {
        const winTimezone = win.timezone || tutorTimezone;
        const [startH, startM] = win.startTime.split(":").map(Number);
        const [endH, endM] = win.endTime.split(":").map(Number);

        let curMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        while (curMinutes + 30 <= endMinutes) {
          const pad = (n: number) => String(n).padStart(2, "0");
          const curTimeStr = `${pad(Math.floor(curMinutes / 60))}:${pad(curMinutes % 60)}`;

          const slotStart = createDateFromTimezoneParts(tutorDateStr, curTimeStr, winTimezone);
          const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

          const isPast = slotStart.getTime() < Date.now();

          let conflict: any = null;
          for (const busy of busyIntervals) {
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

          let matchesStudentAvailability = false;
          if (studentData && studentData.availabilities.length > 0) {
            const studentParts = getDatePartsInTimezone(slotStart, studentTimezone);
            const slotStudentMinutes = studentParts.hour * 60 + studentParts.minute;

            for (const sAv of studentData.availabilities) {
              const sAvTz = sAv.timezone || studentTimezone;
              let dayMatch = false;

              if (sAv.specificDate) {
                const sDateParts = getDatePartsInTimezone(sAv.specificDate, sAvTz);
                dayMatch = sDateParts.dateStr === studentParts.dateStr;
              } else if (sAv.isRecurring && sAv.dayOfWeek !== null) {
                dayMatch = sAv.dayOfWeek === studentParts.dayOfWeek;
              }

              if (dayMatch) {
                const [sH, sM] = sAv.startTime.split(":").map(Number);
                const [eH, eM] = sAv.endTime.split(":").map(Number);
                const sStartMin = sH * 60 + sM;
                const sEndMin = eH * 60 + eM;
                if (slotStudentMinutes >= sStartMin && slotStudentMinutes + 30 <= sEndMin) {
                  matchesStudentAvailability = true;
                  break;
                }
              }
            }
          }

          const timeDisplay = formatTimeInTimezone(slotStart, viewerTimezone);
          const tutorTimeDisplay = formatTimeInTimezone(slotStart, tutorTimezone);
          const dualTime = getDualTimeDisplay(slotStart, viewerTimezone, tutorTimezone);

          const viewerSlotParts = getDatePartsInTimezone(slotStart, viewerTimezone);
          let targetDay = viewerDaysMap.get(viewerSlotParts.dateStr);

          if (!targetDay) {
            const newLabel = formatDateInTimezone(slotStart, viewerTimezone, {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            targetDay = {
              date: viewerSlotParts.dateStr,
              dateLabel: newLabel,
              dayOfWeek: viewerSlotParts.dayOfWeek,
              slots: [],
            };
            viewerDaysMap.set(viewerSlotParts.dateStr, targetDay);
          }

          targetDay.slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            timeDisplay,
            tutorTimeDisplay,
            viewerTimezone,
            tutorTimezone,
            dualTime,
            isAvailable,
            isPast,
            matchesStudentAvailability,
            conflict,
            windowTitle: win.title || undefined,
          });

          curMinutes += 30;
        }
      }
    }

    const daysData = Array.from(viewerDaysMap.values())
      .map((day) => {
        day.slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const uniqueSlots: typeof day.slots = [];
        const seenStarts = new Set<string>();
        for (const s of day.slots) {
          if (!seenStarts.has(s.startTime)) {
            seenStarts.add(s.startTime);
            uniqueSlots.push(s);
          }
        }

        return {
          date: day.date,
          dateLabel: day.dateLabel,
          dayOfWeek: day.dayOfWeek,
          hasAvailableSlots: uniqueSlots.some((s) => s.isAvailable),
          totalSlots: uniqueSlots.length,
          availableSlotsCount: uniqueSlots.filter((s) => s.isAvailable).length,
          conflictSlotsCount: uniqueSlots.filter((s) => s.conflict).length,
          slots: uniqueSlots,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, daysCount);

    return NextResponse.json({
      success: true,
      tutor,
      tutorTimezone,
      viewerTimezone,
      tutorRegion: getRegionalTimezone(tutorTimezone),
      viewerRegion: getRegionalTimezone(viewerTimezone),
      student: studentData,
      availabilities: rawAvailabilities,
      scheduledClasses: scheduledClasses.map((c) => ({
        id: c.id,
        title: c.title,
        dueDate: c.dueDate,
        dueDateFormattedViewer: formatTimeInTimezone(c.dueDate, viewerTimezone),
        dueDateFormattedTutor: formatTimeInTimezone(c.dueDate, tutorTimezone),
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

    if (action === "update_timezone") {
      const { timezone } = body;
      if (!timezone) {
        return NextResponse.json({ error: "Timezone is required." }, { status: 400 });
      }

      const validTz = getRegionalTimezone(timezone).id;
      await prisma.user.update({
        where: { id: tutor.id },
        data: { timezone: validTz },
      });

      broadcastLMSEvent("TUTOR_AVAILABILITY_CHANGED", { tutorId: tutor.id });

      return NextResponse.json({
        success: true,
        message: `Regional timezone updated to ${validTz}.`,
        timezone: validTz,
      });
    }

    if (action === "set_availability" || action === "batch_add") {
      const slots = Array.isArray(body.slots) ? body.slots : [body];

      if (!slots || slots.length === 0) {
        return NextResponse.json(
          { error: "At least one availability slot is required." },
          { status: 400 }
        );
      }

      const tutorUser = await prisma.user.findUnique({
        where: { id: tutor.id },
        select: { timezone: true, country: true },
      });
      const defaultTz = tutorUser?.timezone || getRegionalTimezone(tutorUser?.country).id || DEFAULT_TIMEZONE;

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
          timezone = defaultTz,
        } = s;

        const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        if (!timePattern.test(startTime?.trim()) || !timePattern.test(endTime?.trim())) {
          return NextResponse.json(
            { error: "Start and end times must use the HH:mm format." },
            { status: 400 }
          );
        }

        if (startTime.trim() >= endTime.trim()) {
          return NextResponse.json(
            { error: "End time must be later than start time." },
            { status: 400 }
          );
        }

        const newSlot = await prisma.tutorAvailability.create({
          data: {
            tutorId: tutor.id,
            dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? Number(dayOfWeek) : null,
            specificDate: specificDate ? new Date(specificDate) : null,
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            timezone: timezone || defaultTz,
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

    if (action === "delete_availability") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "Slot ID is required." }, { status: 400 });
      }

      await prisma.tutorAvailability.deleteMany({
        where: {
          id,
          ...(tutor.role !== Role.ADMIN ? { tutorId: tutor.id } : {}),
        },
      });

      broadcastLMSEvent("TUTOR_AVAILABILITY_CHANGED", { tutorId: tutor.id });

      return NextResponse.json({
        success: true,
        message: "Availability slot removed.",
      });
    }

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

    if (action === "apply_preset") {
      const { preset, timezone } = body;

      const tutorUser = await prisma.user.findUnique({
        where: { id: tutor.id },
        select: { timezone: true, country: true },
      });
      const activeTz = timezone || tutorUser?.timezone || getRegionalTimezone(tutorUser?.country).id || DEFAULT_TIMEZONE;

      if (body.replaceExisting) {
        await prisma.tutorAvailability.deleteMany({
          where: { tutorId: tutor.id, isRecurring: true },
        });
      }

      const slotsToInsert = [];

      if (preset === "WEEKDAYS" || preset === "FULL_SCHEDULE") {
        for (let d = 1; d <= 5; d++) {
          slotsToInsert.push({
            tutorId: tutor.id,
            dayOfWeek: d,
            startTime: "10:00",
            endTime: "12:00",
            timezone: activeTz,
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
            timezone: activeTz,
            isRecurring: true,
            isActive: true,
            title: "Afternoon Classes & Consultation",
            slotType: "ALL",
          });
        }
      }

      if (preset === "WEEKENDS" || preset === "FULL_SCHEDULE") {
        slotsToInsert.push({
          tutorId: tutor.id,
          dayOfWeek: 6,
          startTime: "09:30",
          endTime: "13:30",
          timezone: activeTz,
          isRecurring: true,
          isActive: true,
          title: "Weekend Individual Class Window",
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
        message: `Applied ${preset} schedule preset (${slotsToInsert.length} slots generated in ${activeTz}).`,
      });
    }

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
