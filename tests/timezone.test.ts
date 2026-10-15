import {
  formatTimeInTimezone,
  formatDateInTimezone,
  getDatePartsInTimezone,
  createDateFromTimezoneParts,
  getDualTimeDisplay,
  formatForUser,
  formatForDateTimeInput,
  parseDateTimeInputInTimezone,
  toUTC,
  toUserTime,
} from "../lib/timezones";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log("=== RUNNING TIMEZONE & DATETIME TEST SUITE ===\n");

console.log("--- 1. Extreme Timezones ---");
const utcMoment = new Date("2026-06-15T12:00:00.000Z");

const lineIslands = getDatePartsInTimezone(utcMoment, "Pacific/Kiritimati");
assert(lineIslands.dateStr === "2026-06-16", `Kiritimati date is next day (2026-06-16): got ${lineIslands.dateStr}`);
assert(lineIslands.hour === 2, `Kiritimati hour is 02: got ${lineIslands.hour}`);

const samoaTime = getDatePartsInTimezone(utcMoment, "Pacific/Pago_Pago");
assert(samoaTime.dateStr === "2026-06-15", `Pago Pago date is same day (2026-06-15): got ${samoaTime.dateStr}`);
assert(samoaTime.hour === 1, `Pago Pago hour is 01: got ${samoaTime.hour}`);

console.log("\n--- 2. Non-Hour Offsets ---");
const testUtc = new Date("2026-09-24T10:00:00.000Z");

const colomboParts = getDatePartsInTimezone(testUtc, "Asia/Colombo");
assert(colomboParts.hour === 15 && colomboParts.minute === 30, `Sri Lanka is 15:30: got ${colomboParts.hour}:${colomboParts.minute}`);

const nepalParts = getDatePartsInTimezone(testUtc, "Asia/Kathmandu");
assert(nepalParts.hour === 15 && nepalParts.minute === 45, `Nepal is 15:45: got ${nepalParts.hour}:${nepalParts.minute}`);

console.log("\n--- 3. Midnight Crossing and Calendar Date Shift ---");
const bookingColombo = createDateFromTimezoneParts("2026-09-24", "22:00", "Asia/Colombo");
const nyParts = getDatePartsInTimezone(bookingColombo, "America/New_York");
const aucklandParts = getDatePartsInTimezone(bookingColombo, "Pacific/Auckland");

assert(nyParts.dateStr === "2026-09-24", `New York date is 2026-09-24: got ${nyParts.dateStr}`);
assert(nyParts.hour === 12 && nyParts.minute === 30, `New York time is 12:30 PM: got ${nyParts.hour}:${nyParts.minute}`);
assert(aucklandParts.dateStr === "2026-09-25", `Auckland crossed midnight to next day (2026-09-25): got ${aucklandParts.dateStr}`);
assert(aucklandParts.hour === 4 && aucklandParts.minute === 30, `Auckland time is 04:30 AM: got ${aucklandParts.hour}:${aucklandParts.minute}`);

console.log("\n--- 4. Daylight Saving Time Transitions ---");
const londonWinter = new Date("2026-01-15T12:00:00.000Z");
const londonSummer = new Date("2026-07-15T12:00:00.000Z");
const londonWinterParts = getDatePartsInTimezone(londonWinter, "Europe/London");
const londonSummerParts = getDatePartsInTimezone(londonSummer, "Europe/London");

assert(londonWinterParts.hour === 12, `London Winter 12:00 UTC is 12:00 GMT: got ${londonWinterParts.hour}`);
assert(londonSummerParts.hour === 13, `London Summer 12:00 UTC is 13:00 BST: got ${londonSummerParts.hour}`);

const nyWinter = new Date("2026-01-15T17:00:00.000Z");
const nySummer = new Date("2026-07-15T17:00:00.000Z");
const nyWinterParts = getDatePartsInTimezone(nyWinter, "America/New_York");
const nySummerParts = getDatePartsInTimezone(nySummer, "America/New_York");
assert(nyWinterParts.hour === 12, `New York Winter 17:00 UTC is 12:00 EST: got ${nyWinterParts.hour}`);
assert(nySummerParts.hour === 13, `New York Summer 17:00 UTC is 13:00 EDT: got ${nySummerParts.hour}`);

console.log("\n--- 5. Tutor & Student Matching Dual Time ---");
const tutorSessionUtc = createDateFromTimezoneParts("2026-07-10", "14:00", "Europe/London");
const studentTz = "Asia/Colombo";

const dual = getDualTimeDisplay(tutorSessionUtc, studentTz, "Europe/London");
assert(!dual.isSameTimezone, "Tutor and student detected as different timezones");
assert(dual.baseTime.includes("2:00"), `Tutor sees 2:00 PM: got ${dual.baseTime}`);
assert(dual.viewerTime.includes("6:30"), `Student sees 6:30 PM: got ${dual.viewerTime}`);

console.log("\n--- 6. HTML datetime-local Round-trip ---");
const pickedLocalStr = "2026-10-15T09:30";
const inDubaiTz = "Asia/Dubai";
const parsedUtc = parseDateTimeInputInTimezone(pickedLocalStr, inDubaiTz);
assert(parsedUtc.toISOString() === "2026-10-15T05:30:00.000Z", `Parsed UTC is 05:30:00Z: got ${parsedUtc.toISOString()}`);
const formattedBack = formatForDateTimeInput(parsedUtc, inDubaiTz);
assert(formattedBack === pickedLocalStr, `Round-trip datetime-local matches: got ${formattedBack}`);

console.log("\n--- 7. formatForUser Formatter ---");
const userFormatted = formatForUser(tutorSessionUtc, "Asia/Colombo");
assert(userFormatted.includes("6:30 PM"), `formatForUser contains 6:30 PM: got ${userFormatted}`);
assert(userFormatted.includes("IST"), `formatForUser includes IST timezone abbreviation: got ${userFormatted}`);

console.log("\n=============================================");
console.log("🎉 ALL TIMEZONE & SCHEDULING TESTS PASSED!");
console.log("=============================================");
