import {
  getLoyaltySettingsSync,
  type LoyaltySettings,
} from "./settings";

export interface LoyaltyCalculationResult {
  pointsToRedeem: number;
  discountPaise: number;
}

export function calculatePointsEarned(
  paidTotalPaise: number,
  settings: LoyaltySettings = getLoyaltySettingsSync(),
): number {
  if (paidTotalPaise <= 0) return 0;
  const paisePerPoint = settings.earnRupeesPerPoint * 100;
  return Math.floor(paidTotalPaise / paisePerPoint);
}

export function calculateLoyaltyRedemption(
  availablePoints: number,
  payablePaise: number,
  redeemRequested: boolean,
  settings: LoyaltySettings = getLoyaltySettingsSync(),
): LoyaltyCalculationResult {
  if (!redeemRequested || availablePoints <= 0 || payablePaise <= 0) {
    return { pointsToRedeem: 0, discountPaise: 0 };
  }

  // Max discount allowed is capped by loyalty policy (default 50% of the payable cart total)
  const maxAllowedDiscountPaise = Math.floor(
    (payablePaise * settings.maxRebatePercent) / 100,
  );

  // Maximum points that could be converted within the discount cap
  const maxUsablePoints = Math.floor(
    maxAllowedDiscountPaise / settings.redeemPaisePerPoint,
  );

  // Effective points to redeem
  const pointsToRedeem = Math.min(availablePoints, maxUsablePoints);
  const discountPaise = pointsToRedeem * settings.redeemPaisePerPoint;

  return {
    pointsToRedeem,
    discountPaise,
  };
}
