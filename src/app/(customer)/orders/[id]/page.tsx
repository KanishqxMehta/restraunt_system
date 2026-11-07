import { customerStages } from "@/features/orders/stages";
import Link from "next/link";
import {
  Check,
  Clock3,
  MapPin,
  AlertTriangle,
  Share2,
  ReceiptText,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
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
      {/* Top Status Masthead */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs sm:p-8">
        <div>
          <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-3 py-1">
            <ReceiptText
              className="h-3.5 w-3.5 text-[#4a1d5a]"
              aria-hidden="true"
            />
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#4a1d5a]">
              {order.orderNumber}
            </p>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#0f352d] sm:text-4xl">
            {paid
              ? "Your order is in good hands."
              : "Your order is awaiting payment."}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-[#5c5448]">
            <span className="font-semibold text-[#1f1c18]">
              {order.outlet.name}
            </span>
            <span aria-hidden="true">·</span>
            <span>FSSAI {order.outlet.fssaiLicense}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
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

      {/* Catering Banner */}
      {order.isCatering && (
        <div className="mb-6 rounded-3xl border border-[#dec9ec] bg-gradient-to-r from-[#faf5fd] via-[#fffdfa] to-[#f4ebfa] p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3b1747] text-base text-[#f4d6a9] shadow-2xs">
                🎉
              </span>
              <div>
                <p className="font-display text-base font-bold text-[#0f352d]">
                  Bulk Party Catering · {order.guestCount ?? 20} Guests
                </p>
                {order.specialInstructions && (
                  <p className="mt-0.5 text-xs font-normal italic text-[#522960]">
                    &ldquo;{order.specialInstructions}&rdquo;
                  </p>
                )}
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-3.5 py-1 text-xs font-bold",
                order.cateringStatus === "CONFIRMED"
                  ? "border border-emerald-300 bg-emerald-100 text-emerald-950"
                  : "border border-[#dec9ec] bg-[#3b1747] text-[#f4d6a9]",
              )}
            >
              {order.cateringStatus === "CONFIRMED"
                ? `Confirmed by ${order.cateringConfirmedBy || "Catering Manager"}`
                : "Pending Catering Manager Review"}
            </span>
          </div>
          {order.cateringStatus === "CONFIRMED" && order.cateringNotes && (
            <p className="mt-3 border-t border-[#dec9ec]/50 pt-2 text-xs text-[#3b1747]">
              <strong>Manager note:</strong> {order.cateringNotes}
            </p>
          )}
        </div>
      )}

      {/* Critical Late Alert */}
      {isCriticalLate && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3.5 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-xs"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-bold text-amber-950">
              We&apos;re taking extra care with your order
            </h2>
            <p className="mt-1 text-xs leading-5 text-amber-900">
              Preparation is taking slightly longer than expected during our
              current peak rush. Our outlet kitchen manager has been alerted and
              is expediting your dishes.
            </p>
          </div>
        </div>
      )}

      {/* Live Kitchen Telemetry & 4-Stage Stepper */}
      <section className="mb-6 overflow-hidden rounded-[2rem] border border-[#1d4c41] bg-gradient-to-br from-[#0b2922] via-[#123d33] to-[#291232] p-6 text-white shadow-[0_14px_40px_rgba(15,53,45,0.16)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#f4d6a9]/30 bg-white/10 text-[#f4d6a9]">
              <Clock3 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
                {paid
                  ? `Kitchen ready by ${formatTime(order.promisedReadyAt)}`
                  : "Complete your test payment"}
              </h2>
              <div className="mt-1.5 text-xs leading-6 text-stone-200">
                {paid ? (
                  order.estimateSource === "GEMINI_AI" ? (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#f4d6a9]">
                        <Sparkles className="h-3.5 w-3.5 text-[#f4d6a9]" aria-hidden="true" />
                        Estimated by Gemini Culinary AI ({order.aiEstimatedMinutes ?? 25}m prep)
                      </span>
                      {order.aiExplanation && (
                        <p className="rounded-lg bg-black/25 px-2.5 py-1 text-xs leading-relaxed text-[#faeccf] italic">
                          &ldquo;{order.aiExplanation}&rdquo;
                        </p>
                      )}
                    </div>
                  ) : order.estimateSource === "MANAGER_OVERRIDE" ? (
                    <span className="inline-block rounded-lg border border-[#7e3aa3] bg-[#2d1136] px-2.5 py-0.5 font-semibold text-[#f5effa]">
                      ⏱️ Updated by kitchen supervisor:{" "}
                      {order.managerOverrideReason ||
                        "Extended for careful preparation"}
                    </span>
                  ) : order.estimateSource === "GEMINI_FALLBACK" ? (
                    <div className="flex flex-col gap-0.5 text-stone-300">
                      <span className="font-medium text-amber-200">
                        ⚡ Station queue buffer estimate ({order.aiEstimatedMinutes ?? 25}m prep)
                      </span>
                      {order.aiExplanation && (
                        <p className="text-[11px] text-stone-300/80">
                          {order.aiExplanation}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span>
                      Preparation estimate calculated from outlet station
                      parameters.
                    </span>
                  )
                ) : (
                  "Unpaid orders are not sent to the kitchen."
                )}
              </div>
            </div>
          </div>
        </div>

        {paid && (
          <ol className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-7 sm:grid-cols-4">
            {customerStages.map((stage, index) => {
              const completed = index <= currentStage;
              const isCurrent = index === currentStage;
              return (
                <li
                  key={stage.status}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "rounded-2xl border p-3.5 transition-all",
                    isCurrent
                      ? "border-[#f4d6a9] bg-white/12 shadow-sm"
                      : completed
                        ? "border-white/20 bg-white/6"
                        : "border-white/10 bg-black/15 opacity-70",
                  )}
                >
                  <span
                    className={cn(
                      "mb-2.5 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold",
                      completed
                        ? "border-[#f4d6a9] bg-[#f4d6a9] text-[#0b2922]"
                        : "border-white/30 text-white/60",
                    )}
                  >
                    {completed ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "block text-xs font-bold",
                      completed ? "text-white" : "text-white/60",
                    )}
                  >
                    {stage.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {!paid && (
          <Link
            href={`/checkout?order=${order.id}`}
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#f4d6a9] px-6 text-sm font-bold text-[#0b2922] shadow-sm transition hover:bg-[#e8c48e]"
          >
            Finish test payment
          </Link>
        )}
      </section>

      {/* Order Details Receipt */}
      <section className="rounded-[2rem] border border-[#dfd4c2] bg-[#fffdfa] p-6 shadow-xs sm:p-8">
        <div className="flex items-center justify-between border-b border-[#ece3d5] pb-4">
          <h2 className="font-display text-xl font-bold text-[#0f352d]">
            Order details
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f574c]">
            <ShieldCheck
              className="h-4 w-4 text-[#0f352d]"
              aria-hidden="true"
            />
            {paid
              ? `Paid by ${order.paymentMethod} · Test payment`
              : "Payment pending"}
            {order.couponCode ? ` · Coupon ${order.couponCode}` : ""}
          </span>
        </div>

        <ul className="my-5 divide-y divide-[#ece3d5]">
          {order.items.map((item, index) => (
            <li key={index} className="py-4">
              <div className="flex justify-between gap-4">
                <div>
                  <DietaryMark isVeg={item.isVeg} />
                  <h3 className="mt-2 text-sm font-bold text-[#1f1c18]">
                    {item.quantity} × {item.name} · {item.portionName}
                  </h3>
                  {snapshotAddons(item.addons).length > 0 && (
                    <p className="mt-1 text-xs font-medium text-[#4a1d5a]">
                      {snapshotAddons(item.addons)
                        .map((addon) => addon.name)
                        .join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[#736a5c]">
                    Allergens: {item.allergens.join(", ") || "None declared"}
                  </p>
                </div>
                <span className="font-mono-tabular shrink-0 text-sm font-extrabold text-[#0f352d]">
                  {formatMoney(item.unitPricePaise * item.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl border border-[#e6dccb] bg-[#faf7f2] p-5">
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
        </div>

        {order.deliveryAddress && (
          <div className="mt-6 flex items-start gap-3.5 border-t border-[#ece3d5] pt-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#dec9ec] bg-[#f7f2fa] text-[#4a1d5a]">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f352d]">
                Delivery address
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#4e473d]">
                {order.deliveryAddress}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Bottom Navigation Actions */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e5dbc9] bg-[#fffdfa] px-5 py-4 text-sm font-bold text-[#0f352d] shadow-2xs">
        <div className="flex flex-wrap items-center gap-5">
          <Link
            href="/order"
            className="inline-flex items-center gap-1.5 underline decoration-[#c99b53] underline-offset-4 hover:text-[#08231d]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Order something else
          </Link>
          <Link
            href="/account"
            className="text-[#4a1d5a] underline decoration-[#dec9ec] underline-offset-4 hover:text-[#290e32]"
          >
            All my orders
          </Link>
        </div>
        <a
          href={`https://wa.me/?text=${shareWhatsAppText}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#b7e4b0] bg-[#ecfdf5] px-3.5 py-2 text-xs font-bold text-[#065f46] transition hover:bg-[#d1fae5]"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          Share tracking via WhatsApp
        </a>
      </div>
    </div>
  );
}
