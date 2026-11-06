import { describe, it, expect } from "vitest";
import {
  calculatePointsEarned,
  calculateLoyaltyRedemption,
} from "@/features/loyalty/calculator";
import { calculateTotals } from "@/features/checkout/pricing";

describe("Customer Loyalty Points System (Brief Requirement)", () => {
  describe("Points Earning Logic", () => {
    it("earns 1 point per ₹10 spent (10 points per ₹100)", () => {
      // WEB-778120 sample order: ₹1,180 (118,000 paise)
      expect(calculatePointsEarned(118_000)).toBe(118);

      // WEB-778131 sample order: ₹640 (64,000 paise)
      expect(calculatePointsEarned(64_000)).toBe(64);

      // Free or 0 total earns 0 points
      expect(calculatePointsEarned(0)).toBe(0);
      expect(calculatePointsEarned(-500)).toBe(0);
    });
  });

  describe("Points Redemption at Checkout", () => {
    it("returns zero deduction when customer does not opt to redeem", () => {
      const result = calculateLoyaltyRedemption(250, 100_000, false);
      expect(result.pointsToRedeem).toBe(0);
      expect(result.discountPaise).toBe(0);
    });

    it("converts 100 points to ₹50 discount (50 paise per point)", () => {
      // 100 points on a ₹500 order (50,000 paise)
      const result = calculateLoyaltyRedemption(100, 50_000, true);
      expect(result.pointsToRedeem).toBe(100);
      expect(result.discountPaise).toBe(5_000); // ₹50.00
    });

    it("enforces 50% discount cap to protect restaurant margins", () => {
      // Customer has 1000 points (worth ₹500), but cart is only ₹400 (40,000 paise)
      // Max allowed discount is 50% of ₹400 = ₹200 (20,000 paise = 400 points)
      const result = calculateLoyaltyRedemption(1000, 40_000, true);
      expect(result.pointsToRedeem).toBe(400);
      expect(result.discountPaise).toBe(20_000); // ₹200.00
    });

    it("caps redemption to user's available points balance", () => {
      // Customer has only 60 points (worth ₹30 = 3,000 paise) on a ₹1000 order
      const result = calculateLoyaltyRedemption(60, 100_000, true);
      expect(result.pointsToRedeem).toBe(60);
      expect(result.discountPaise).toBe(3_000); // ₹30.00
    });
  });

  describe("Integration with Pricing & Inclusive 5% GST", () => {
    it("correctly integrates loyalty points with coupon savings and 5% GST", () => {
      const items = [{ quantity: 2, unitPricePaise: 50_000 }]; // ₹1,000 subtotal
      const coupon = {
        discountType: "PERCENT" as const,
        value: 10, // 10% off = ₹100
        minOrderPaise: 30_000,
        maxDiscountPaise: 10_000,
      };
      const loyalty = {
        availablePoints: 200, // worth ₹100 (10,000 paise)
        redeem: true,
      };

      const summary = calculateTotals(items, coupon, loyalty);

      expect(summary.subtotalPaise).toBe(100_000); // ₹1,000
      expect(summary.discountPaise).toBe(10_000); // ₹100 (coupon)
      expect(summary.pointsDiscountPaise).toBe(10_000); // ₹100 (loyalty)
      expect(summary.pointsRedeemed).toBe(200);
      expect(summary.totalPaise).toBe(80_000); // ₹800 final payable

      // Inclusive 5% GST on ₹800: Math.round(80,000 * 5 / 105) = 3,810 paise = ₹38.10
      expect(summary.includedTaxPaise).toBe(3_810);
      expect(summary.cgstPaise).toBe(1_905);
      expect(summary.sgstPaise).toBe(1_905);

      // Estimated points to earn on ₹800 = 80 points
      expect(summary.pointsEarnedEstimate).toBe(80);
    });
  });
});
