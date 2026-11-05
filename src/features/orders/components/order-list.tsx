import Link from "next/link";
import { snapshotAddons } from "../snapshots";
import { Clock3 } from "lucide-react";
import type { listOrders } from "../repository";
import { formatMoney, formatTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/classes";

const statusLabels = {
  PENDING_PAYMENT: "Awaiting payment",
  NEW: "New order",
  PREPARING: "Preparing",
  READY: "Ready for pickup",
  HANDED_OFF: "Handed off",
  CANCELLED: "Cancelled",
};

export function OrderList({
  orders,
  showDetails = false,
}: {
  orders: Awaited<ReturnType<typeof listOrders>>;
  showDetails?: boolean;
}) {
  if (orders.length === 0)
    return (
      <EmptyState
        title="No orders yet"
        description="Orders you have access to will appear here. Browse the menu to place your first order."
      />
    );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {orders.map((order) => {
        const late = order.isLate;
        return (
          <article
            key={order.id}
            className={cn(
              "rounded-2xl border bg-[#fffdfa] p-6 shadow-xs transition hover:border-[#133d34]/40",
              late ? "border-red-300" : "border-[#ded5c6]",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#133d34]">
                  {showDetails ? (
                    <Link
                      href={`/orders/${order.id}`}
                      className="transition hover:text-[#0c2a23] underline decoration-[#ded5c6] underline-offset-4"
                    >
                      {order.orderNumber}
                    </Link>
                  ) : (
                    order.orderNumber
                  )}
                </h2>
                <p className="mt-1 text-sm text-[#635b50]">
                  {order.outlet.name}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  late
                    ? "border border-red-200 bg-red-50 text-red-800"
                    : order.status === "READY"
                      ? "border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]"
                      : "border border-[#e4d3f1] bg-[#f5effa] text-[#4a1d5a]",
                )}
              >
                {late ? "Past promised time · " : ""}
                {statusLabels[order.status]}
              </span>
            </div>
            <ul className="my-5 space-y-2 border-y border-[#ede6da] py-5">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-4 text-sm">
                  <span>
                    {item.quantity} × {item.name}
                    <span className="ml-1 text-stone-500">
                      ({item.portionName})
                      {snapshotAddons(item.addons).length
                        ? ` · ${snapshotAddons(item.addons)
                            .map((addon) => addon.name)
                            .join(", ")}`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-stone-600">
                    {formatMoney(item.unitPricePaise * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1 text-xs text-[#635b50]">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#133d34]">
                  <Clock3 className="h-4 w-4 text-[#4a1d5a]" aria-hidden="true" />
                  Promised ready: {formatTime(order.promisedReadyAt)}
                </p>
                <p>Provisional kitchen preparation time</p>
                <p>FSSAI: {order.outlet.fssaiLicense}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-[#133d34]">
                  {formatMoney(order.totalPaise)}
                </p>
                <p className="text-xs text-[#635b50]">Includes 5% GST</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
