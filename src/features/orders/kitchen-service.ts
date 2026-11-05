import "server-only";
import { orderScope, requireRole, type Viewer } from "@/features/auth/policy";
import { serializable } from "@/server/db/transaction";
import { HttpError } from "@/server/http/errors";
import { stageActions, type KitchenStage } from "./stages";

export async function advanceKitchenStage(
  viewer: Viewer,
  id: string,
  expectedStage: KitchenStage,
) {
  requireRole(viewer, ["KITCHEN_STAFF"]);
  const next = stageActions[expectedStage].next;

  return serializable(async (transaction) => {
    const where = { id, ...orderScope(viewer), paymentStatus: "PAID" as const };
    const order = await transaction.order.findFirst({
      where,
      select: { status: true },
    });
    if (!order) throw new HttpError(404, "Kitchen ticket not found.");
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
}
