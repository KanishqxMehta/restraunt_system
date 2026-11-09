"use client";
import Link from "next/link";
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCart } from "../context";
import { previewCart } from "../preview";
import { lineKey } from "@/features/checkout/validation";
import type { CustomerMenu } from "@/features/menu/types";
import { formatMoney } from "@/lib/format";

export function CartPanel({
  menu,
  checkoutLink = true,
  onClose,
}: {
  menu: CustomerMenu;
  checkoutLink?: boolean;
  onClose?: () => void;
}) {
  const cart = useCart();
  const lines = previewCart(cart.lines, menu.items);
  const total = lines.reduce(
    (sum, line) => sum + line.unitPricePaise * line.quantity,
    0,
  );
  const itemCount = cart.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <section
      aria-label="Your basket"
      className="flex flex-col max-h-[calc(100vh-6.5rem)] overflow-hidden rounded-[1.75rem] border border-[#dfd4c2] bg-[#fffdfa] shadow-[0_12px_36px_rgba(20,18,14,0.06)]"
    >
      {/* Top Hamper Header - Pinned at top */}
      <div className="shrink-0 border-b border-[#ece3d5] bg-gradient-to-r from-[#0f352d] to-[#17493e] px-5 py-4 text-white sm:px-6">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/12 text-[#f4d6a9]"
          >
            <ShoppingBag className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold leading-tight text-white">
              Your basket
            </h2>
            <p className="text-[11px] text-stone-200/85">
              {menu.outlet.name}
            </p>
          </div>
          <span className="ml-auto rounded-full border border-[#f4d6a9]/35 bg-white/12 px-2.5 py-0.5 text-xs font-bold text-[#f4d6a9]">
            {itemCount} items
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close basket"
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {lines.length === 0 ? (
        <div className="p-5 sm:p-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e5dbc9] bg-[#faf7f2] text-[#c99b53]">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium leading-6 text-[#5f574c]">
            Something delicious belongs here.
            <br />
            Choose a dish to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Scrollable Items List - Scrolls independently inside the basket */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 overscroll-contain">
            <ul className="divide-y divide-[#ece3d5]">
              {lines.map((line) => (
                <li key={lineKey(line)} className="py-3.5 first:pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#1f1c18]">
                        {line.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#655c50]">
                        {line.portionName}
                        {line.addons.length
                          ? ` · ${line.addons.map((addon) => addon.name).join(", ")}`
                          : ""}
                      </p>
                      {line.invalid && (
                        <p
                          role="alert"
                          className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800"
                        >
                          Unavailable. Remove this item before checkout.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => cart.setQuantity(lineKey(line), 0)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8a7f70] transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-xl border border-[#dfd4c2] bg-[#faf7f2] p-0.5">
                      <button
                        type="button"
                        aria-label={`Decrease ${line.name}`}
                        disabled={line.quantity <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1f1c18] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        onClick={() => {
                          if (line.quantity > 1) {
                            cart.setQuantity(lineKey(line), line.quantity - 1);
                          }
                        }}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="font-mono-tabular min-w-7 text-center text-xs font-bold text-[#0f352d]">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${line.name}`}
                        disabled={line.quantity >= 20}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1f1c18] transition hover:bg-white disabled:opacity-30"
                        onClick={() =>
                          cart.setQuantity(lineKey(line), line.quantity + 1)
                        }
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <span className="font-mono-tabular text-sm font-extrabold text-[#0f352d]">
                      {formatMoney(line.unitPricePaise * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Sticky Pinned Bottom Summary & Checkout Button */}
          <div className="shrink-0 border-t border-[#ece3d5] bg-[#faf7f2]/95 backdrop-blur-xs p-5 sm:p-6 shadow-[0_-8px_20px_rgba(20,18,14,0.03)]">
            <div className="flex items-baseline justify-between font-bold text-[#0f352d]">
              <span className="text-sm">Subtotal</span>
              <span className="font-mono-tabular text-lg font-extrabold">
                {formatMoney(total)}
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs leading-5 text-[#6b6255]">
              <ShieldCheck
                className="h-3.5 w-3.5 shrink-0 text-[#0f352d]"
                aria-hidden="true"
              />
              Includes 5% GST. Free direct delivery.
            </p>
            {checkoutLink && (
              <Link
                href="/checkout"
                onClick={onClose}
                className="mt-3.5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#15463b] to-[#0d3129] px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(15,53,45,0.22)] transition hover:from-[#195246] hover:to-[#0f382f] active:scale-[0.99]"
              >
                <span>Go to checkout</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}
