import assert from "node:assert";
import { resolveGeoLocation, isSriLankaCountry, extractCountryFromHeaders } from "../lib/geo";
import { formatStudentPrice, getPackageCurrency } from "../lib/currency";

async function runTests() {
  console.log("=== RUNNING IP CURRENCY & PRICING TEST SUITE ===");

  // Test 1: Country detection helper
  console.log("Step 1: Testing isSriLankaCountry helper...");
  assert.strictEqual(isSriLankaCountry("Sri Lanka"), true);
  assert.strictEqual(isSriLankaCountry("LK"), true);
  assert.strictEqual(isSriLankaCountry("LKA"), true);
  assert.strictEqual(isSriLankaCountry("srilanka"), true);
  assert.strictEqual(isSriLankaCountry("US"), false);
  assert.strictEqual(isSriLankaCountry("United States"), false);
  assert.strictEqual(isSriLankaCountry("United Kingdom"), false);
  assert.strictEqual(isSriLankaCountry("GB"), false);
  assert.strictEqual(isSriLankaCountry("AU"), false);
  assert.strictEqual(isSriLankaCountry("AE"), false);
  assert.strictEqual(isSriLankaCountry(null), false);
  assert.strictEqual(isSriLankaCountry(undefined), false);

  // Test 2: Header extraction with Vercel and Cloudflare headers
  console.log("Step 2: Testing header extraction for country...");
  assert.strictEqual(
    extractCountryFromHeaders({ "cf-ipcountry": "LK" }),
    "LK"
  );
  assert.strictEqual(
    extractCountryFromHeaders({ "x-vercel-ip-country": "US" }),
    "US"
  );
  assert.strictEqual(
    extractCountryFromHeaders({ "x-country-code": "AU" }),
    "AU"
  );

  // Test 3: Geolocation resolution - Sri Lanka vs Other Countries
  console.log("Step 3: Testing resolveGeoLocation...");
  const slGeo = await resolveGeoLocation({ "x-vercel-ip-country": "LK" });
  assert.strictEqual(slGeo.isSriLanka, true, "Should be Sri Lanka");
  assert.strictEqual(slGeo.currency, "LKR", "Currency for Sri Lanka must be LKR");

  const usGeo = await resolveGeoLocation({ "cf-ipcountry": "US" });
  assert.strictEqual(usGeo.isSriLanka, false, "Should not be Sri Lanka");
  assert.strictEqual(usGeo.currency, "USD", "Currency for non-Sri Lanka must be USD");

  const gbGeo = await resolveGeoLocation({ "x-vercel-ip-country": "GB" });
  assert.strictEqual(gbGeo.isSriLanka, false, "Should not be Sri Lanka");
  assert.strictEqual(gbGeo.currency, "USD", "Currency for non-Sri Lanka must be USD");

  const auGeo = await resolveGeoLocation({ "cf-ipcountry": "AU" });
  assert.strictEqual(auGeo.isSriLanka, false, "Should not be Sri Lanka");
  assert.strictEqual(auGeo.currency, "USD", "Currency for non-Sri Lanka must be USD");

  // Test 4: Pricing formatting based on Sri Lanka vs other country
  console.log("Step 4: Testing pricing display for LK vs other countries...");
  // 8 Hours Flex Pack: $40 USD / LKR 13000, with 10% discount -> $36 USD / LKR 11700
  const usdPrice = 40;
  const lkrPrice = 13000;
  const discountPercent = 10;
  const discountEnabled = true;

  const slFormatted = formatStudentPrice(
    usdPrice,
    "Sri Lanka",
    lkrPrice,
    "AL",
    undefined,
    undefined,
    discountPercent,
    discountEnabled
  );
  assert.strictEqual(slFormatted, "LKR 11,700", "Sri Lanka price must show LKR 11,700");

  const usFormatted = formatStudentPrice(
    usdPrice,
    "United States",
    lkrPrice,
    "AL",
    undefined,
    undefined,
    discountPercent,
    discountEnabled
  );
  assert.strictEqual(usFormatted, "USD 36.00", "US IP price must show USD 36.00");

  const gbFormatted = formatStudentPrice(
    usdPrice,
    "United Kingdom",
    lkrPrice,
    "AL",
    undefined,
    undefined,
    discountPercent,
    discountEnabled
  );
  assert.strictEqual(gbFormatted, "USD 36.00", "GB IP price must show USD 36.00");

  console.log("=== ALL IP CURRENCY & PRICING TESTS PASSED! ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
