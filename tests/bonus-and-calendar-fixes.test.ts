import { prisma } from "../lib/prisma";
import {
  getPayGradeSettings,
  updatePayGradeSettings,
  calculateTutorMonthlyBonus,
  getAdminTutorPayoutOverview,
  DEFAULT_BONUS_TIERS,
  DEFAULT_PAY_GRADES,
} from "../lib/token-ecosystem";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log("=== RUNNING TUTOR BONUS & CALENDAR FIX TEST SUITE ===\n");

  // TEST 1: Non-Stacking Bonus Calculation
  console.log("--- Test 1: Non-Stacking Bonus Tier Evaluation ---");

  // Example: 40 hours (Below Tier 1)
  const b40 = calculateTutorMonthlyBonus(40);
  assert(b40.unlockedBonusLkr === 0, "40 hours yields 0 LKR bonus");
  assert(b40.currentTier === null, "40 hours currentTier is null");
  assert(b40.nextTier === "Tier 1", "Next tier is Tier 1");
  assert(b40.hoursToNextTier === 10, "10 hours to Tier 1");

  // Example A: 60 hours (Tier 1: 50-74 hours = 5,000 LKR)
  const b60 = calculateTutorMonthlyBonus(60);
  assert(b60.unlockedBonusLkr === 5000, "60 hours yields exactly 5,000 LKR (Tier 1)");
  assert(b60.currentTier === "Tier 1", "60 hours currentTier is Tier 1");
  assert(b60.nextTier === "Tier 2", "Next tier is Tier 2");
  assert(b60.hoursToNextTier === 15, "15 hours to Tier 2 (75 - 60)");

  // Example B: 85 hours (Tier 2: 75-99 hours = 7,500 LKR - Non-stacking!)
  const b85 = calculateTutorMonthlyBonus(85);
  assert(b85.unlockedBonusLkr === 7500, "85 hours yields strictly 7,500 LKR (Tier 2 only, does not stack 5k+7.5k)");
  assert(b85.currentTier === "Tier 2", "85 hours currentTier is Tier 2");
  assert(b85.nextTier === "Tier 3", "Next tier is Tier 3");
  assert(b85.hoursToNextTier === 15, "15 hours to Tier 3 (100 - 85)");

  // Example C: 120 hours (Tier 3: 100+ hours = 10,000 LKR - Non-stacking!)
  const b120 = calculateTutorMonthlyBonus(120);
  assert(b120.unlockedBonusLkr === 10000, "120 hours yields strictly 10,000 LKR (Tier 3 only)");
  assert(b120.currentTier === "Tier 3", "120 hours currentTier is Tier 3");
  assert(b120.nextTier === null, "Next tier is null (maximum achieved)");
  assert(b120.hoursToNextTier === 0, "0 hours to next tier");

  // TEST 2: Dynamic Settings Persistence
  console.log("\n--- Test 2: Dynamic Variable Controls & Admin Persistence ---");
  const initialSettings = await getPayGradeSettings();
  assert(initialSettings.tier1MinHours === 50, "Default tier 1 min hours is 50");
  assert(initialSettings.tier1BonusLkr === 5000, "Default tier 1 bonus is 5,000 LKR");
  assert(initialSettings.tier2MinHours === 75, "Default tier 2 min hours is 75");
  assert(initialSettings.tier2BonusLkr === 7500, "Default tier 2 bonus is 7,500 LKR");
  assert(initialSettings.tier3MinHours === 100, "Default tier 3 min hours is 100");
  assert(initialSettings.tier3BonusLkr === 10000, "Default tier 3 bonus is 10,000 LKR");

  // Admin edits the bonus values dynamically
  const updatedSettings = await updatePayGradeSettings({
    tier1MinHours: 45,
    tier1BonusLkr: 6000,
  });
  assert(updatedSettings.tier1MinHours === 45, "Updated tier 1 min hours to 45");
  assert(updatedSettings.tier1BonusLkr === 6000, "Updated tier 1 bonus to 6,000 LKR");

  // Verify calculation reflects updated dynamic variables
  const dynamicCalc = calculateTutorMonthlyBonus(46, updatedSettings);
  assert(dynamicCalc.unlockedBonusLkr === 6000, "46 hours unlocks updated Tier 1 bonus of 6,000 LKR");

  // Reset back to standard defaults
  await updatePayGradeSettings({
    tier1MinHours: 50,
    tier1BonusLkr: 5000,
    tier2MinHours: 75,
    tier2BonusLkr: 7500,
    tier3MinHours: 100,
    tier3BonusLkr: 10000,
  });
  console.log("Settings reset back to standard defaults.");

  // TEST 3: Admin Tutor Payout Overview Ledger
  console.log("\n--- Test 3: Admin Tutor Payout Overview Ledger ---");
  const overview = await getAdminTutorPayoutOverview();
  assert(Boolean(overview.monthKey), `Overview returns valid monthKey: ${overview.monthKey}`);
  assert(Boolean(overview.monthLabel), `Overview returns valid monthLabel: ${overview.monthLabel}`);
  assert(Array.isArray(overview.tutors), "Overview returns tutors array");
  console.log(`Found ${overview.tutors.length} certified tutors in ledger.`);

  if (overview.tutors.length > 0) {
    const firstTutor = overview.tutors[0];
    assert(Boolean(firstTutor.name), "Tutor row contains name");
    assert(Boolean(firstTutor.subjectTier), "Tutor row contains subjectTier");
    assert(Boolean(firstTutor.hourlyPayGrade), "Tutor row contains hourlyPayGrade");
    assert(typeof firstTutor.totalHoursThisMonth === "number", "Tutor row contains numeric totalHoursThisMonth");
    assert(typeof firstTutor.unlockedBonusLkr === "number", "Tutor row contains numeric unlockedBonusLkr");
  }

  // TEST 4: Database Cleanliness for Scheduled Classes
  console.log("\n--- Test 4: Verify No Scheduled Events Have Erroneous endedAt ---");
  const scheduledWithEndedAt = await prisma.event.count({
    where: {
      status: "SCHEDULED",
      endedAt: { not: null },
    },
  });
  assert(
    scheduledWithEndedAt === 0,
    `No SCHEDULED events have endedAt set (got ${scheduledWithEndedAt})`
  );

  console.log("\n🎉 ALL TESTS PASSED! 🎉\n");
}

runTests()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("Test execution failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
