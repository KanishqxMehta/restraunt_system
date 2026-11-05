import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import type { KitchenLoadSnapshot } from "./ai-estimation-logic";

export * from "./ai-estimation-logic";

/**
 * Loads current live kitchen load snapshot for an outlet from DB.
 */
export async function fetchOutletKitchenLoad(
  outletId: string,
  database: Prisma.TransactionClient | ReturnType<typeof getDatabase> = getDatabase(),
): Promise<KitchenLoadSnapshot> {
  const activeOrders = await database.order.findMany({
    where: {
      outletId,
      status: { in: ["NEW", "PREPARING"] },
      paymentStatus: "PAID",
    },
    select: {
      orderNumber: true,
      items: {
        select: {
          quantity: true,
        },
      },
    },
  });

  const activeTicketCount = activeOrders.length;
  const activeItemCount = activeOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );
  const activeOrderNumbers = activeOrders.map((o) => o.orderNumber);

  return {
    activeTicketCount,
    activeItemCount,
    activeOrderNumbers,
  };
}
