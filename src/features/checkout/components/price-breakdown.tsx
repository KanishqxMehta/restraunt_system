import { formatMoney } from "@/lib/format";
import type { PriceSummary } from "../types";
export function PriceBreakdown({ summary }: { summary: PriceSummary }) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt>Items subtotal</dt>
        <dd>{formatMoney(summary.subtotalPaise)}</dd>
      </div>
      {summary.discountPaise > 0 && (
        <div className="flex justify-between text-emerald-800">
          <dt>Coupon savings</dt>
          <dd>−{formatMoney(summary.discountPaise)}</dd>
        </div>
      )}
      <div className="flex justify-between text-stone-500">
        <dt>Delivery · demo</dt>
        <dd>Free</dd>
      </div>
      <div className="flex justify-between border-t border-stone-200 pt-4 text-lg font-semibold">
        <dt>To pay</dt>
        <dd>{formatMoney(summary.totalPaise)}</dd>
      </div>
      <div className="text-xs leading-6 text-stone-500">
        <dt className="inline">Includes 5% GST: </dt>
        <dd className="inline">
          {formatMoney(summary.includedTaxPaise)} (CGST{" "}
          {formatMoney(summary.cgstPaise)} + SGST{" "}
          {formatMoney(summary.sgstPaise)})
        </dd>
      </div>
    </dl>
  );
}
