import { prisma } from "../lib/prisma";
import {
  validateStudentRescheduleEligibility,
  getStudentRescheduleQuota,
  createStudentRescheduleRequest,
  acceptRescheduleRequest,
  declineRescheduleRequest,
  MAX_STUDENT_RESCHEDULES_PER_MONTH,
  MIN_RESCHEDULE_NOTICE_HOURS,
} from "../lib/reschedule";
import { Role, EventStatus } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log("=== RUNNING CLASS RESCHEDULE WORKFLOW TEST SUITE ===\n");

  const timestamp = Date.now();
  const studentEmail = `test_reschedule_student_${timestamp}@example.com`;
  const tutorEmail = `test_reschedule_tutor_${timestamp}@example.com`;

  let student: any;
  let tutor: any;
  let course: any;
  let eventNear: any; // < 24h away
  let eventFar1: any; // > 24h away
  let eventFar2: any; // > 24h away
  let eventFar3: any; // > 24h away

  try {
    // 1. Setup Test Data
    console.log("--- Setup: Creating Test Entities ---");
    student = await prisma.user.create({
      data: {
        name: "Test Student Reschedule",
        email: studentEmail,
        passwordHash: "hashed_password",
        role: Role.STUDENT,
        timezone: "Asia/Colombo",
      },
    });

    tutor = await prisma.user.create({
      data: {
        name: "Test Tutor Reschedule",
        email: tutorEmail,
        passwordHash: "hashed_password",
        role: Role.TUTOR,
        timezone: "Asia/Colombo",
      },
    });

    course = await prisma.course.create({
      data: {
        title: "Reschedule Test Course",
        slug: `resched-${timestamp}`,
        description: "Test Course Description",
        category: "Mathematics",
        tutorId: tutor.id,
      },
    });

    const now = new Date();

    // Event 1: 12 hours from now (< 24h notice)
    const dueDate12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    eventNear = await prisma.event.create({
      data: {
        title: "Online Class (Near)",
        dueDate: dueDate12h,
        status: EventStatus.SCHEDULED,
        userId: student.id,
        courseId: course.id,
      },
    });

    // Event 2: 48 hours from now (> 24h notice)
    const dueDate48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    eventFar1 = await prisma.event.create({
      data: {
        title: "Online Class (Far 1)",
        dueDate: dueDate48h,
        status: EventStatus.SCHEDULED,
        userId: student.id,
        courseId: course.id,
      },
    });

    // Event 3: 72 hours from now (> 24h notice)
    const dueDate72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    eventFar2 = await prisma.event.create({
      data: {
        title: "Online Class (Far 2)",
        dueDate: dueDate72h,
        status: EventStatus.SCHEDULED,
        userId: student.id,
        courseId: course.id,
      },
    });

    // Event 4: 96 hours from now (> 24h notice)
    const dueDate96h = new Date(now.getTime() + 96 * 60 * 60 * 1000);
    eventFar3 = await prisma.event.create({
      data: {
        title: "Online Class (Far 3)",
        dueDate: dueDate96h,
        status: EventStatus.SCHEDULED,
        userId: student.id,
        courseId: course.id,
      },
    });

    console.log("Setup complete.\n");

    // TEST 1: Initial Quota
    console.log("--- Test 1: Initial Reschedule Quota ---");
    const initialQuota = await getStudentRescheduleQuota(student.id);
    assert(initialQuota.usedThisMonth === 0, "Initial used quota is 0");
    assert(initialQuota.maxPerMonth === 2, "Max reschedules per month is 2");
    assert(initialQuota.remainingThisMonth === 2, "Remaining reschedules this month is 2");

    // TEST 2: Notice Window (< 24h must be rejected)
    console.log("\n--- Test 2: Notice Window < 24 Hours Rejection ---");
    const requestedDate1 = new Date(now.getTime() + 120 * 60 * 60 * 1000);

    const eligibilityNear = await validateStudentRescheduleEligibility({
      studentId: student.id,
      eventId: eventNear.id,
      scheduledDate: eventNear.dueDate,
    });
    assert(eligibilityNear.allowed === false, "Eligibility correctly returns allowed=false for <24h");
    assert(eligibilityNear.code === "NOTICE_TOO_SHORT", `Eligibility returns code NOTICE_TOO_SHORT (got ${eligibilityNear.code})`);

    let createRejectedUnder24h = false;
    try {
      await createStudentRescheduleRequest({
        studentId: student.id,
        eventId: eventNear.id,
        requestedDate: requestedDate1,
        studentReason: "Need to change",
        timezone: "Asia/Colombo",
      });
    } catch (err: any) {
      createRejectedUnder24h = true;
      assert(err.code === "NOTICE_TOO_SHORT", `createStudentRescheduleRequest error code is NOTICE_TOO_SHORT (got ${err.code})`);
      assert(err.statusCode === 400, `createStudentRescheduleRequest status code is 400 (got ${err.statusCode})`);
    }
    assert(createRejectedUnder24h, "Attempt to create reschedule request for class < 24h away threw error");

    // TEST 3: Submit 1st Valid Reschedule Request
    console.log("\n--- Test 3: Submit 1st Reschedule Request (>= 24h) ---");
    const result1 = await createStudentRescheduleRequest({
      studentId: student.id,
      eventId: eventFar1.id,
      requestedDate: requestedDate1,
      studentReason: "Family event conflict",
      timezone: "Asia/Colombo",
    });

    assert(result1.request.status === "PENDING", "Request 1 status is PENDING");
    assert(result1.remainingThisMonth === 1, "Remaining slots is now 1");

    // Verify original event dueDate has NOT changed yet!
    const unchangedEvent1 = await prisma.event.findUnique({ where: { id: eventFar1.id } });
    assert(
      unchangedEvent1?.dueDate.getTime() === dueDate48h.getTime(),
      "Original class time remains UNCHANGED while request is pending"
    );

    // TEST 4: Submit 2nd Valid Reschedule Request
    console.log("\n--- Test 4: Submit 2nd Reschedule Request ---");
    const requestedDate2 = new Date(now.getTime() + 144 * 60 * 60 * 1000);
    const result2 = await createStudentRescheduleRequest({
      studentId: student.id,
      eventId: eventFar2.id,
      requestedDate: requestedDate2,
      studentReason: "Doctor appointment",
      timezone: "Asia/Colombo",
    });

    assert(result2.request.status === "PENDING", "Request 2 status is PENDING");
    assert(result2.remainingThisMonth === 0, "Remaining slots is now 0");

    // TEST 5: Monthly Limit Enforcement (3rd Attempt Must Be Blocked)
    console.log("\n--- Test 5: Monthly Limit Reached (3rd Attempt Rejection) ---");
    let limitBlocked = false;
    try {
      const requestedDate3 = new Date(now.getTime() + 168 * 60 * 60 * 1000);
      await createStudentRescheduleRequest({
        studentId: student.id,
        eventId: eventFar3.id,
        requestedDate: requestedDate3,
        studentReason: "Third attempt",
        timezone: "Asia/Colombo",
      });
    } catch (err: any) {
      limitBlocked = true;
      assert(err.code === "MONTHLY_LIMIT_REACHED", `Error code is MONTHLY_LIMIT_REACHED (got ${err.code})`);
      assert(err.statusCode === 429, `Status code is 429 (got ${err.statusCode})`);
    }
    assert(limitBlocked, "3rd reschedule in calendar month was successfully blocked");

    // TEST 6: Tutor Accepts Request 1
    console.log("\n--- Test 6: Tutor Accepts Request 1 ---");
    const acceptRes = await acceptRescheduleRequest({
      requestId: result1.request.id,
      tutorId: tutor.id,
    });

    assert(acceptRes.request.status === "ACCEPTED", "Request 1 status updated to ACCEPTED");
    
    // Verify event dueDate is now moved to requestedDate1
    const movedEvent1 = await prisma.event.findUnique({ where: { id: eventFar1.id } });
    assert(
      movedEvent1?.dueDate.getTime() === requestedDate1.getTime(),
      "Event dueDate was updated to requested date upon tutor acceptance"
    );

    // TEST 7: Tutor Declines Request 2
    console.log("\n--- Test 7: Tutor Declines Request 2 ---");
    const declineRes = await declineRescheduleRequest({
      requestId: result2.request.id,
      tutorId: tutor.id,
      responseNote: "Sorry, I am unavailable at this requested time.",
    });

    assert(declineRes.request.status === "DECLINED", "Request 2 status updated to DECLINED");

    // Verify event dueDate remains the original dueDate72h
    const untouchedEvent2 = await prisma.event.findUnique({ where: { id: eventFar2.id } });
    assert(
      untouchedEvent2?.dueDate.getTime() === dueDate72h.getTime(),
      "Event dueDate remains at original time when tutor declines"
    );

    // TEST 8: Quota After Decline Policy
    console.log("\n--- Test 8: Quota Reclaimed After Decline ---");
    const quotaAfterDecline = await getStudentRescheduleQuota(student.id);
    assert(
      quotaAfterDecline.usedThisMonth === 1,
      `Declined request does not consume quota: used is 1 (got ${quotaAfterDecline.usedThisMonth})`
    );
    assert(
      quotaAfterDecline.remainingThisMonth === 1,
      `Remaining slot is back to 1 (got ${quotaAfterDecline.remainingThisMonth})`
    );

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n");
  } finally {
    // Cleanup
    console.log("--- Cleanup: Deleting Test Entities ---");
    try {
      if (student?.id) {
        await prisma.classRescheduleRequest.deleteMany({ where: { studentId: student.id } });
        await prisma.notification.deleteMany({ where: { userId: { in: [student.id, tutor?.id].filter(Boolean) } } });
      }
      if (course?.id) {
        await prisma.event.deleteMany({ where: { courseId: course.id } });
        await prisma.course.delete({ where: { id: course.id } });
      }
      if (student?.id) await prisma.user.delete({ where: { id: student.id } });
      if (tutor?.id) await prisma.user.delete({ where: { id: tutor.id } });
      console.log("Cleanup complete.");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }
}

runTests().then(() => {
  process.exit(0);
}).catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
