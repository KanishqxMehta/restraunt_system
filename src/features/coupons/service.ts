import { getDatabase } from "@/server/db/client";
import { HttpError } from "@/server/http/errors";
import type { CouponFormInput, CouponItem, CouponMetrics } from "./types";

export async function listCoupons(): Promise<{
  coupons: CouponItem[];
  metrics: CouponMetrics;
}> {
  const db = getDatabase();
  const rawCoupons = await db.coupon.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      redemptions: {
        select: {
          id: true,
          order: {
            select: {
              discountPaise: true,
            },
          },
        },
      },
    },
  });

  let totalRedemptions = 0;
  let totalDiscountGivenPaise = 0;
  let activeCoupons = 0;
  let topCouponCode: string | null = null;
  let maxRedemptions = -1;

  const coupons: CouponItem[] = rawCoupons.map((c) => {
    const redemptionCount = c.redemptions.length;
    const discountGiven = c.redemptions.reduce(
      (sum, r) => sum + (r.order?.discountPaise ?? 0),
      0,
    );

    totalRedemptions += redemptionCount;
    totalDiscountGivenPaise += discountGiven;
    if (c.isActive && c.expiresAt > new Date()) {
      activeCoupons += 1;
    }

    if (redemptionCount > maxRedemptions && redemptionCount > 0) {
      maxRedemptions = redemptionCount;
      topCouponCode = c.code;
    }

    return {
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      value: c.value,
      minOrderPaise: c.minOrderPaise,
      maxDiscountPaise: c.maxDiscountPaise,
      usageLimit: c.usageLimit,
      perCustomerLimit: c.perCustomerLimit,
      isActive: c.isActive,
      startsAt: c.startsAt.toISOString(),
      expiresAt: c.expiresAt.toISOString(),
      redemptionCount,
      totalDiscountGivenPaise: discountGiven,
    };
  });

  const metrics: CouponMetrics = {
    totalCoupons: coupons.length,
    activeCoupons,
    totalRedemptions,
    totalDiscountGivenPaise,
    topCouponCode,
  };

  return { coupons, metrics };
}

export async function createCoupon(input: CouponFormInput): Promise<CouponItem> {
  const db = getDatabase();
  const normalizedCode = input.code.trim().toUpperCase();

  if (!normalizedCode || normalizedCode.length < 3) {
    throw new HttpError(400, "Coupon code must be at least 3 characters.");
  }

  const existing = await db.coupon.findUnique({
    where: { code: normalizedCode },
  });
  if (existing) {
    throw new HttpError(409, `Coupon code "${normalizedCode}" already exists.`);
  }

  const value =
    input.discountType === "PERCENT"
      ? Math.max(1, Math.min(100, Math.round(input.value)))
      : Math.max(100, Math.round(input.value * 100)); // convert ₹ to paise

  const minOrderPaise = Math.max(0, Math.round((input.minOrderRupees || 0) * 100));
  const maxDiscountPaise =
    input.maxDiscountRupees && input.maxDiscountRupees > 0
      ? Math.round(input.maxDiscountRupees * 100)
      : null;

  const startsAt = new Date(input.startsAt);
  const expiresAt = new Date(input.expiresAt);

  if (isNaN(startsAt.getTime()) || isNaN(expiresAt.getTime())) {
    throw new HttpError(400, "Invalid start or expiration date.");
  }
  if (expiresAt <= startsAt) {
    throw new HttpError(400, "Expiration date must be after the start date.");
  }

  const created = await db.coupon.create({
    data: {
      code: normalizedCode,
      discountType: input.discountType,
      value,
      minOrderPaise,
      maxDiscountPaise,
      usageLimit: input.usageLimit && input.usageLimit > 0 ? input.usageLimit : null,
      perCustomerLimit:
        input.perCustomerLimit && input.perCustomerLimit > 0
          ? input.perCustomerLimit
          : null,
      isActive: input.isActive ?? true,
      startsAt,
      expiresAt,
    },
  });

  return {
    id: created.id,
    code: created.code,
    discountType: created.discountType,
    value: created.value,
    minOrderPaise: created.minOrderPaise,
    maxDiscountPaise: created.maxDiscountPaise,
    usageLimit: created.usageLimit,
    perCustomerLimit: created.perCustomerLimit,
    isActive: created.isActive,
    startsAt: created.startsAt.toISOString(),
    expiresAt: created.expiresAt.toISOString(),
    redemptionCount: 0,
    totalDiscountGivenPaise: 0,
  };
}

