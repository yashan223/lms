import { prisma } from "../lib/prisma";
import {
  getDiscountedPrice,
  getDiscountedLkrPrice,
  getBundlePricingForLevel,
  TokenBundle,
} from "../lib/bundle-types";
import { formatStudentPrice, getBundlePriceDetails } from "../lib/currency";
import { getBundles, saveBundles } from "../lib/bundles";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== RUNNING TOKEN PACKAGE DISCOUNT TEST SUITE ===");

  // 1. Pure Helper Unit Tests
  console.log("Step 1: Testing discount calculation helpers...");
  // Test discount disabled
  assert(getDiscountedPrice(100, 20, false) === 100, "Disabled discount should return original USD price");
  assert(getDiscountedLkrPrice(30000, 20, false) === 30000, "Disabled discount should return original LKR price");
  assert(getDiscountedPrice(100, 0, true) === 100, "0% discount should return original USD price");

  // Test discount enabled (20% off)
  assert(getDiscountedPrice(100, 20, true) === 80, "20% discount on $100 should be $80");
  assert(getDiscountedLkrPrice(30000, 20, true) === 24000, "20% discount on 30000 LKR should be 24000 LKR");

  // Test fractional rounding (15% off on $79) -> 79 * 0.85 = 67.15
  assert(getDiscountedPrice(79, 15, true) === 67.15, "15% discount on $79 should be $67.15");

  // 2. Testing getBundlePricingForLevel helper
  console.log("Step 2: Testing getBundlePricingForLevel with discount enabled...");
  const sampleBundle: TokenBundle = {
    id: "test-discount-bundle-1",
    name: "20 Hours Test Pack",
    hours: 20,
    tokens: 20,
    price: 100,
    lkrPrice: 30000,
    olPrice: 80,
    olLkrPrice: 24000,
    discountPercent: 25,
    discountEnabled: true,
    popular: false,
    badge: "Discounted",
    description: "Test bundle for discounts",
    roleTarget: "20 Tokens",
    ctaText: "Enroll Now",
    features: ["Feature 1", "Feature 2"],
  };

  const alPricing = getBundlePricingForLevel(sampleBundle, "AL");
  assert(alPricing.originalPrice === 100, "A/L original USD price should be 100");
  assert(alPricing.originalLkrPrice === 30000, "A/L original LKR price should be 30000");
  assert(alPricing.price === 75, "A/L 25% discounted USD price should be 75");
  assert(alPricing.lkrPrice === 22500, "A/L 25% discounted LKR price should be 22500");

  const olPricing = getBundlePricingForLevel(sampleBundle, "OL");
  assert(olPricing.originalPrice === 80, "O/L original USD price should be 80");
  assert(olPricing.originalLkrPrice === 24000, "O/L original LKR price should be 24000");
  assert(olPricing.price === 60, "O/L 25% discounted USD price should be 60");
  assert(olPricing.lkrPrice === 18000, "O/L 25% discounted LKR price should be 18000");

  // 3. Testing formatStudentPrice
  console.log("Step 3: Testing formatStudentPrice with discount parameters...");
  // International USD student (A/L)
  const usdFormatted = formatStudentPrice(100, "United Kingdom", 30000, "AL", undefined, undefined, 20, true);
  assert(usdFormatted === "USD 80.00", `Expected USD 80.00 but got ${usdFormatted}`);

  // Sri Lankan LKR student (A/L)
  const lkrFormatted = formatStudentPrice(100, "Sri Lanka", 30000, "AL", undefined, undefined, 20, true);
  assert(lkrFormatted === "LKR 24,000", `Expected LKR 24,000 but got ${lkrFormatted}`);

  // International USD student (O/L with olPrice 80, 25% discount) -> 60.00
  const olUsdFormatted = formatStudentPrice(100, "United Kingdom", 30000, "OL", 80, 24000, 25, true);
  assert(olUsdFormatted === "USD 60.00", `Expected USD 60.00 but got ${olUsdFormatted}`);

  // Sri Lankan LKR student (O/L with olLkrPrice 24000, 25% discount) -> 18000
  const olLkrFormatted = formatStudentPrice(100, "Sri Lanka", 30000, "OL", 80, 24000, 25, true);
  assert(olLkrFormatted === "LKR 18,000", `Expected LKR 18,000 but got ${olLkrFormatted}`);

  // 4. Testing getBundlePriceDetails
  console.log("Step 4: Testing getBundlePriceDetails helper...");
  const priceDetails = getBundlePriceDetails(sampleBundle, "Sri Lanka", "AL");
  assert(priceDetails.hasDiscount === true, "hasDiscount should be true");
  assert(priceDetails.discountPercent === 25, "discountPercent should be 25");
  assert(priceDetails.originalAmount === 30000, "originalAmount should be 30000");
  assert(priceDetails.discountedAmount === 22500, "discountedAmount should be 22500");
  assert(priceDetails.displayPriceText === "Rs. 22,500", `displayPriceText should be 'Rs. 22,500', got '${priceDetails.displayPriceText}'`);

  // 5. Database Integration: Saving and Reading token bundles with discounts
  console.log("Step 5: Testing database persistence of discount fields in TokenBundle...");
  const testBundleId = `test-bundle-discount-${Date.now()}`;
  await prisma.tokenBundle.create({
    data: {
      id: testBundleId,
      name: "Promo Autumn Pack",
      hours: 15,
      tokens: 15,
      price: 60,
      lkrPrice: 18000,
      olPrice: 48,
      olLkrPrice: 14400,
      discountPercent: 30,
      discountEnabled: true,
      popular: true,
      badge: "Autumn Promo",
      description: "Limited time discount pack",
      roleTarget: "15 Tokens",
      ctaText: "Grab 30% Off",
      features: ["Perk 1", "Perk 2"],
    },
  });

  const savedBundle = await prisma.tokenBundle.findUnique({
    where: { id: testBundleId },
  });
  assert(Boolean(savedBundle), "Saved bundle should exist in database");
  assert(savedBundle!.discountPercent === 30, `Expected discountPercent=30, got ${savedBundle!.discountPercent}`);
  assert(savedBundle!.discountEnabled === true, `Expected discountEnabled=true, got ${savedBundle!.discountEnabled}`);

  // Also test reading via getBundles()
  const allBundles = await getBundles();
  const foundInAll = allBundles.find((b) => b.id === testBundleId);
  assert(Boolean(foundInAll), "Bundle should be returned by getBundles()");
  assert(foundInAll!.discountPercent === 30, "getBundles() should map discountPercent correctly");
  assert(foundInAll!.discountEnabled === true, "getBundles() should map discountEnabled correctly");

  // Clean up test bundle
  await prisma.tokenBundle.delete({
    where: { id: testBundleId },
  });

  console.log("=== ALL TOKEN PACKAGE DISCOUNT TESTS PASSED! ===");
  process.exit(0);
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
