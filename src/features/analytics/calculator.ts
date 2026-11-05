// Core financial constants from the Company A Hyderabad client brief
export const AGGREGATOR_COMMISSION_RATE = 0.27; // 27% average Swiggy/Zomato fee
export const DIRECT_FULFILLMENT_RATE = 0.12; // 12% direct payment + delivery costs
export const NET_DIRECT_SAVINGS_RATE = 0.15; // 15 points net margin kept by direct orders
export const BULK_CATERING_MARGIN_RATE = 0.30; // 30% margin on bulk party orders
export const ANNUAL_SAVINGS_TARGET_PAISE = 1_14_48_000 * 100; // ₹1.1448 Crore (₹95.04L direct + ₹19.44L catering)

/**
 * Calculates net commission saved on direct online orders (15% of GMV).
 */
export function calculateDirectCommissionSavings(directGmvPaise: number): number {
  if (directGmvPaise <= 0) return 0;
  return Math.round(directGmvPaise * NET_DIRECT_SAVINGS_RATE);
}

/**
 * Calculates net profit margin captured by direct bulk catering orders (30% of GMV).
 */
export function calculateCateringMarginCaptured(cateringGmvPaise: number): number {
  if (cateringGmvPaise <= 0) return 0;
  return Math.round(cateringGmvPaise * BULK_CATERING_MARGIN_RATE);
}

/**
 * Calculates total bottom-line value captured by direct channels.
 */
export function calculateTotalValueCaptured(directGmvPaise: number, cateringGmvPaise: number): number {
  return calculateDirectCommissionSavings(directGmvPaise) + calculateCateringMarginCaptured(cateringGmvPaise);
}

/**
 * Calculates progress percentage toward the ₹1.14 Crore annual target.
 */
export function calculateTargetProgressPercent(totalValueCapturedPaise: number): number {
  if (totalValueCapturedPaise <= 0) return 0;
  const percent = (totalValueCapturedPaise / ANNUAL_SAVINGS_TARGET_PAISE) * 100;
  return Math.min(100, Math.round(percent * 10) / 10);
}

/**
 * Computes DPDP marketing consent percentage.
 */
export function calculateMarketingOptInPercent(optedIn: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((optedIn / total) * 100);
}

/**
 * Computes Kitchen SLA compliance rate (on-time orders vs completed orders).
 */
export function calculateOnTimeSlaPercent(onTime: number, totalCompleted: number): number {
  if (totalCompleted <= 0) return 100;
  return Math.round((onTime / totalCompleted) * 100);
}