export async function updateCoupon(
  id: string,
  input: Partial<CouponFormInput>,
): Promise<CouponItem> {
  const db = getDatabase();
  const existing = await db.coupon.findUnique({
    where: { id },
    include: {
      redemptions: {
        select: {
          id: true,
          order: { select: { discountPaise: true } },
        },
      },
    },
  });
  if (!existing) {
    throw new HttpError(404, "Coupon not found.");
  }

  const data: Record<string, unknown> = {};

  if (input.code !== undefined) {
    const normalized = input.code.trim().toUpperCase();
    if (!normalized || normalized.length < 3) {
      throw new HttpError(400, "Coupon code must be at least 3 characters.");
    }
    if (normalized !== existing.code) {
      const codeCheck = await db.coupon.findUnique({ where: { code: normalized } });
      if (codeCheck) {
        throw new HttpError(409, `Coupon code "${normalized}" already exists.`);
      }
      data.code = normalized;
    }
  }

  if (input.discountType !== undefined) {
    data.discountType = input.discountType;
  }

  if (input.value !== undefined) {
    const type = input.discountType ?? existing.discountType;
    data.value =
      type === "PERCENT"
        ? Math.max(1, Math.min(100, Math.round(input.value)))
        : Math.max(100, Math.round(input.value * 100));
  }

  if (input.minOrderRupees !== undefined) {
    data.minOrderPaise = Math.max(0, Math.round(input.minOrderRupees * 100));
  }

  if (input.maxDiscountRupees !== undefined) {
    data.maxDiscountPaise =
      input.maxDiscountRupees && input.maxDiscountRupees > 0
        ? Math.round(input.maxDiscountRupees * 100)
        : null;
  }

  if (input.usageLimit !== undefined) {
    data.usageLimit =
      input.usageLimit && input.usageLimit > 0 ? input.usageLimit : null;
  }

  if (input.perCustomerLimit !== undefined) {
    data.perCustomerLimit =
      input.perCustomerLimit && input.perCustomerLimit > 0
        ? input.perCustomerLimit
        : null;
  }

  if (input.isActive !== undefined) {
    data.isActive = Boolean(input.isActive);
  }

  if (input.startsAt !== undefined) {
    const startsAt = new Date(input.startsAt);
    if (isNaN(startsAt.getTime())) {
      throw new HttpError(400, "Invalid start date.");
    }
    data.startsAt = startsAt;
  }

  if (input.expiresAt !== undefined) {
    const expiresAt = new Date(input.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      throw new HttpError(400, "Invalid expiration date.");
    }
    data.expiresAt = expiresAt;
  }

  const updated = await db.coupon.update({
    where: { id },
    data,
    include: {
      redemptions: {
        select: {
          id: true,
          order: { select: { discountPaise: true } },
        },
      },
    },
  });

  const redemptionCount = updated.redemptions.length;
  const totalDiscountGivenPaise = updated.redemptions.reduce(
    (sum, r) => sum + (r.order?.discountPaise ?? 0),
    0,
  );

  return {
    id: updated.id,
    code: updated.code,
    discountType: updated.discountType,
    value: updated.value,
    minOrderPaise: updated.minOrderPaise,
    maxDiscountPaise: updated.maxDiscountPaise,
    usageLimit: updated.usageLimit,
    perCustomerLimit: updated.perCustomerLimit,
    isActive: updated.isActive,
    startsAt: updated.startsAt.toISOString(),
    expiresAt: updated.expiresAt.toISOString(),
    redemptionCount,
    totalDiscountGivenPaise,
  };
}

export async function deleteCoupon(id: string): Promise<{ deleted: boolean; archived: boolean }> {
  const db = getDatabase();
  const existing = await db.coupon.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!existing) {
    throw new HttpError(404, "Coupon not found.");
  }

  // If already used by customers, soft-archive (deactivate) so financial ledgers and order snapshots aren't orphaned
  if (existing._count.redemptions > 0) {
    await db.coupon.update({
      where: { id },
      data: { isActive: false },
    });
    return { deleted: false, archived: true };
  }

  await db.coupon.delete({ where: { id } });
  return { deleted: true, archived: false };
}
