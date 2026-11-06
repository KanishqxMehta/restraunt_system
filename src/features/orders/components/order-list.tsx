import Link from "next/link";
import { snapshotAddons } from "../snapshots";
import { Clock3, ArrowUpRight, ShieldCheck } from "lucide-react";
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
        actionHref="/order"
        actionLabel="Explore the menu"
      />
    );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {orders.map((order) => {
        const late = order.isLate;
        return (
          <article
            key={order.id}
            className={cn(
              "group flex flex-col justify-between overflow-hidden rounded-[1.75rem] border bg-[#fffdfa] p-6 shadow-[0_6px_24px_rgba(20,18,14,0.04)] transition-all hover:border-[#0f352d]/45 hover:shadow-[0_14px_32px_rgba(15,53,45,0.08)]",
              late ? "border-red-300" : "border-[#dfd4c2]",
            )}
          >
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-mono text-lg font-extrabold tracking-tight text-[#0f352d]">
                    {showDetails ? (
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 underline decoration-[#c99b53] underline-offset-4 transition hover:text-[#08231d]"
                      >
                        {order.orderNumber}
                        <ArrowUpRight
                          className="h-4 w-4 text-[#c99b53]"
                          aria-hidden="true"
                        />
                      </Link>
                    ) : (
                      order.orderNumber
                    )}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#5f574c]">
                    {order.outlet.name}
                  </p>
                </div>

                <span
                  className={cn(
                    "rounded-full px-3.5 py-1 text-xs font-bold",
                    late
                      ? "border border-red-200 bg-red-50 text-red-800"
                      : order.status === "READY" ||
                          order.status === "HANDED_OFF"
                        ? "border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]"
                        : "border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]",
                  )}
                >
                  {late ? "Past promised time · " : ""}
                  {statusLabels[order.status]}
                </span>
              </div>

              <ul className="my-5 space-y-2.5 rounded-2xl border border-[#ece3d5] bg-[#faf7f2] p-4">
                {order.items.map((item, index) => (
                  <li
                    key={index}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <span className="font-medium text-[#1f1c18]">
                      <strong className="font-bold text-[#0f352d]">
                        {item.quantity} ×
                      </strong>{" "}
                      {item.name}
                      <span className="ml-1 text-xs text-[#655c50]">
                        ({item.portionName})
                        {snapshotAddons(item.addons).length
                          ? ` · ${snapshotAddons(item.addons)
                              .map((addon) => addon.name)
                              .join(", ")}`
                          : ""}
                      </span>
                    </span>
                    <span className="font-mono-tabular shrink-0 font-bold text-[#4e473d]">
                      {formatMoney(item.unitPricePaise * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 pt-1">
              <div className="space-y-1 text-xs text-[#635b50]">
                <p className="flex items-center gap-1.5 text-sm font-bold text-[#0f352d]">
                  <Clock3
                    className="h-4 w-4 text-[#c99b53]"
                    aria-hidden="true"
                  />
                  Promised ready: {formatTime(order.promisedReadyAt)}
                </p>
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  FSSAI: {order.outlet.fssaiLicense}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono-tabular text-xl font-extrabold text-[#0f352d]">
                  {formatMoney(order.totalPaise)}
                </p>
                <p className="text-[11px] font-medium text-[#655c50]">
                  Includes 5% GST
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
