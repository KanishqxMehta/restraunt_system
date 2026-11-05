import { customerStages } from "@/features/orders/stages";
import Link from "next/link";
import { Check, Clock3, MapPin, AlertTriangle, Share2 } from "lucide-react";
import { requirePageViewer } from "@/features/auth/session";
import { loadOrderPage } from "@/features/orders/page-loader";
import { RefreshStatus } from "@/features/orders/components/refresh-status";
import { OutboxButton } from "@/features/notifications/components/outbox-button";
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
  const currentStage = customerStages.findIndex(
    (stage) => stage.status === order.status,
  );

  const isCriticalLate = order.isCriticalLate;
  const shareWhatsAppText = encodeURIComponent(
    `🍽️ Tracking my Biryani order #${order.orderNumber} from Company A Hyderabad (${order.outlet.name})! Track here: http://localhost:3000/orders/${order.id}`,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#4a1d5a]">
            {order.orderNumber}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#133d34]">
            {paid
              ? "Your order is in good hands."
              : "Your order is awaiting payment."}
          </h1>
          <p className="mt-2 text-sm text-[#5c5448]">
            {order.outlet.name} · FSSAI {order.outlet.fssaiLicense}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {paid && (
            <OutboxButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              outletName={order.outlet.name}
            />
          )}
          <RefreshStatus key={order.id} orderId={order.id} />
        </div>
      </header>

      {order.isCatering && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4d3f1] bg-[#faf6fd] p-4 text-xs font-bold text-[#3b1747] shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3b1747] text-white">
              🎉
            </span>
            <div>
              <p className="text-sm font-bold text-[#133d34]">
                Bulk Party Catering · {order.guestCount ?? 20} Guests
              </p>
              {order.specialInstructions && (
                <p className="text-xs font-normal text-[#522960] mt-0.5">
                  &ldquo;{order.specialInstructions}&rdquo;
                </p>
              )}
            </div>
          </div>
          <span className="rounded-full bg-[#f5effa] px-3 py-1 text-[#4a1d5a] border border-[#dcc8ea]">
            Sealed Dum Handis Confirmed
          </span>
        </div>
      )}

      {isCriticalLate && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 flex items-start gap-3 shadow-xs"
        >
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-sm text-amber-950">We&apos;re taking extra care with your order</h2>
            <p className="mt-1 text-xs leading-5 text-amber-900">
              Preparation is taking slightly longer than expected during our current peak rush. Our outlet kitchen manager has been alerted and is expediting your dishes.
            </p>
          </div>
        </div>
      )}

      <section className="mb-6 rounded-3xl bg-[#133d34] p-6 text-white shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[#f4d6a9]">
            <Clock3 className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold">
              {paid
                ? `Kitchen ready by ${formatTime(order.promisedReadyAt)}`
                : "Complete your test payment"}
            </h2>
            <p className="mt-1 text-xs leading-6 text-stone-200">
              {paid ? (
                order.estimateSource === "GEMINI_AI" ? (
                  <span>✨ Estimated by Gemini culinary AI based on live kitchen queue.</span>
                ) : order.estimateSource === "MANAGER_OVERRIDE" ? (
                  <span className="inline-block rounded-md bg-[#2d1136] px-2 py-0.5 font-semibold text-[#f5effa] border border-[#5a276c]">
                    ⏱️ Updated by kitchen supervisor: {order.managerOverrideReason || "Extended for careful preparation"}
                  </span>
                ) : (
                  <span>Preparation estimate calculated from outlet station parameters.</span>
                )
              ) : (
                "Unpaid orders are not sent to the kitchen."
              )}
            </p>
          </div>
        </div>
        {paid && (
          <ol className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {customerStages.map((stage, index) => (
              <li
                key={stage.status}
                aria-current={index === currentStage ? "step" : undefined}
              >
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
      <section className="rounded-3xl border border-[#ded5c6] bg-[#fffdfa] p-6 sm:p-8 shadow-xs">
        <h2 className="text-lg font-bold text-[#133d34]">Order details</h2>
        <ul className="my-6 divide-y divide-[#ede6da]">
          {order.items.map((item, index) => (
            <li key={index} className="py-4">
              <div className="flex justify-between gap-4">
                <div>
                  <DietaryMark isVeg={item.isVeg} />
                  <h3 className="mt-2 text-sm font-bold text-[#25221e]">
                    {item.quantity} × {item.name} · {item.portionName}
                  </h3>
                  {snapshotAddons(item.addons).length > 0 && (
                    <p className="mt-1 text-xs text-[#635b50]">
                      {snapshotAddons(item.addons)
                        .map((addon) => addon.name)
                        .join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[#736a5c]">
                    Allergens: {item.allergens.join(", ") || "None declared"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-[#133d34]">
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
        <p className="mt-5 text-xs text-[#635b50]">
          {paid
            ? `Paid by ${order.paymentMethod} · Test payment`
            : "Payment pending"}
          {order.couponCode ? ` · Coupon ${order.couponCode}` : ""}
        </p>
        {order.deliveryAddress && (
          <div className="mt-6 flex items-start gap-3 border-t border-[#ede6da] pt-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5effa] text-[#4a1d5a] border border-[#e4d3f1]">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#133d34]">Delivery address</h3>
              <p className="mt-1 text-sm leading-6 text-[#524d45]">
                {order.deliveryAddress}
              </p>
            </div>
          </div>
        )}
      </section>
      <div className="mt-6 flex flex-wrap items-center gap-5 text-sm font-semibold text-[#133d34]">
        <Link href="/order" className="underline underline-offset-4 hover:text-[#0c2a23]">
          Order something else
        </Link>
        <Link href="/account" className="text-[#4a1d5a] underline underline-offset-4 hover:text-[#2d1136]">
          All my orders
        </Link>
        <a
          href={`https://wa.me/?text=${shareWhatsAppText}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[#075e54] underline underline-offset-4 hover:text-[#00a884]"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share tracking via WhatsApp
        </a>
      </div>
    </div>
  );
}
