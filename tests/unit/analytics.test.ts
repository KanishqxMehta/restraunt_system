import { describe, expect, it } from "vitest";
import {
  calculateDirectCommissionSavings,
  calculateCateringMarginCaptured,
  calculateTotalValueCaptured,
  calculateTargetProgressPercent,
  calculateMarketingOptInPercent,
  calculateOnTimeSlaPercent,
  calculateCancellationRatePercent,
  calculateRepeatCustomerRatePercent,
  calculateCustomDirectSavings,
  ANNUAL_SAVINGS_TARGET_PAISE,
  NET_DIRECT_SAVINGS_RATE,
  BULK_CATERING_MARGIN_RATE,
} from "@/features/analytics/calculator";

describe("Executive Analytics Calculator", () => {
  it("calculates 15% net commission savings on direct online orders", () => {
    // ₹10,000 GMV = 1,000,000 paise -> 15% = 150,000 paise (₹1,500)
    const directGmvPaise = 1_000_000;
    const savings = calculateDirectCommissionSavings(directGmvPaise);
    expect(savings).toBe(150_000);
    expect(NET_DIRECT_SAVINGS_RATE).toBe(0.15);
  });

  it("calculates 30% margin captured on bulk party catering orders", () => {
    // ₹18,000 catering order = 1,800,000 paise -> 30% margin = 540,000 paise (₹5,400)
    const cateringGmvPaise = 1_800_000;
    const margin = calculateCateringMarginCaptured(cateringGmvPaise);
    expect(margin).toBe(540_000);
    expect(BULK_CATERING_MARGIN_RATE).toBe(0.30);
  });

  it("combines direct savings and catering margins into total captured value", () => {
    const directGmvPaise = 1_000_000; // ₹1,500 savings
    const cateringGmvPaise = 1_800_000; // ₹5,400 margin
    const total = calculateTotalValueCaptured(directGmvPaise, cateringGmvPaise);
    expect(total).toBe(150_000 + 540_000); // ₹6,900
  });

  it("computes progress towards the ₹1.14 Crore annual savings target", () => {
    expect(ANNUAL_SAVINGS_TARGET_PAISE).toBe(1_144_800_000); // ₹1,14,48,000 in paise
    // If we capture ₹11.448 Lakh (10% of target)
    const tenPercent = ANNUAL_SAVINGS_TARGET_PAISE * 0.1;
    const progress = calculateTargetProgressPercent(tenPercent);
    expect(progress).toBe(10);

    // Negative or zero
    expect(calculateTargetProgressPercent(0)).toBe(0);
    expect(calculateTargetProgressPercent(-100)).toBe(0);
  });

  it("computes DPDP marketing opt-in percentage", () => {
    expect(calculateMarketingOptInPercent(45, 100)).toBe(45);
    expect(calculateMarketingOptInPercent(0, 0)).toBe(0);
  });

  it("computes Kitchen on-time SLA percentage", () => {
    expect(calculateOnTimeSlaPercent(95, 100)).toBe(95);
    expect(calculateOnTimeSlaPercent(0, 0)).toBe(100); // 0 completed defaults to 100%
  });

  it("computes order cancellation rate percentage", () => {
    expect(calculateCancellationRatePercent(2, 30)).toBe(6.7);
    expect(calculateCancellationRatePercent(0, 25)).toBe(0);
    expect(calculateCancellationRatePercent(0, 0)).toBe(0);
  });

  it("computes repeat customer retention rate percentage", () => {
    expect(calculateRepeatCustomerRatePercent(7, 20)).toBe(35);
    expect(calculateRepeatCustomerRatePercent(0, 10)).toBe(0);
    expect(calculateRepeatCustomerRatePercent(0, 0)).toBe(0);
  });

  it("computes custom direct commission savings from admin-configured rates", () => {
    // 25% aggregator - 10% direct cost = 15% net saved
    expect(calculateCustomDirectSavings(1_000_000, 25, 10)).toBe(150_000);
    // 30% aggregator - 12% direct cost = 18% net saved
    expect(calculateCustomDirectSavings(1_000_000, 30, 12)).toBe(180_000);
    // Never negative if direct cost >= aggregator rate
    expect(calculateCustomDirectSavings(1_000_000, 10, 15)).toBe(0);
  });
});
