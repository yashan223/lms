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

// Test 1: Extreme Timezones (UTC+14 Kiritimati, UTC-12 Baker Island / Pacific/Pago_Pago UTC-11)
console.log("--- 1. Extreme Timezones ---");
const utcMoment = new Date("2026-06-15T12:00:00.000Z");

// Kiritimati is UTC+14 -> June 16, 02:00
const lineIslands = getDatePartsInTimezone(utcMoment, "Pacific/Kiritimati");
assert(lineIslands.dateStr === "2026-06-16", `Kiritimati date is next day (2026-06-16): got ${lineIslands.dateStr}`);
assert(lineIslands.hour === 2, `Kiritimati hour is 02: got ${lineIslands.hour}`);

// Niue / Pago Pago is UTC-11 -> June 15, 01:00
const samoaTime = getDatePartsInTimezone(utcMoment, "Pacific/Pago_Pago");
assert(samoaTime.dateStr === "2026-06-15", `Pago Pago date is same day (2026-06-15): got ${samoaTime.dateStr}`);
assert(samoaTime.hour === 1, `Pago Pago hour is 01: got ${samoaTime.hour}`);

// Test 2: Half-Hour & 45-Minute Offsets (India/Sri Lanka UTC+5:30, Nepal UTC+5:45, Chatham UTC+12:45/13:45)
console.log("\n--- 2. Non-Hour Offsets ---");
const testUtc = new Date("2026-09-24T10:00:00.000Z");

// Sri Lanka: 10:00 UTC + 5:30 = 15:30
const colomboParts = getDatePartsInTimezone(testUtc, "Asia/Colombo");
assert(colomboParts.hour === 15 && colomboParts.minute === 30, `Sri Lanka is 15:30: got ${colomboParts.hour}:${colomboParts.minute}`);

// Nepal: 10:00 UTC + 5:45 = 15:45
const nepalParts = getDatePartsInTimezone(testUtc, "Asia/Kathmandu");
assert(nepalParts.hour === 15 && nepalParts.minute === 45, `Nepal is 15:45: got ${nepalParts.hour}:${nepalParts.minute}`);

// Test 3: Midnight Crossing and Calendar Date Shift
console.log("\n--- 3. Midnight Crossing and Calendar Date Shift ---");
// 10:00 PM in Colombo (2026-09-24 22:00 +05:30) is 16:30 UTC on 2026-09-24
// In New York (EDT, UTC-4), 16:30 UTC is 12:30 PM on the SAME day
// In Auckland (NZST, UTC+12), 16:30 UTC is 04:30 AM on the NEXT day (2026-09-25)
const bookingColombo = createDateFromTimezoneParts("2026-09-24", "22:00", "Asia/Colombo");
const nyParts = getDatePartsInTimezone(bookingColombo, "America/New_York");
const aucklandParts = getDatePartsInTimezone(bookingColombo, "Pacific/Auckland");

assert(nyParts.dateStr === "2026-09-24", `New York date is 2026-09-24: got ${nyParts.dateStr}`);
assert(nyParts.hour === 12 && nyParts.minute === 30, `New York time is 12:30 PM: got ${nyParts.hour}:${nyParts.minute}`);
assert(aucklandParts.dateStr === "2026-09-25", `Auckland crossed midnight to next day (2026-09-25): got ${aucklandParts.dateStr}`);
assert(aucklandParts.hour === 4 && aucklandParts.minute === 30, `Auckland time is 04:30 AM: got ${aucklandParts.hour}:${aucklandParts.minute}`);

// Test 4: Daylight Saving Time (DST) Transitions
console.log("\n--- 4. Daylight Saving Time Transitions ---");
// London in Winter (GMT, UTC+0) vs London in Summer (BST, UTC+1)
const londonWinter = new Date("2026-01-15T12:00:00.000Z");
const londonSummer = new Date("2026-07-15T12:00:00.000Z");
const londonWinterParts = getDatePartsInTimezone(londonWinter, "Europe/London");
const londonSummerParts = getDatePartsInTimezone(londonSummer, "Europe/London");

assert(londonWinterParts.hour === 12, `London Winter 12:00 UTC is 12:00 GMT: got ${londonWinterParts.hour}`);
assert(londonSummerParts.hour === 13, `London Summer 12:00 UTC is 13:00 BST: got ${londonSummerParts.hour}`);

// New York Winter (EST, UTC-5) vs New York Summer (EDT, UTC-4)
const nyWinter = new Date("2026-01-15T17:00:00.000Z"); // 12:00 EST
const nySummer = new Date("2026-07-15T17:00:00.000Z"); // 13:00 EDT
const nyWinterParts = getDatePartsInTimezone(nyWinter, "America/New_York");
const nySummerParts = getDatePartsInTimezone(nySummer, "America/New_York");
assert(nyWinterParts.hour === 12, `New York Winter 17:00 UTC is 12:00 EST: got ${nyWinterParts.hour}`);
assert(nySummerParts.hour === 13, `New York Summer 17:00 UTC is 13:00 EDT: got ${nySummerParts.hour}`);

// Test 5: Tutor and Student in Different Timezones Seeing the Same Session
console.log("\n--- 5. Tutor & Student Matching Dual Time ---");
// Tutor in London schedules a class at 14:00 UK time on 2026-07-10 (BST, UTC+1 -> 13:00 UTC)
const tutorSessionUtc = createDateFromTimezoneParts("2026-07-10", "14:00", "Europe/London");
const studentTz = "Asia/Colombo"; // UTC+5:30 -> 18:30 IST

const dual = getDualTimeDisplay(tutorSessionUtc, studentTz, "Europe/London");
assert(!dual.isSameTimezone, "Tutor and student detected as different timezones");
assert(dual.baseTime.includes("2:00"), `Tutor sees 2:00 PM: got ${dual.baseTime}`);
assert(dual.viewerTime.includes("6:30"), `Student sees 6:30 PM: got ${dual.viewerTime}`);

// Test 6: Round-trip <input type="datetime-local"> formatting and parsing
console.log("\n--- 6. HTML datetime-local Round-trip ---");
const pickedLocalStr = "2026-10-15T09:30";
const inDubaiTz = "Asia/Dubai"; // UTC+4
const parsedUtc = parseDateTimeInputInTimezone(pickedLocalStr, inDubaiTz);
// 09:30 in Dubai (UTC+4) is 05:30 UTC
assert(parsedUtc.toISOString() === "2026-10-15T05:30:00.000Z", `Parsed UTC is 05:30:00Z: got ${parsedUtc.toISOString()}`);
// Formatting back for datetime-local in Dubai returns "2026-10-15T09:30"
const formattedBack = formatForDateTimeInput(parsedUtc, inDubaiTz);
assert(formattedBack === pickedLocalStr, `Round-trip datetime-local matches: got ${formattedBack}`);

// Test 7: formatForUser Formatter
console.log("\n--- 7. formatForUser Formatter ---");
const userFormatted = formatForUser(tutorSessionUtc, "Asia/Colombo");
assert(userFormatted.includes("6:30 PM"), `formatForUser contains 6:30 PM: got ${userFormatted}`);
assert(userFormatted.includes("IST"), `formatForUser includes IST timezone abbreviation: got ${userFormatted}`);

console.log("\n=============================================");
console.log("🎉 ALL TIMEZONE & SCHEDULING TESTS PASSED!");
console.log("=============================================");
