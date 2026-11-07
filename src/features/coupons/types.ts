export type DiscountType = "PERCENT" | "FLAT";

export interface CouponItem {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number; // percentage (e.g. 10) or flat discount in paise
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  isActive: boolean;
  startsAt: string; // ISO string
  expiresAt: string; // ISO string
  redemptionCount: number;
  totalDiscountGivenPaise: number;
}

export interface CouponFormInput {
  code: string;
  discountType: DiscountType;
  value: number; // in % (e.g. 10) or in ₹ (e.g. 50)
  minOrderRupees: number;
  maxDiscountRupees: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
}

export interface CouponMetrics {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountGivenPaise: number;
  topCouponCode: string | null;
}
