import { prisma } from "../lib/prisma";
import { hasStudentAssignedClasses, hasTutorAssignedClasses } from "../lib/server/assigned-classes";

async function runTests() {
  console.log("=== RUNNING ASSIGNED CLASSES AVAILABILITY LOCK TEST SUITE ===");

  // Find or create a test student
  const student = await prisma.user.findFirst({
    where: { role: "STUDENT" },
  });

  // Find or create a test tutor
  const tutor = await prisma.user.findFirst({
    where: { role: "TUTOR" },
  });

  if (!student || !tutor) {
    console.log("⚠️ Could not find student and tutor in DB, skipping live DB checks.");
    return;
  }

  console.log(`Testing Student: ${student.name} (${student.id})`);
  console.log(`Testing Tutor: ${tutor.name} (${tutor.id})`);

  // Test 1: Check initial status
  const studentInitial = await hasStudentAssignedClasses(student.id);
  console.log("Student initial assigned classes:", {
    hasAssignedClasses: studentInitial.hasAssignedClasses,
    count: studentInitial.count,
  });

  const tutorInitial = await hasTutorAssignedClasses(tutor.id);
  console.log("Tutor initial assigned classes:", {
    hasAssignedClasses: tutorInitial.hasAssignedClasses,
    count: tutorInitial.count,
  });

  // Test 2: Create a temporary test event assigned to student and tutor
  const testDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
  const testEvent = await prisma.event.create({
    data: {
      title: "Active Lock Unit Test Class",
      dueDate: testDueDate,
      userId: student.id,
      requestedBy: tutor.id,
      status: "SCHEDULED",
    },
  });
  console.log(`Created test scheduled event: ${testEvent.id}`);

  try {
    // Test 3: Verify Student is locked
    const studentWithClass = await hasStudentAssignedClasses(student.id);
    if (!studentWithClass.hasAssignedClasses || studentWithClass.count === 0) {
      throw new Error("Student should be locked when a class is assigned!");
    }
    console.log("✅ PASSED: Student correctly detected as having assigned classes.");

    // Test 4: Verify Tutor is locked
    const tutorWithClass = await hasTutorAssignedClasses(tutor.id);
    if (!tutorWithClass.hasAssignedClasses || tutorWithClass.count === 0) {
      throw new Error("Tutor should be locked when a class is assigned!");
    }
    console.log("✅ PASSED: Tutor correctly detected as having assigned classes.");

  } finally {
    // Cleanup the test event
    await prisma.event.delete({ where: { id: testEvent.id } });
    console.log("Cleaned up test scheduled event.");
  }

  console.log("\n🎉 ALL ASSIGNED CLASSES LOCK TESTS PASSED! 🎉");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
