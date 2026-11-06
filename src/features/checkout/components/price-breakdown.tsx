import { formatMoney } from "@/lib/format";
import type { PriceSummary } from "../types";

export function PriceBreakdown({ summary }: { summary: PriceSummary }) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between text-[#4e473d]">
        <dt>Items subtotal</dt>
        <dd className="font-mono-tabular font-semibold text-[#1f1c18]">
          {formatMoney(summary.subtotalPaise)}
        </dd>
      </div>
      {summary.discountPaise > 0 && (
        <div className="flex justify-between rounded-xl border border-[#dec9ec] bg-[#f7f2fa] px-3 py-1.5 font-bold text-[#4a1d5a]">
          <dt>Coupon savings</dt>
          <dd className="font-mono-tabular">
            −{formatMoney(summary.discountPaise)}
          </dd>
        </div>
      )}
      {Boolean(summary.pointsDiscountPaise && summary.pointsDiscountPaise > 0) && (
        <div className="flex justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 font-bold text-amber-900">
          <dt className="flex items-center gap-1">
            <span>✨ Royal Rewards ({summary.pointsRedeemed} pts)</span>
          </dt>
          <dd className="font-mono-tabular">
            −{formatMoney(summary.pointsDiscountPaise ?? 0)}
          </dd>
        </div>
      )}
      <div className="flex justify-between text-[#5f574c]">
        <dt>Delivery · demo</dt>
        <dd className="font-bold text-[#0f352d]">Free</dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-[#e5dbc9] pt-4 text-lg font-extrabold text-[#0f352d]">
        <dt>To pay</dt>
        <dd className="font-mono-tabular text-xl">
          {formatMoney(summary.totalPaise)}
        </dd>
      </div>
      <div className="rounded-xl bg-[#f5efe4]/70 px-3 py-2 text-xs leading-5 text-[#5f574c]">
        <dt className="inline">Includes 5% GST: </dt>
        <dd className="font-mono-tabular inline font-semibold text-[#1f1c18]">
          {formatMoney(summary.includedTaxPaise)} (CGST{" "}
          {formatMoney(summary.cgstPaise)} + SGST{" "}
          {formatMoney(summary.sgstPaise)})
        </dd>
      </div>
    </dl>
  );
}
