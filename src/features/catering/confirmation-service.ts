import "server-only";
import { requireRole, type Viewer } from "@/features/auth/policy";
import { getDatabase } from "@/server/db/client";
import { HttpError } from "@/server/http/errors";
import { dispatchOrderNotifications } from "@/features/notifications/dispatcher";

export interface ConfirmCateringInput {
  action: "CONFIRM" | "DECLINE";
  notes?: string;
}

export async function confirmCateringOrder(
  viewer: Viewer,
  orderId: string,
  input: ConfirmCateringInput,
) {
  requireRole(viewer, ["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
  const db = getDatabase();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      outlet: true,
      customer: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) {
    throw new HttpError(404, "Order not found.");
  }

  if (!order.isCatering) {
    throw new HttpError(400, "This order is not a bulk catering booking.");
  }

  if (viewer.role === "KITCHEN_STAFF" && !viewer.outletIds.includes(order.outletId)) {
    throw new HttpError(403, "You do not have access to manage catering for this outlet.");
  }

  const newStatus = input.action === "CONFIRM" ? "CONFIRMED" : "DECLINED";
  const notes = input.notes?.trim() || (input.action === "CONFIRM" ? "Confirmed by catering manager" : "Declined by kitchen");

  const updated = await db.$transaction(async (tx) => {
    const res = await tx.order.update({
      where: { id: orderId },
      data: {
        cateringStatus: newStatus,
        cateringNotes: notes,
        cateringConfirmedAt: new Date(),
        cateringConfirmedBy: viewer.name,
        events: {
          create: {
            status: order.status,
            actorId: viewer.id,
          },
        },
      },
      include: {
        outlet: true,
      },
    });

    return res;
  });

  // Dispatch simulated customer notification
  await dispatchOrderNotifications(updated.id, "ORDER_CONFIRMED", {
    reason: `Catering booking #${updated.orderNumber} ${newStatus.toLowerCase()} by Catering Manager ${viewer.name}. Notes: "${notes}"`,
  });

  return {
    id: updated.id,
    cateringStatus: updated.cateringStatus,
    cateringNotes: updated.cateringNotes,
    cateringConfirmedBy: updated.cateringConfirmedBy,
    cateringConfirmedAt: updated.cateringConfirmedAt?.toISOString(),
  };
}
