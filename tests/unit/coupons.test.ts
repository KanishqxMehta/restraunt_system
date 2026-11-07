import { describe, expect, it } from "vitest";
import { calculateTotals } from "@/features/checkout/pricing";

describe("Coupon Validation and Checkout Integration", () => {
  const sampleItems = [
    { quantity: 2, unitPricePaise: 25_000 }, // ₹500 subtotal
  ];

  it("applies a percentage coupon with maximum savings cap", () => {
    // 20% off with max ₹80 cap on ₹500 order
    // 20% of ₹500 = ₹100, but capped at ₹80 (8,000 paise)
    const coupon = {
      discountType: "PERCENT" as const,
      value: 20,
      minOrderPaise: 30_000,
      maxDiscountPaise: 8_000,
    };

    const totals = calculateTotals(sampleItems, coupon);
    expect(totals.subtotalPaise).toBe(50_000); // ₹500
    expect(totals.discountPaise).toBe(8_000); // capped at ₹80
    expect(totals.totalPaise).toBe(42_000); // ₹420 final payable
  });

  it("applies a flat rupee coupon directly", () => {
    // Flat ₹75 discount (7,500 paise) on ₹500 order
    const coupon = {
      discountType: "FLAT" as const,
      value: 7_500,
      minOrderPaise: 20_000,
      maxDiscountPaise: null,
    };

    const totals = calculateTotals(sampleItems, coupon);
    expect(totals.subtotalPaise).toBe(50_000);
    expect(totals.discountPaise).toBe(7_500); // ₹75
    expect(totals.totalPaise).toBe(42_500); // ₹425 final payable
  });

  it("rejects coupon if cart does not meet minimum order spend", () => {
    // Cart is ₹500, but coupon requires min ₹800
    const coupon = {
      discountType: "PERCENT" as const,
      value: 15,
      minOrderPaise: 80_000,
      maxDiscountPaise: null,
    };

    expect(() => calculateTotals(sampleItems, coupon)).toThrowError(
      "Your cart does not meet this coupon's minimum spend.",
    );
  });

  it("correctly calculates inclusive 5% GST after coupon deductions", () => {
    // Subtotal: ₹1,000 (100,000 paise)
    // Coupon: 10% off (₹100 discount = 10,000 paise)
    // Final payable: ₹900 (90,000 paise)
    const items = [{ quantity: 1, unitPricePaise: 100_000 }];
    const coupon = {
      discountType: "PERCENT" as const,
      value: 10,
      minOrderPaise: 50_000,
      maxDiscountPaise: 20_000,
    };

    const totals = calculateTotals(items, coupon);
    expect(totals.totalPaise).toBe(90_000); // ₹900
    // Inclusive 5% GST: Math.round(90,000 * 5 / 105) = 4,286 paise = ₹42.86
    expect(totals.includedTaxPaise).toBe(4_286);
    expect(totals.cgstPaise).toBe(2_143);
    expect(totals.sgstPaise).toBe(2_143);
  });
});
