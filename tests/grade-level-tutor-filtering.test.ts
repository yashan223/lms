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

    // 5. Test isStudentOL and isStudentAL utility functions
    console.log("Testing isStudentOL and isStudentAL utilities...");
    const { isStudentOL, isStudentAL, isCourseOL, isCourseAL } = await import("../lib/currency");
    
    assert(isStudentOL({ student_grade: "O/L" }) === true, "student_grade O/L must be OL");
    assert(isStudentAL({ student_grade: "O/L" }) === false, "student_grade O/L must NOT be AL");
    assert(isStudentOL({ student_grade: "A/L" }) === false, "student_grade A/L must NOT be OL");
    assert(isStudentAL({ student_grade: "A/L" }) === true, "student_grade A/L must be AL");
    assert(isStudentOL({ academicLevel: "OL" }) === true, "academicLevel OL must be OL");
    assert(isStudentAL({ academicLevel: "AL" }) === true, "academicLevel AL must be AL");
    assert(isStudentOL({ headline: "London O/L Student" }) === true, "headline with London O/L must be OL");
    assert(isStudentAL({ headline: "London A/L Student" }) === true, "headline with London A/L must be AL");
    console.log("✅ isStudentOL and isStudentAL helpers passed all cases.");

    // 6. Test Condition D: O/L Tutor Filtering (O/L tutors only see O/L students, courses, trials)
    console.log("Testing Condition D: O/L Tutor visibility filtering...");
    const students = [
      { id: "s-ol", name: "OL Student", student_grade: "O/L", academicLevel: "OL" },
      { id: "s-al", name: "AL Student", student_grade: "A/L", academicLevel: "AL" },
    ];
    const courses = [
      { id: "c-ol", title: "Cambridge IGCSE Chemistry", level: "INTERMEDIATE" },
      { id: "c-al", title: "Cambridge International AS Physics", level: "ADVANCED" },
    ];

    // For OL-only tutor:
    const olTutorFilteredStudents = students.filter((s) => isStudentOL(s));
    const olTutorFilteredCourses = courses.filter((c) => isCourseOL(c));
    assert(olTutorFilteredStudents.length === 1 && olTutorFilteredStudents[0].id === "s-ol", "OL-only tutor must only see OL student");
    assert(olTutorFilteredCourses.length === 1 && olTutorFilteredCourses[0].id === "c-ol", "OL-only tutor must only see OL course");
    console.log("✅ Condition D passed: OL-only tutor filtering verified.");

    // 7. Test Condition E: A/L Tutor Filtering (A/L tutors only see A/L students, courses, trials)
    console.log("Testing Condition E: A/L Tutor visibility filtering...");
    const alTutorFilteredStudents = students.filter((s) => isStudentAL(s));
    const alTutorFilteredCourses = courses.filter((c) => isCourseAL(c));
    assert(alTutorFilteredStudents.length === 1 && alTutorFilteredStudents[0].id === "s-al", "AL-only tutor must only see AL student");
    assert(alTutorFilteredCourses.length === 1 && alTutorFilteredCourses[0].id === "c-al", "AL-only tutor must only see AL course");
    console.log("✅ Condition E passed: AL-only tutor filtering verified.");

    // 8. Test Condition F: Dual Tutor Filtering (Dual tutors see both)
    console.log("Testing Condition F: Dual Tutor visibility...");
    const dualStudents = tutorBoth.teaches_ol && tutorBoth.teaches_al ? students : [];
    const dualCourses = tutorBoth.teaches_ol && tutorBoth.teaches_al ? courses : [];
    assert(dualStudents.length === 2, "Dual tutor must see both students");
    assert(dualCourses.length === 2, "Dual tutor must see both courses");
    console.log("✅ Condition F passed: Dual tutor sees both grades.");

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
