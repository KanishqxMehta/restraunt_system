import "server-only";
import { requireRole, type Viewer } from "@/features/auth/policy";
import { HttpError } from "@/server/http/errors";
import { serializable } from "@/server/db/transaction";
import type { QuoteInput } from "./validation";
import { asJson, fingerprint } from "./snapshot";
import type { Prisma } from "@/generated/prisma/client";
import { loadCatalog } from "@/features/menu/customer-repository";
import { distanceKm, isOpenAt } from "@/features/outlets/serviceability";
import { calculateTotals, priceLines } from "./pricing";
import type { QuoteSnapshot, CheckoutQuote } from "./types";
const QUOTE_LIFETIME_MS = 5 * 60_000;
async function validateCoupon(
  code: string | undefined,
  customerId: string,
  transaction: Prisma.TransactionClient,
  now: Date,
) {
  if (!code) return undefined;
  const coupon = await transaction.coupon.findUnique({ where: { code } });
  if (
    !coupon ||
    !coupon.isActive ||
    coupon.startsAt > now ||
    coupon.expiresAt <= now
  )
    throw new HttpError(400, "This coupon is invalid, inactive or expired.");
  const total = await transaction.couponRedemption.count({
    where: { couponId: coupon.id },
  });
  const customer = await transaction.couponRedemption.count({
    where: { couponId: coupon.id, customerId },
  });
  if (
    (coupon.usageLimit !== null && total >= coupon.usageLimit) ||
    (coupon.perCustomerLimit !== null && customer >= coupon.perCustomerLimit)
  )
    throw new HttpError(
      409,
      "This coupon has reached its usage limit. Review your total without it.",
    );
  return coupon;
}

export async function buildSnapshot(
  input: QuoteInput,
  viewer: Viewer,
  transaction: Prisma.TransactionClient,
  now: Date,
) {
  const { outlet, items } = await loadCatalog(input.outletId, transaction);
  if (!isOpenAt(outlet.opensAtMinute, outlet.closesAtMinute, now))
    throw new HttpError(
      409,
      "This outlet is closed. Choose another eligible outlet.",
    );
  if (distanceKm(input.location, outlet) > outlet.deliveryRadiusKm)
    throw new HttpError(
      400,
      "Your location is outside this outlet's delivery radius.",
    );
  const pricedItems = priceLines(input.lines, items, now);
  const coupon = await validateCoupon(
    input.couponCode,
    viewer.id,
    transaction,
    now,
  );
  const totals = calculateTotals(pricedItems, coupon);
  const snapshot: QuoteSnapshot = {
    ...totals,
    items: pricedItems,
    couponCode: coupon?.code ?? null,
    provisionalMinutes: outlet.minimumPrepMinutes + outlet.packingMinutes,
    outletId: outlet.id,
  };
  return { snapshot, coupon };
}

export async function createQuote(
  viewer: Viewer,
  input: QuoteInput,
): Promise<CheckoutQuote> {
  requireRole(viewer, ["CUSTOMER"]);
  return serializable(async (transaction) => {
    const now = new Date();
    const { snapshot } = await buildSnapshot(input, viewer, transaction, now);
    const quote = await transaction.checkoutQuote.create({
      data: {
        customerId: viewer.id,
        input: asJson(input),
        fingerprint: fingerprint(snapshot),
        snapshot: asJson(snapshot),
        expiresAt: new Date(now.getTime() + QUOTE_LIFETIME_MS),
      },
    });
    return {
      ...snapshot,
      id: quote.id,
      expiresAt: quote.expiresAt.toISOString(),
    };
  });
}
