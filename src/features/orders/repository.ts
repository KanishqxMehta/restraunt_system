import type { Prisma } from "@/generated/prisma/client";
import "server-only";
import { getDatabase } from "@/server/db/client";
import { orderScope, requireRole, type Viewer } from "@/features/auth/policy";
import { HttpError } from "@/server/http/errors";

const orderSelection = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  totalPaise: true,
  subtotalPaise: true,
  discountPaise: true,
  couponCode: true,
  deliveryAddress: true,
  paymentMethod: true,
  paymentExpiresAt: true,
  includedTaxPaise: true,
  promisedReadyAt: true,
  originalPromiseAt: true,
  estimateSource: true,
  createdAt: true,
  outlet: { select: { id: true, name: true, fssaiLicense: true } },
  items: {
    select: {
      name: true,
      portionName: true,
      quantity: true,
      unitPricePaise: true,
      isVeg: true,
      allergens: true,
      addons: true,
    },
  },
} as const;

export async function listOrders(viewer: Viewer) {
  const orders = await getDatabase().order.findMany({
    where: orderScope(viewer),
    select: orderSelection,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return withLateness(orders);
}

export async function findOrder(viewer: Viewer, id: string) {
  const order = await getDatabase().order.findFirst({
    where: { AND: [{ id }, orderScope(viewer)] },
    select: orderSelection,
  });
  if (!order) throw new HttpError(404, "Order not found.");
  return order;
}

export async function listKitchenOrders(viewer: Viewer) {
  requireRole(viewer, ["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
  const orders = await getDatabase().order.findMany({
    where: {
      AND: [
        orderScope(viewer),
        {
          paymentStatus: "PAID",
          status: { in: ["NEW", "PREPARING", "READY"] },
        },
      ],
    },
    select: orderSelection,
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return withLateness(orders);
}

function withLateness(
  orders: Prisma.OrderGetPayload<{ select: typeof orderSelection }>[],
) {
  const now = Date.now();
  return orders.map((order) => ({
    ...order,
    isLate:
      ["NEW", "PREPARING"].includes(order.status) &&
      order.promisedReadyAt.getTime() < now,
  }));
}
