import { prisma } from "../lib/prisma";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== RUNNING GRADE LEVEL TUTOR FILTERING TEST SUITE ===");

  // 1. Create or ensure test tutors:
  // Tutor A: teaches O/L only
  // Tutor B: teaches A/L only
  // Tutor C: teaches both O/L and A/L
  const tutorOLOnly = await prisma.user.upsert({
    where: { email: "test-tutor-ol-only@test.com" },
    update: {
      role: "TUTOR",
      teaches_ol: true,
      teaches_al: false,
      igcsePayRate: 3500,
      ialIasPayRate: null,
    },
    create: {
      name: "Tutor OL Only",
      email: "test-tutor-ol-only@test.com",
      passwordHash: "dummy",
      role: "TUTOR",
      teaches_ol: true,
      teaches_al: false,
      igcsePayRate: 3500,
      ialIasPayRate: null,
    },
  });

  const tutorALOnly = await prisma.user.upsert({
    where: { email: "test-tutor-al-only@test.com" },
    update: {
      role: "TUTOR",
      teaches_ol: false,
      teaches_al: true,
      igcsePayRate: null,
      ialIasPayRate: 5000,
    },
    create: {
      name: "Tutor AL Only",
      email: "test-tutor-al-only@test.com",
      passwordHash: "dummy",
      role: "TUTOR",
      teaches_ol: false,
      teaches_al: true,
      igcsePayRate: null,
      ialIasPayRate: 5000,
    },
  });

  const tutorBoth = await prisma.user.upsert({
    where: { email: "test-tutor-both@test.com" },
    update: {
      role: "TUTOR",
      teaches_ol: true,
      teaches_al: true,
      igcsePayRate: 3500,
      ialIasPayRate: 5000,
    },
    create: {
      name: "Tutor Both",
      email: "test-tutor-both@test.com",
      passwordHash: "dummy",
      role: "TUTOR",
      teaches_ol: true,
      teaches_al: true,
      igcsePayRate: 3500,
      ialIasPayRate: 5000,
    },
  });

  console.log("Created/Updated test tutors:", {
    olOnly: tutorOLOnly.id,
    alOnly: tutorALOnly.id,
    both: tutorBoth.id,
  });

  try {
    // 2. Test Condition A (O/L Student Query)
    console.log("Testing Condition A: Querying for O/L Student...");
    const olTutors = await prisma.user.findMany({
      where: {
        role: { in: ["TUTOR", "INSTRUCTOR"] },
        teaches_ol: true,
        id: { in: [tutorOLOnly.id, tutorALOnly.id, tutorBoth.id] },
      },
    });

    const olTutorIds = olTutors.map((t) => t.id);
    assert(olTutorIds.includes(tutorOLOnly.id), "O/L student must see OL Only tutor");
    assert(olTutorIds.includes(tutorBoth.id), "O/L student must see Both tutor (Condition C)");
    assert(!olTutorIds.includes(tutorALOnly.id), "O/L student MUST NOT see AL Only tutor");
    console.log("✅ Condition A passed: O/L query returned exactly OL & Both tutors, excluded AL only.");

    // 3. Test Condition B (A/L Student Query)
    console.log("Testing Condition B: Querying for A/L Student...");
    const alTutors = await prisma.user.findMany({
      where: {
        role: { in: ["TUTOR", "INSTRUCTOR"] },
        teaches_al: true,
        id: { in: [tutorOLOnly.id, tutorALOnly.id, tutorBoth.id] },
      },
    });

    const alTutorIds = alTutors.map((t) => t.id);
    assert(alTutorIds.includes(tutorALOnly.id), "A/L student must see AL Only tutor");
    assert(alTutorIds.includes(tutorBoth.id), "A/L student must see Both tutor (Condition C)");
    assert(!alTutorIds.includes(tutorOLOnly.id), "A/L student MUST NOT see OL Only tutor");
    console.log("✅ Condition B passed: A/L query returned exactly AL & Both tutors, excluded OL only.");

    // 4. Test Student Grade Field storage
    console.log("Testing student_grade field storage...");
    const testStudent = await prisma.user.upsert({
      where: { email: "test-student-grade-check@test.com" },
      update: {
        role: "STUDENT",
        student_grade: "O/L",
        academicLevel: "OL",
      },
      create: {
        name: "Test Grade Student",
        email: "test-student-grade-check@test.com",
        passwordHash: "dummy",
        role: "STUDENT",
        student_grade: "O/L",
        academicLevel: "OL",
      },
    });

    assert(testStudent.student_grade === "O/L", "student_grade must be 'O/L'");
    console.log("✅ Student grade stored and verified successfully.");

    // Clean up test student
    await prisma.user.delete({ where: { id: testStudent.id } });
  } finally {
    // Cleanup test tutors
    await prisma.user.deleteMany({
      where: {
        id: { in: [tutorOLOnly.id, tutorALOnly.id, tutorBoth.id] },
      },
    });
    console.log("Cleaned up test users.");
  }

  console.log("\n🎉 ALL GRADE LEVEL TUTOR FILTERING TESTS PASSED! 🎉");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
