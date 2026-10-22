import { getTutorPayRate, determineClassTier, getTutorMonthlyEarnings } from "../lib/token-ecosystem";
import { prisma } from "../lib/prisma";

async function runTests() {
  console.log("=== RUNNING TUTOR CUSTOM RATES TEST SUITE ===");

  // Test 1: Direct Tutor DB Rates
  const tutorWithDbRates = {
    id: "test-tutor-1",
    ialIasPayRate: 5500,
    igcsePayRate: 4200,
    bio: null,
  };

  const alRate = getTutorPayRate(tutorWithDbRates, "IAL_IAS");
  console.log(`Tutor DB A/L rate: ${alRate.hourlyRate} (custom: ${alRate.isCustomRate})`);
  if (alRate.hourlyRate !== 5500 || !alRate.isCustomRate) {
    throw new Error(`Expected 5500 LKR for A/L, got ${alRate.hourlyRate}`);
  }

  const olRate = getTutorPayRate(tutorWithDbRates, "IGCSE");
  console.log(`Tutor DB O/L rate: ${olRate.hourlyRate} (custom: ${olRate.isCustomRate})`);
  if (olRate.hourlyRate !== 4200 || !olRate.isCustomRate) {
    throw new Error(`Expected 4200 LKR for O/L, got ${olRate.hourlyRate}`);
  }
  console.log("✅ PASSED: Tutor DB rates respected without falling back to defaults.");

  // Test 2: Tutor Bio Rates
  const tutorWithBioRates = {
    id: "test-tutor-2",
    ialIasPayRate: null,
    igcsePayRate: null,
    bio: JSON.stringify({
      hourlyRateAL: "6000",
      hourlyRateOL: "4500",
      isALTutor: true,
      isOLTutor: true,
    }),
  };

  const alBioRate = getTutorPayRate(tutorWithBioRates, "IAL_IAS");
  console.log(`Tutor Bio A/L rate: ${alBioRate.hourlyRate} (custom: ${alBioRate.isCustomRate})`);
  if (alBioRate.hourlyRate !== 6000 || !alBioRate.isCustomRate) {
    throw new Error(`Expected 6000 LKR for A/L, got ${alBioRate.hourlyRate}`);
  }

  const olBioRate = getTutorPayRate(tutorWithBioRates, "IGCSE");
  console.log(`Tutor Bio O/L rate: ${olBioRate.hourlyRate} (custom: ${olBioRate.isCustomRate})`);
  if (olBioRate.hourlyRate !== 4500 || !olBioRate.isCustomRate) {
    throw new Error(`Expected 4500 LKR for O/L, got ${olBioRate.hourlyRate}`);
  }
  console.log("✅ PASSED: Tutor Bio rates parsed and prioritized correctly.");

  // Test 3: Academic Level Mapping to Tier
  const eventAL = { academicLevel: "ADVANCED" };
  const eventOL = { academicLevel: "INTERMEDIATE" };
  const eventFoundation = { academicLevel: "FOUNDATION" };

  const tierAL = determineClassTier(null, null, null, eventAL);
  if (tierAL.tier !== "IAL_IAS") throw new Error(`Expected IAL_IAS for ADVANCED, got ${tierAL.tier}`);
  console.log(`✅ PASSED: Event ADVANCED mapped to ${tierAL.tier} (${tierAL.label})`);

  const tierOL = determineClassTier(null, null, null, eventOL);
  if (tierOL.tier !== "IGCSE") throw new Error(`Expected IGCSE for INTERMEDIATE, got ${tierOL.tier}`);
  console.log(`✅ PASSED: Event INTERMEDIATE mapped to ${tierOL.tier} (${tierOL.label})`);

  const tierFoundation = determineClassTier(null, null, null, eventFoundation);
  if (tierFoundation.tier !== "IGCSE") throw new Error(`Expected IGCSE for FOUNDATION, got ${tierFoundation.tier}`);
  console.log(`✅ PASSED: Event FOUNDATION mapped to ${tierFoundation.tier} (${tierFoundation.label})`);

  // Course Level mapping
  const courseAL = { level: "ADVANCED", title: "Chemistry" };
  const courseOL = { level: "INTERMEDIATE", title: "Chemistry" };
  const tierCourseAL = determineClassTier(courseAL);
  if (tierCourseAL.tier !== "IAL_IAS") throw new Error(`Expected IAL_IAS for course ADVANCED, got ${tierCourseAL.tier}`);
  console.log(`✅ PASSED: Course ADVANCED mapped to ${tierCourseAL.tier} (${tierCourseAL.label})`);

  const tierCourseOL = determineClassTier(courseOL);
  if (tierCourseOL.tier !== "IGCSE") throw new Error(`Expected IGCSE for course INTERMEDIATE, got ${tierCourseOL.tier}`);
  console.log(`✅ PASSED: Course INTERMEDIATE mapped to ${tierCourseOL.tier} (${tierCourseOL.label})`);

  // Test 4: Verify getTutorMonthlyEarnings returns tutor rates
  const existingTutor = await prisma.user.findFirst({
    where: { role: { in: ["TUTOR", "INSTRUCTOR"] as any } },
  });
  if (existingTutor) {
    const earnings = await getTutorMonthlyEarnings(existingTutor.id);
    console.log(`Tutor earnings data retrieved for ${existingTutor.name}:`, {
      tutorAlRate: earnings.currentMonth.tutorAlRate,
      tutorOlRate: earnings.currentMonth.tutorOlRate,
    });
    if (typeof earnings.currentMonth.tutorAlRate !== "number" || typeof earnings.currentMonth.tutorOlRate !== "number") {
      throw new Error("tutorAlRate and tutorOlRate must be numeric in earnings result");
    }
    console.log("✅ PASSED: getTutorMonthlyEarnings returns tutorAlRate and tutorOlRate");
  }

  console.log("\n🎉 ALL CUSTOM TUTOR RATE TESTS PASSED! 🎉");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
