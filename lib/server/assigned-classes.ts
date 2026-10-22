import { prisma } from "@/lib/prisma";

/**
 * Checks if a student already has active, scheduled, or upcoming classes/trials/enrollments assigned.
 * When true, students cannot modify their study availability to prevent timetable conflicts.
 */
export async function hasStudentAssignedClasses(studentId: string): Promise<{
  hasAssignedClasses: boolean;
  count: number;
  activeClasses: Array<{
    id: string;
    title: string;
    dueDate: Date;
    courseTitle?: string | null;
  }>;
}> {
  if (!studentId) {
    return { hasAssignedClasses: false, count: 0, activeClasses: [] };
  }

  const activeEvents = await prisma.event.findMany({
    where: {
      userId: studentId,
      status: { in: ["SCHEDULED", "LIVE", "PENDING_APPROVAL"] as any },
      endedAt: null,
    },
    include: {
      course: { select: { title: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const activeEnrollments = await prisma.classEnrollmentRequest.findMany({
    where: {
      studentId,
      status: "CONFIRMED",
    },
    include: {
      course: { select: { title: true } },
    },
  });

  const activeTrials = await prisma.trialRequest.findMany({
    where: {
      studentId,
      status: { in: ["CONFIRMED", "PENDING_APPROVAL"] as any },
      actualEndTime: null,
    },
    include: {
      course: { select: { title: true } },
    },
  });

  const totalCount = activeEvents.length + activeEnrollments.length + activeTrials.length;

  const activeClasses = [
    ...activeEvents.map((e) => ({
      id: e.id,
      title: e.title,
      dueDate: e.dueDate,
      courseTitle: e.course?.title,
    })),
    ...activeTrials.map((t) => ({
      id: t.id,
      title: `1-on-1 Trial: ${t.course?.title || t.topic || "Session"}`,
      dueDate: t.preferredDate,
      courseTitle: t.course?.title,
    })),
  ];

  return {
    hasAssignedClasses: totalCount > 0,
    count: totalCount,
    activeClasses,
  };
}

/**
 * Checks if a tutor already has active, scheduled, or upcoming classes/trials/enrollments assigned.
 * When true, tutors cannot modify their availability to prevent scheduling conflicts with enrolled students.
 */
export async function hasTutorAssignedClasses(tutorId: string): Promise<{
  hasAssignedClasses: boolean;
  count: number;
  activeClasses: Array<{
    id: string;
    title: string;
    dueDate: Date;
    courseTitle?: string | null;
  }>;
}> {
  if (!tutorId) {
    return { hasAssignedClasses: false, count: 0, activeClasses: [] };
  }

  const activeEvents = await prisma.event.findMany({
    where: {
      OR: [
        { requestedBy: tutorId },
        { userId: tutorId },
        { course: { tutorId } },
      ],
      status: { in: ["SCHEDULED", "LIVE", "PENDING_APPROVAL"] as any },
      endedAt: null,
    },
    include: {
      course: { select: { title: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const activeEnrollments = await prisma.classEnrollmentRequest.findMany({
    where: {
      tutorId,
      status: "CONFIRMED",
    },
    include: {
      course: { select: { title: true } },
    },
  });

  const activeTrials = await prisma.trialRequest.findMany({
    where: {
      OR: [{ tutorId }, { course: { tutorId } }],
      status: { in: ["CONFIRMED", "PENDING_APPROVAL"] as any },
      actualEndTime: null,
    },
    include: {
      course: { select: { title: true } },
    },
  });

  const totalCount = activeEvents.length + activeEnrollments.length + activeTrials.length;

  const activeClasses = [
    ...activeEvents.map((e) => ({
      id: e.id,
      title: e.title,
      dueDate: e.dueDate,
      courseTitle: e.course?.title,
    })),
    ...activeTrials.map((t) => ({
      id: t.id,
      title: `1-on-1 Trial: ${t.course?.title || t.topic || "Session"}`,
      dueDate: t.preferredDate,
      courseTitle: t.course?.title,
    })),
  ];

  return {
    hasAssignedClasses: totalCount > 0,
    count: totalCount,
    activeClasses,
  };
}
