import "server-only";
import { requireRole, type Viewer } from "@/features/auth/policy";
import { HttpError } from "@/server/http/errors";
import { serializable } from "@/server/db/transaction";
import { quoteInputSchema } from "./validation";
import { fingerprint } from "./snapshot";
import type { z } from "zod";
import type { mockPaymentSchema } from "./validation";
import { buildSnapshot } from "./quote-service";
import {
  fetchOutletKitchenLoad,
  predictKitchenPrepTime,
} from "@/features/orders/ai-estimation";
import {
  deductLoyaltyPoints,
  creditLoyaltyPoints,
} from "@/features/loyalty/service";
import { dispatchOrderNotifications } from "@/features/notifications/dispatcher";

export async function processMockPayment(
  viewer: Viewer,
  orderId: string,
  input: z.infer<typeof mockPaymentSchema>,
) {
  requireRole(viewer, ["CUSTOMER"]);
  const result = await serializable(async (transaction) => {
    const order = await transaction.order.findFirst({
      where: { id: orderId, customerId: viewer.id },
      include: { quote: true },
    });
    if (!order) throw new HttpError(404, "Order not found.");
    const prior = await transaction.paymentAttempt.findUnique({
      where: {
        orderId_idempotencyKey: {
          orderId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (
      prior &&
      (prior.outcome !== input.outcome || prior.method !== input.method)
    )
      throw new HttpError(
        409,
        "This payment key was already used for another attempt.",
      );
    if (order.paymentStatus === "PAID" || prior)
      return {
        id: order.id,
        paid: order.paymentStatus === "PAID",
        outcome: prior?.outcome ?? "SUCCESS",
      };
    if (order.status !== "PENDING_PAYMENT")
      throw new HttpError(409, "This order cannot be paid.");
    const now = new Date();
    if (!order.paymentExpiresAt || order.paymentExpiresAt <= now)
      throw new HttpError(
        410,
        "This payment session expired. Start checkout again.",
      );
    let promisedReadyAt = order.promisedReadyAt;
    let couponId: string | undefined;
    let estimateSource = order.estimateSource;
    let aiEstimatedMinutes: number | null = null;
    let aiExplanation: string | null = null;

    if (input.outcome === "SUCCESS") {
      if (!order.quote)
        throw new HttpError(
          409,
          "The original checkout quote is missing. Start checkout again.",
        );
      const { snapshot, coupon, outlet } = await buildSnapshot(
        quoteInputSchema.parse(order.quote.input),
        viewer,
        transaction,
        now,
      );
      if (fingerprint(snapshot) !== order.quote.fingerprint)
        throw new HttpError(
          409,
          "Price or availability changed before payment. Start checkout again and confirm the new total.",
        );
      couponId = coupon?.id;

      // Predict honest preparation time based on current live kitchen load
      const load = await fetchOutletKitchenLoad(outlet.id, transaction);
      const prepResult = await predictKitchenPrepTime(
        snapshot.items.map((i) => ({
          name: i.name,
          portionName: i.portionName,
          quantity: i.quantity,
          prepMinutes: i.prepMinutes,
          isVeg: i.isVeg,
        })),
        {
          id: outlet.id,
          name: outlet.name,
          minimumPrepMinutes: outlet.minimumPrepMinutes,
          packingMinutes: outlet.packingMinutes,
        },
        load,
      );

      promisedReadyAt = new Date(
        now.getTime() + prepResult.promisedMinutes * 60_000,
      );
      estimateSource = prepResult.estimateSource;
      aiEstimatedMinutes = prepResult.aiEstimatedMinutes;
      aiExplanation = prepResult.explanation;
    }
    await transaction.paymentAttempt.create({
      data: {
        orderId,
        idempotencyKey: input.idempotencyKey,
        method: input.method,
        outcome: input.outcome,
      },
    });
    if (input.outcome === "SUCCESS") {
      await transaction.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          paymentMethod: input.method,
          status: "NEW",
          promisedReadyAt,
          originalPromiseAt: promisedReadyAt,
          estimateSource,
          aiEstimatedMinutes,
          aiExplanation,
          events: { create: { status: "NEW" } },
        },
      });
      if (couponId)
        await transaction.couponRedemption.create({
          data: { couponId, orderId, customerId: viewer.id },
        });

      if (order.pointsRedeemed > 0) {
        await deductLoyaltyPoints(
          transaction,
          viewer.id,
          order.id,
          order.orderNumber,
          order.pointsRedeemed,
        );
      }

      if (order.pointsEarned > 0) {
        await creditLoyaltyPoints(
          transaction,
          viewer.id,
          order.id,
          order.orderNumber,
          order.pointsEarned,
        );
      }
    } else {
      await transaction.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: input.outcome === "FAILED" ? "FAILED" : "PENDING",
        },
      });
    }
    return {
      id: orderId,
      paid: input.outcome === "SUCCESS",
      outcome: input.outcome,
    };
  });

  if (result.paid) {
    void dispatchOrderNotifications(orderId, "ORDER_CONFIRMED");
  }

  return result;
}
