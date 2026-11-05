import { describe, expect, it } from "vitest";
import {
  calculateCateringQuote,
  validateCateringLeadTime,
  MIN_CATERING_GUESTS,
} from "@/features/catering/calculator";

describe("Party & Bulk Catering Suite", () => {
  const baseTime = new Date("2026-11-06T10:00:00.000Z");

  it("validates preparation lead time constraints", () => {
    // 2 hours ahead -> Invalid (< 4h)
    const tooSoon = new Date("2026-11-06T12:00:00.000Z");
    const checkTooSoon = validateCateringLeadTime(tooSoon, baseTime);
    expect(checkTooSoon.isValid).toBe(false);
    expect(checkTooSoon.leadTimeHours).toBe(2);

    // 24 hours ahead -> Valid (>= 4h)
    const validTime = new Date("2026-11-07T10:00:00.000Z");
    const checkValid = validateCateringLeadTime(validTime, baseTime);
    expect(checkValid.isValid).toBe(true);
    expect(checkValid.leadTimeHours).toBe(24);
  });

  it("clamps minimum guest count to 15", () => {
    const validFuture = new Date(baseTime.getTime() + 24 * 3600 * 1000);
    const quote = calculateCateringQuote(
      {
        guestCount: 8, // below minimum
        vegPercentage: 0,
        biryaniChoice: "CHICKEN",
        packageTier: "ROYAL_DAAWAT",
        eventDateTime: validFuture,
      },
      baseTime,
    );

    expect(quote.guestCount).toBe(MIN_CATERING_GUESTS);
  });

  it("allocates sealed dum handis and accompaniments correctly for 30 guests", () => {
    const validFuture = new Date(baseTime.getTime() + 24 * 3600 * 1000);
    const quote = calculateCateringQuote(
      {
        guestCount: 30,
        vegPercentage: 30, // 9 Veg, 21 Non-veg
        biryaniChoice: "CHICKEN",
        packageTier: "ROYAL_DAAWAT",
        eventDateTime: validFuture,
      },
      baseTime,
    );

    expect(quote.vegCount).toBe(9);
    expect(quote.nonVegCount).toBe(21);
    expect(quote.handis.length).toBeGreaterThanOrEqual(2);

    // Verify accompaniments include Mirchi Ka Salan, Burani Raita, and Double Ka Meetha
    expect(quote.accompaniments.some((a) => a.includes("Mirchi Ka Salan"))).toBe(true);
    expect(quote.accompaniments.some((a) => a.includes("Burani Dahi Raita"))).toBe(true);
    expect(quote.accompaniments.some((a) => a.includes("Double Ka Meetha"))).toBe(true);
  });

  it("applies bulk celebration discount for 50+ guests and enforces 5% inclusive GST", () => {
    const validFuture = new Date(baseTime.getTime() + 24 * 3600 * 1000);
    const quote50 = calculateCateringQuote(
      {
        guestCount: 50,
        vegPercentage: 0,
        biryaniChoice: "CHICKEN",
        packageTier: "ROYAL_DAAWAT",
        eventDateTime: validFuture,
      },
      baseTime,
    );

    // 5% bulk discount for 50+ guests
    expect(quote50.bulkDiscountPaise).toBeGreaterThan(0);
    expect(quote50.totalPaise).toBe(quote50.subtotalPaise - quote50.bulkDiscountPaise);

    // 5% Inclusive GST formula check
    const expectedTax = Math.round(quote50.totalPaise - quote50.totalPaise / 1.05);
    expect(quote50.includedTaxPaise).toBe(expectedTax);
    expect(quote50.cgstPaise + quote50.sgstPaise).toBe(expectedTax);
  });

  it("adds premium starters and desserts for Nizami Feast tier", () => {
    const validFuture = new Date(baseTime.getTime() + 24 * 3600 * 1000);
    const standardQuote = calculateCateringQuote(
      {
        guestCount: 20,
        vegPercentage: 0,
        biryaniChoice: "CHICKEN",
        packageTier: "ROYAL_DAAWAT",
        eventDateTime: validFuture,
      },
      baseTime,
    );

    const nizamiQuote = calculateCateringQuote(
      {
        guestCount: 20,
        vegPercentage: 0,
        biryaniChoice: "CHICKEN",
        packageTier: "NIZAMI_FEAST",
        eventDateTime: validFuture,
      },
      baseTime,
    );

    // Nizami Feast includes Haleem/Starter and Gulab Jamun
    expect(nizamiQuote.accompaniments.some((a) => a.includes("Haleem"))).toBe(true);
    expect(nizamiQuote.accompaniments.some((a) => a.includes("Gulab Jamun"))).toBe(true);
    expect(nizamiQuote.subtotalPaise).toBeGreaterThan(standardQuote.subtotalPaise);
  });
});
