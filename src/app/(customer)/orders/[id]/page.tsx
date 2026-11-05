import Link from "next/link";
import { Check, Clock3, MapPin } from "lucide-react";
import { requirePageViewer } from "@/features/auth/session";
import { loadOrderPage } from "@/features/orders/page-loader";
import { RefreshStatus } from "@/features/orders/components/refresh-status";
import { snapshotAddons } from "@/features/orders/snapshots";
import { DietaryMark } from "@/features/menu/components/dietary-mark";
import { PriceBreakdown } from "@/features/checkout/components/price-breakdown";
import { formatTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/classes";

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requirePageViewer(["CUSTOMER"]);
  const order = await loadOrderPage(viewer, (await params).id);
  const paid = order.paymentStatus === "PAID";
  const stages = [
    { status: "NEW", label: "Order received" },
    { status: "PREPARING", label: "In the kitchen" },
    { status: "READY", label: "Ready for pickup" },
    { status: "HANDED_OFF", label: "With delivery partner" },
  ];
  const currentStage = stages.findIndex(
    (stage) => stage.status === order.status,
  );
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-800">
            {order.orderNumber}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {paid
              ? "Your order is in good hands."
              : "Your order is awaiting payment."}
          </h1>
          <p className="mt-3 text-sm text-stone-500">
            {order.outlet.name} · FSSAI {order.outlet.fssaiLicense}
          </p>
        </div>
        <RefreshStatus />
      </header>
      <section className="mb-6 rounded-3xl bg-[#173e37] p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <Clock3 className="h-6 w-6 text-amber-200" />
          <div>
            <h2 className="text-lg font-semibold">
              {paid
                ? `Kitchen ready by ${formatTime(order.promisedReadyAt)}`
                : "Complete your test payment"}
            </h2>
            <p className="mt-1 text-xs leading-6 text-stone-200">
              {paid
                ? "Provisional preparation time. Delivery partner travel time is not included."
                : "Unpaid orders are not sent to the kitchen."}
            </p>
          </div>
        </div>
        {paid && (
          <ol className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {stages.map((stage, index) => (
              <li key={stage.status}>
                <span
                  className={cn(
                    "mb-3 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                    index <= currentStage
                      ? "border-amber-200 bg-amber-200 text-emerald-950"
                      : "border-white/30 text-white/60",
                  )}
                >
                  {index <= currentStage ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    index <= currentStage ? "text-white" : "text-white/60",
                  )}
                >
                  {stage.label}
                </span>
              </li>
            ))}
          </ol>
        )}
        {!paid && (
          <Link
            href={`/checkout?order=${order.id}`}
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-sm font-semibold text-emerald-950"
          >
            Finish test payment
          </Link>
        )}
      </section>
      <section className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Order details</h2>
        <ul className="my-6 divide-y divide-stone-100">
          {order.items.map((item, index) => (
            <li key={index} className="py-4">
              <div className="flex justify-between gap-4">
                <div>
                  <DietaryMark isVeg={item.isVeg} />
                  <h3 className="mt-2 text-sm font-semibold">
                    {item.quantity} × {item.name} · {item.portionName}
                  </h3>
                  {snapshotAddons(item.addons).length > 0 && (
                    <p className="mt-1 text-xs text-stone-500">
                      {snapshotAddons(item.addons)
                        .map((addon) => addon.name)
                        .join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-stone-500">
                    Allergens: {item.allergens.join(", ") || "None declared"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium">
                  {formatMoney(item.unitPricePaise * item.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <PriceBreakdown
          summary={{
            subtotalPaise: order.subtotalPaise || order.totalPaise,
            discountPaise: order.discountPaise,
            totalPaise: order.totalPaise,
            includedTaxPaise: order.includedTaxPaise,
            cgstPaise: Math.floor(order.includedTaxPaise / 2),
            sgstPaise:
              order.includedTaxPaise - Math.floor(order.includedTaxPaise / 2),
          }}
        />
        <p className="mt-5 text-xs text-stone-500">
          {paid
            ? `Paid by ${order.paymentMethod} · Test payment`
            : "Payment pending"}
          {order.couponCode ? ` · Coupon ${order.couponCode}` : ""}
        </p>
        {order.deliveryAddress && (
          <div className="mt-6 flex items-start gap-3 border-t border-stone-100 pt-6">
            <MapPin className="h-5 w-5 shrink-0 text-emerald-900" />
            <div>
              <h3 className="text-sm font-semibold">Delivery address</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {order.deliveryAddress}
              </p>
            </div>
          </div>
        )}
      </section>
      <div className="mt-6 flex flex-wrap gap-5 text-sm text-emerald-900">
        <Link href="/order" className="underline underline-offset-4">
          Order something else
        </Link>
        <Link href="/account" className="underline underline-offset-4">
          All my orders
        </Link>
      </div>
    </div>
  );
}
