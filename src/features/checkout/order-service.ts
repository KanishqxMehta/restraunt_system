import "server-only";
import { requireRole, type Viewer } from "@/features/auth/policy";
import { HttpError } from "@/server/http/errors";
import { serializable } from "@/server/db/transaction";
import { quoteInputSchema } from "./validation";
import { asJson, fingerprint } from "./snapshot";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { createOrderSchema } from "./validation";
import { buildSnapshot } from "./quote-service";
const PAYMENT_LIFETIME_MS = 10 * 60_000;
export async function createPendingOrder(
  viewer: Viewer,
  input: z.infer<typeof createOrderSchema>,
) {
  requireRole(viewer, ["CUSTOMER"]);
  return serializable(async (transaction) => {
    const existing = await transaction.order.findFirst({
      where: {
        customerId: viewer.id,
        OR: [
          { idempotencyKey: input.idempotencyKey },
          { quoteId: input.quoteId },
        ],
      },
    });
    if (existing) {
      if (
        existing.quoteId !== input.quoteId ||
        existing.deliveryAddress !== input.deliveryAddress
      )
        throw new HttpError(
          409,
          "This checkout key was already used for a different order.",
        );
      return { id: existing.id, orderNumber: existing.orderNumber };
    }
    const quote = await transaction.checkoutQuote.findFirst({
      where: { id: input.quoteId, customerId: viewer.id },
    });
    if (!quote) throw new HttpError(404, "Checkout quote not found.");
    const now = new Date();
    if (quote.expiresAt <= now)
      throw new HttpError(
        409,
        "Your quote expired. Review a fresh total before ordering.",
      );
    const cart = quoteInputSchema.parse(quote.input);
    const { snapshot } = await buildSnapshot(cart, viewer, transaction, now);
    if (fingerprint(snapshot) !== quote.fingerprint)
      throw new HttpError(
        409,
        "The menu or price changed. Review a fresh total before ordering.",
      );
    const promisedReadyAt = new Date(
      now.getTime() + snapshot.provisionalMinutes * 60_000,
    );
    const order = await transaction.order.create({
      data: {
        orderNumber: `WEB-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
        customerId: viewer.id,
        outletId: snapshot.outletId,
        quoteId: quote.id,
        idempotencyKey: input.idempotencyKey,
        paymentMethod: input.paymentMethod,
        subtotalPaise: snapshot.subtotalPaise,
        discountPaise: snapshot.discountPaise,
        pointsDiscountPaise: snapshot.pointsDiscountPaise ?? 0,
        pointsRedeemed: snapshot.pointsRedeemed ?? 0,
        pointsEarned: snapshot.pointsEarnedEstimate ?? 0,
        totalPaise: snapshot.totalPaise,
        includedTaxPaise: snapshot.includedTaxPaise,
        couponCode: snapshot.couponCode,
        deliveryAddress: input.deliveryAddress,
        deliveryLatitude: cart.location.latitude,
        deliveryLongitude: cart.location.longitude,
        promisedReadyAt,
        originalPromiseAt: promisedReadyAt,
        paymentExpiresAt: new Date(now.getTime() + PAYMENT_LIFETIME_MS),
        items: {
          create: snapshot.items.map((item) => ({
            name: item.name,
            portionName: item.portionName,
            quantity: item.quantity,
            unitPricePaise: item.unitPricePaise,
            prepMinutes: item.prepMinutes,
            isVeg: item.isVeg,
            allergens: item.allergens,
            addons: asJson(item.addons),
          })),
        },
        events: { create: { status: "PENDING_PAYMENT" } },
      },
      select: { id: true, orderNumber: true },
    });
    return order;
  });
}
