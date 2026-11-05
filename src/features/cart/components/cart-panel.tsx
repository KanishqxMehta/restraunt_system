"use client";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "../context";
import { previewCart } from "../preview";
import { lineKey } from "@/features/checkout/validation";
import type { CustomerMenu } from "@/features/menu/types";
import { formatMoney } from "@/lib/format";
export function CartPanel({
  menu,
  checkoutLink = true,
}: {
  menu: CustomerMenu;
  checkoutLink?: boolean;
}) {
  const cart = useCart();
  const lines = previewCart(cart.lines, menu.items);
  const total = lines.reduce(
    (sum, line) => sum + line.unitPricePaise * line.quantity,
    0,
  );
  return (
    <section
      aria-label="Your basket"
      className="rounded-3xl border border-[#ded5c6] bg-[#fffdfa] p-5 sm:p-6 shadow-xs"
    >
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-[#133d34]" />
        <h2 className="text-lg font-bold text-[#133d34]">Your basket</h2>
        <span className="ml-auto rounded-full border border-[#e4d3f1] bg-[#f5effa] px-2.5 py-0.5 text-xs font-semibold text-[#4a1d5a]">
          {cart.lines.reduce((sum, line) => sum + line.quantity, 0)} items
        </span>
      </div>
      {lines.length === 0 ? (
        <p className="py-12 text-center text-sm leading-6 text-stone-500">
          Something delicious belongs here.
          <br />
          Choose a dish to get started.
        </p>
      ) : (
        <>
          <ul className="my-5 divide-y divide-stone-100">
            {lines.map((line) => (
              <li key={lineKey(line)} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{line.name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {line.portionName}
                      {line.addons.length
                        ? ` · ${line.addons.map((addon) => addon.name).join(", ")}`
                        : ""}
                    </p>
                    {line.invalid && (
                      <p role="alert" className="mt-1 text-xs text-red-800">
                        Unavailable. Remove this item before checkout.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${line.name}`}
                    onClick={() => cart.setQuantity(lineKey(line), 0)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center text-stone-400 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg border border-stone-200">
                    <button
                      type="button"
                      aria-label={`Decrease ${line.name}`}
                      className="flex h-10 w-10 items-center justify-center"
                      onClick={() =>
                        cart.setQuantity(lineKey(line), line.quantity - 1)
                      }
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-sm">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${line.name}`}
                      disabled={line.quantity >= 20}
                      className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
                      onClick={() =>
                        cart.setQuantity(lineKey(line), line.quantity + 1)
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatMoney(line.unitPricePaise * line.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-[#ede6da] pt-5">
            <div className="flex justify-between font-bold text-[#133d34]">
              <span>Subtotal</span>
              <span>{formatMoney(total)}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#6b6255]">
              Includes 5% GST. Coupons apply at checkout.
            </p>
            {checkoutLink && (
              <Link
                href="/checkout"
                className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#133d34] px-4 text-sm font-bold text-white transition hover:bg-[#0c2a23] shadow-xs active:scale-[0.99]"
              >
                Go to checkout
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}
