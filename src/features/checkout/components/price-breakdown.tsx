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
        <div className="flex justify-between font-bold text-[#4a1d5a]">
          <dt>Coupon savings</dt>
          <dd>−{formatMoney(summary.discountPaise)}</dd>
        </div>
      )}
      <div className="flex justify-between text-[#635b50]">
        <dt>Delivery · demo</dt>
        <dd className="font-semibold text-[#133d34]">Free</dd>
      </div>
      <div className="flex justify-between border-t border-[#ede6da] pt-4 text-lg font-extrabold text-[#133d34]">
        <dt>To pay</dt>
        <dd>{formatMoney(summary.totalPaise)}</dd>
      </div>
      <div className="text-xs leading-6 text-[#635b50]">
        <dt className="inline">Includes 5% GST: </dt>
        <dd className="inline font-medium">
          {formatMoney(summary.includedTaxPaise)} (CGST{" "}
          {formatMoney(summary.cgstPaise)} + SGST{" "}
          {formatMoney(summary.sgstPaise)})
        </dd>
      </div>
    </dl>
  );
}
