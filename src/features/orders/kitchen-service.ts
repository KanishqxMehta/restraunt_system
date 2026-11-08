import "server-only";
import { orderScope, requireRole, type Viewer } from "@/features/auth/policy";
import { serializable } from "@/server/db/transaction";
import { HttpError } from "@/server/http/errors";
import { stageActions, type KitchenStage } from "./stages";
import { dispatchOrderNotifications } from "@/features/notifications/dispatcher";

export async function advanceKitchenStage(
  viewer: Viewer,
  id: string,
  expectedStage: KitchenStage,
) {
  requireRole(viewer, ["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
  const next = stageActions[expectedStage].next;

  const result = await serializable(async (transaction) => {
    const where = { id, ...orderScope(viewer), paymentStatus: "PAID" as const };
    const order = await transaction.order.findFirst({
      where,
      select: { status: true, isCatering: true, cateringStatus: true },
    });
    if (!order) throw new HttpError(404, "Kitchen ticket not found.");
    if (order.isCatering && order.cateringStatus !== "CONFIRMED") {
      throw new HttpError(
        409,
        "Bulk or party orders cannot change state until confirmed by the Catering Manager.",
      );
    }
    if (order.status !== expectedStage) {
      throw new HttpError(
        409,
        "This ticket already changed. Check its current stage.",
      );
    }

    await transaction.order.update({
      where: { ...where, status: expectedStage },
      data: {
        status: next,
        events: { create: { status: next, actorId: viewer.id } },
      },
    });
    return { id, status: next };
  });

  if (result.status === "PREPARING") {
    void dispatchOrderNotifications(id, "COOKING_STARTED");
  } else if (result.status === "READY") {
    void dispatchOrderNotifications(id, "READY_FOR_PICKUP");
  } else if (result.status === "HANDED_OFF") {
    void dispatchOrderNotifications(id, "ORDER_HANDED_OFF");
  }

  return result;
}

export async function overrideOrderPromise(
  viewer: Viewer,
  id: string,
  extraMinutes: number,
  reason: string,
) {
  requireRole(viewer, ["KITCHEN_STAFF", "CENTRAL_ADMIN"]);

  if (extraMinutes < 1 || extraMinutes > 180) {
    throw new HttpError(400, "Extra minutes must be between 1 and 180.");
  }
  if (!reason.trim()) {
    throw new HttpError(400, "A reason for overriding the promise is required.");
  }

  const result = await serializable(async (transaction) => {
    const where = { id, ...orderScope(viewer), paymentStatus: "PAID" as const };
    const order = await transaction.order.findFirst({
      where,
      select: {
        id: true,
        status: true,
        promisedReadyAt: true,
        isCatering: true,
        cateringStatus: true,
      },
    });
    if (!order) throw new HttpError(404, "Kitchen ticket not found.");
    if (order.isCatering && order.cateringStatus !== "CONFIRMED") {
      throw new HttpError(
        409,
        "Bulk or party orders cannot be modified until confirmed by the Catering Manager.",
      );
    }
    if (order.status === "HANDED_OFF" || order.status === "CANCELLED") {
      throw new HttpError(409, "Cannot adjust promise for completed orders.");
    }

    const now = new Date();
    const newPromisedReadyAt = new Date(now.getTime() + extraMinutes * 60_000);

    await transaction.order.update({
      where: { id },
      data: {
        promisedReadyAt: newPromisedReadyAt,
        estimateSource: "MANAGER_OVERRIDE",
        managerOverrideReason: reason.trim(),
      },
    });

    return {
      id,
      promisedReadyAt: newPromisedReadyAt.toISOString(),
      estimateSource: "MANAGER_OVERRIDE",
      managerOverrideReason: reason.trim(),
    };
  });

  void dispatchOrderNotifications(id, "PROMISE_EXTENDED", {
    extraMinutes,
    reason: reason.trim(),
  });

  return result;
}
