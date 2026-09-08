import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { broadcastLMSEvent } from "@/lib/events";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let studentId = searchParams.get("studentId");

    // If not provided, try authenticated user
    if (!studentId) {
      const auth = await getAuthenticatedUser(request);
      if (auth.user) {
        studentId = auth.user.id;
      }
    }

    // If still not provided, fallback to first student
    if (!studentId) {
      const firstStudent = await prisma.user.findFirst({
        where: { role: Role.STUDENT },
        select: { id: true },
      });
      studentId = firstStudent?.id || null;
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phone: true,
        headline: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student user not found." }, { status: 404 });
    }

    const availabilities = await prisma.studentAvailability.findMany({
      where: {
        studentId,
        isActive: true,
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });

    // Student's scheduled events & classes
    const scheduledEvents = await prisma.event.findMany({
      where: {
        userId: studentId,
        status: { notIn: ["CANCELLED", "REJECTED"] as any },
      },
      include: {
        course: {
          select: { id: true, title: true, subjectCode: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json({
      success: true,
      student,
      availabilities,
      scheduledEvents,
    });
  } catch (error: any) {
    console.error("Student Availability GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch student availability." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error || "Please log in to manage your study hours." },
        { status: auth.status || 401 }
      );
    }

    const student = auth.user;
    const body = await request.json();
    const { action } = body;

    // 1. Set availability / Batch Add
    if (action === "set_availability" || action === "batch_add") {
      const slots = Array.isArray(body.slots) ? body.slots : [body];

      if (!slots || slots.length === 0) {
        return NextResponse.json(
          { error: "At least one study availability slot is required." },
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
          notes,
        } = s;

        if (!startTime || !endTime) continue;

        const newSlot = await prisma.studentAvailability.create({
          data: {
            studentId: student.id,
            dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? Number(dayOfWeek) : null,
            specificDate: specificDate ? new Date(specificDate) : null,
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            isRecurring: Boolean(isRecurring),
            isActive: true,
            title: title?.trim() || "Preferred Study & Mentoring Window",
            notes: notes?.trim() || null,
          },
        });

        createdList.push(newSlot);
      }

      broadcastLMSEvent("STUDENT_AVAILABILITY_CHANGED", { studentId: student.id });

      return NextResponse.json({
        success: true,
        message: `Configured ${createdList.length} study availability slot(s).`,
        created: createdList,
      });
    }

    // 2. Delete availability slot
    if (action === "delete_availability") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "Slot ID is required." }, { status: 400 });
      }

      await prisma.studentAvailability.deleteMany({
        where: {
          id,
          studentId: student.id,
        },
      });

      broadcastLMSEvent("STUDENT_AVAILABILITY_CHANGED", { studentId: student.id });

      return NextResponse.json({
        success: true,
        message: "Study availability slot removed.",
      });
    }

    // 3. Toggle slot active status
    if (action === "toggle_availability") {
      const { id, isActive } = body;
      if (!id) {
        return NextResponse.json({ error: "Slot ID is required." }, { status: 400 });
      }

      const existing = await prisma.studentAvailability.findUnique({ where: { id } });
      if (!existing || existing.studentId !== student.id) {
        return NextResponse.json({ error: "Slot not found or unauthorized." }, { status: 404 });
      }

      const updated = await prisma.studentAvailability.update({
        where: { id },
        data: {
          isActive: isActive !== undefined ? Boolean(isActive) : !existing.isActive,
        },
      });

      broadcastLMSEvent("STUDENT_AVAILABILITY_CHANGED", { studentId: student.id });

      return NextResponse.json({
        success: true,
        message: `Slot ${updated.isActive ? "activated" : "deactivated"}.`,
        slot: updated,
      });
    }

    // 4. Quick presets for student
    if (action === "apply_preset") {
      const { preset } = body; // "WEEKDAY_EVENINGS", "WEEKEND_STUDY", "ALL_WEEK"

      if (body.replaceExisting) {
        await prisma.studentAvailability.deleteMany({
          where: { studentId: student.id, isRecurring: true },
        });
      }

      const slotsToInsert = [];

      if (preset === "WEEKDAY_EVENINGS" || preset === "ALL_WEEK") {
        // Mon-Fri: 16:00 - 20:00
        for (let d = 1; d <= 5; d++) {
          slotsToInsert.push({
            studentId: student.id,
            dayOfWeek: d,
            startTime: "16:00",
            endTime: "20:00",
            isRecurring: true,
            isActive: true,
            title: "After-School Study & Tutoring Hours",
          });
        }
      }

      if (preset === "WEEKEND_STUDY" || preset === "ALL_WEEK") {
        // Sat (6) & Sun (0): 10:00 - 16:00
        slotsToInsert.push({
          studentId: student.id,
          dayOfWeek: 6,
          startTime: "10:00",
          endTime: "16:00",
          isRecurring: true,
          isActive: true,
          title: "Saturday Revision & Past Paper Clinic",
        });
        slotsToInsert.push({
          studentId: student.id,
          dayOfWeek: 0,
          startTime: "10:00",
          endTime: "14:00",
          isRecurring: true,
          isActive: true,
          title: "Sunday Exam Preparation Window",
        });
      }

      if (slotsToInsert.length > 0) {
        await prisma.studentAvailability.createMany({
          data: slotsToInsert,
        });
      }

      broadcastLMSEvent("STUDENT_AVAILABILITY_CHANGED", { studentId: student.id });

      return NextResponse.json({
        success: true,
        message: `Applied ${preset} study schedule (${slotsToInsert.length} slots generated).`,
      });
    }

    // 5. Clear all
    if (action === "clear_all") {
      await prisma.studentAvailability.deleteMany({
        where: { studentId: student.id },
      });

      broadcastLMSEvent("STUDENT_AVAILABILITY_CHANGED", { studentId: student.id });

      return NextResponse.json({
        success: true,
        message: "All study availability slots cleared.",
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error: any) {
    console.error("Student Availability POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update study availability." },
      { status: 500 }
    );
  }
}
