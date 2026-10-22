import { isTutorQualifiedForLevel, formatDbTutors } from "../lib/faculty-tutors";
import { isCourseAL, isCourseOL } from "../lib/currency";
import { determineClassTier } from "../lib/token-ecosystem";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== RUNNING LEVEL FILTERING AND QUALIFICATION TESTS ===");

  // 1. Test Course Level Helpers
  console.log("Testing isCourseAL and isCourseOL...");
  const alCourse = { level: "ADVANCED", title: "Pure Mathematics P1", subtitle: "AS & A2 Course" };
  const olCourse = { level: "INTERMEDIATE", title: "Chemistry IGCSE", subtitle: "Ordinary Level Prep" };
  const textAlCourse = { level: "ALL_LEVELS", title: "Cambridge International A2 Physics", subtitle: "Advanced syllabus" };
  const textOlCourse = { level: "ALL_LEVELS", title: "Edexcel IGCSE Biology", subtitle: "OL revision" };

  assert(isCourseAL(alCourse) === true, "alCourse should be AL");
  assert(isCourseOL(alCourse) === false, "alCourse should NOT be OL");

  assert(isCourseAL(olCourse) === false, "olCourse should NOT be AL");
  assert(isCourseOL(olCourse) === true, "olCourse should be OL");

  assert(isCourseAL(textAlCourse) === true, "textAlCourse should be AL");
  assert(isCourseOL(textAlCourse) === false, "textAlCourse should NOT be OL");

  assert(isCourseAL(textOlCourse) === false, "textOlCourse should NOT be AL");
  assert(isCourseOL(textOlCourse) === true, "textOlCourse should be OL");
  console.log("✅ Passed Course Level tests.");

  // 2. Test Tutor Qualification
  console.log("Testing isTutorQualifiedForLevel...");

  // Tutor A: only AL (via bio JSON)
  const tutorAL = {
    id: "tutor-1",
    name: "AL Specialist",
    bio: JSON.stringify({ isALTutor: true, isOLTutor: false, hourlyRateAL: 5000 }),
    ialIasPayRate: 5000,
    igcsePayRate: null,
  };

  assert(isTutorQualifiedForLevel(tutorAL, "AL") === true, "tutorAL should be qualified for AL");
  assert(isTutorQualifiedForLevel(tutorAL, "ADVANCED") === true, "tutorAL should be qualified for ADVANCED");
  assert(isTutorQualifiedForLevel(tutorAL, "OL") === false, "tutorAL should NOT be qualified for OL");
  assert(isTutorQualifiedForLevel(tutorAL, "INTERMEDIATE") === false, "tutorAL should NOT be qualified for INTERMEDIATE");

  // Tutor B: only OL (via bio JSON)
  const tutorOL = {
    id: "tutor-2",
    name: "OL Specialist",
    bio: JSON.stringify({ isALTutor: false, isOLTutor: true, hourlyRateOL: 3500 }),
    ialIasPayRate: null,
    igcsePayRate: 3500,
  };

  assert(isTutorQualifiedForLevel(tutorOL, "AL") === false, "tutorOL should NOT be qualified for AL");
  assert(isTutorQualifiedForLevel(tutorOL, "ADVANCED") === false, "tutorOL should NOT be qualified for ADVANCED");
  assert(isTutorQualifiedForLevel(tutorOL, "OL") === true, "tutorOL should be qualified for OL");
  assert(isTutorQualifiedForLevel(tutorOL, "INTERMEDIATE") === true, "tutorOL should be qualified for INTERMEDIATE");

  // Tutor C: Both qualifications
  const tutorBoth = {
    id: "tutor-3",
    name: "Both Qualifications Tutor",
    bio: JSON.stringify({ isALTutor: true, isOLTutor: true }),
    ialIasPayRate: 5000,
    igcsePayRate: 3500,
  };

  assert(isTutorQualifiedForLevel(tutorBoth, "AL") === true, "tutorBoth should be qualified for AL");
  assert(isTutorQualifiedForLevel(tutorBoth, "OL") === true, "tutorBoth should be qualified for OL");
  assert(isTutorQualifiedForLevel(tutorBoth, "ALL") === true, "tutorBoth should be qualified for ALL");

  // Tutor D: Formatted FacultyTutor object
  const formattedFaculty = formatDbTutors([
    {
      id: "fac-1",
      name: "Formatted OL Only",
      bio: JSON.stringify({ isALTutor: false, isOLTutor: true }),
      igcsePayRate: 3500,
      ialIasPayRate: null,
      createdCourses: [{ id: "c1", title: "Chemistry IGCSE", level: "INTERMEDIATE" }],
    },
    {
      id: "fac-2",
      name: "Formatted AL Only",
      bio: JSON.stringify({ isALTutor: true, isOLTutor: false }),
      ialIasPayRate: 5000,
      igcsePayRate: null,
      createdCourses: [{ id: "c2", title: "Pure Math A2", level: "ADVANCED" }],
    },
  ]);

  assert(formattedFaculty[0].level === "OL", "fac-1 should be level OL");
  assert(isTutorQualifiedForLevel(formattedFaculty[0], "OL") === true, "fac-1 should qualify for OL");
  assert(isTutorQualifiedForLevel(formattedFaculty[0], "AL") === false, "fac-1 should NOT qualify for AL");

  assert(formattedFaculty[1].level === "AL", "fac-2 should be level AL");
  assert(isTutorQualifiedForLevel(formattedFaculty[1], "AL") === true, "fac-2 should qualify for AL");
  assert(isTutorQualifiedForLevel(formattedFaculty[1], "OL") === false, "fac-2 should NOT qualify for OL");

  console.log("✅ Passed Tutor Qualification tests.");

  // 3. Test determineClassTier
  console.log("Testing determineClassTier labels...");
  const alTier = determineClassTier(alCourse);
  assert(alTier.label === "Cambridge/Edexcel AS and A2", `Expected Cambridge/Edexcel AS and A2, got ${alTier.label}`);
  assert(alTier.tier === "IAL_IAS", `Expected tier IAL_IAS, got ${alTier.tier}`);

  const olTier = determineClassTier(olCourse);
  assert(olTier.label === "Cambridge/Edexcel IGCSE and OL", `Expected Cambridge/Edexcel IGCSE and OL, got ${olTier.label}`);
  assert(olTier.tier === "IGCSE", `Expected tier IGCSE, got ${olTier.tier}`);

  console.log("✅ Passed determineClassTier tests.");

  console.log("\n🎉 ALL LEVEL FILTERING TESTS PASSED! 🎉");
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
