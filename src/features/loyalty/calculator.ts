import {
  PAISE_PER_POINT_EARNED,
  PAISE_PER_POINT_REDEEMED,
  MAX_LOYALTY_REBATE_PERCENT,
} from "./constants";

export interface LoyaltyCalculationResult {
  pointsToRedeem: number;
  discountPaise: number;
}

export function calculatePointsEarned(paidTotalPaise: number): number {
  if (paidTotalPaise <= 0) return 0;
  return Math.floor(paidTotalPaise / PAISE_PER_POINT_EARNED);
}

export function calculateLoyaltyRedemption(
  availablePoints: number,
  payablePaise: number,
  redeemRequested: boolean,
): LoyaltyCalculationResult {
  if (!redeemRequested || availablePoints <= 0 || payablePaise <= 0) {
    return { pointsToRedeem: 0, discountPaise: 0 };
  }

  // Max discount allowed is 50% of the payable cart total
  const maxAllowedDiscountPaise = Math.floor(
    (payablePaise * MAX_LOYALTY_REBATE_PERCENT) / 100,
  );

  // Maximum points that could be converted within the 50% discount cap
  const maxUsablePoints = Math.floor(
    maxAllowedDiscountPaise / PAISE_PER_POINT_REDEEMED,
  );

  // Effective points to redeem
  const pointsToRedeem = Math.min(availablePoints, maxUsablePoints);
  const discountPaise = pointsToRedeem * PAISE_PER_POINT_REDEEMED;

  return {
    pointsToRedeem,
    discountPaise,
  };
}
