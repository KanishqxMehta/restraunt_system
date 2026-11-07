"use client";
import { useState, type FormEvent } from "react";
import { ShoppingBag, Sparkles, ShieldAlert } from "lucide-react";
import type { CustomerMenuItem } from "../types";
import { useCart } from "@/features/cart/context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAlert } from "@/components/ui/alert-toast";
import { formatMoney } from "@/lib/format";
import { DietaryMark } from "./dietary-mark";
import { cn } from "@/lib/classes";

export function ItemConfiguration({
  item,
  onClose,
}: {
  item: CustomerMenuItem;
  onClose: () => void;
}) {
  const cart = useCart();
  const alert = useAlert();
  const [portionId, setPortion] = useState(item.portions[0]?.id ?? "");
  const [addonIds, setAddons] = useState<string[]>([]);
  const portion = item.portions.find((portion) => portion.id === portionId);
  const total =
    (portion?.pricePaise ?? 0) +
    item.addons
      .filter((addon) => addonIds.includes(addon.id))
      .reduce((sum, addon) => sum + addon.pricePaise, 0);

  function add(event: FormEvent) {
    event.preventDefault();
    if (!portion) return;
    cart.addLine({ portionId, addonIds, quantity: 1 });
    alert.success(
      "Added to Basket",
      `${item.name} (${portion.name}) added to your direct order.`,
    );
    onClose();
  }

  return (
    <Modal title={item.name} onClose={onClose}>
      <form onSubmit={add} className="space-y-6">
        {/* Dish Summary Banner */}
        <div className="rounded-2xl border border-[#e6dccb] bg-[#faf7f2] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DietaryMark isVeg={item.isVeg} />
            <span className="rounded-full border border-[#dec9ec] bg-[#f7f2fa] px-2.5 py-0.5 text-[11px] font-bold text-[#4a1d5a]">
              {item.category}
            </span>
          </div>
          <p className="mt-2.5 text-sm leading-6 text-[#4e473d]">
            {item.description}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-[#6e6456]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#c99b53]" aria-hidden="true" />
            <span>
              Allergens: {item.allergens.join(", ") || "None declared"}
            </span>
          </p>
        </div>

        {/* Portion Selection */}
        <fieldset>
          <legend className="mb-3 flex items-center justify-between w-full text-sm font-bold uppercase tracking-wider text-[#0f352d]">
            <span>1. Choose a portion</span>
            <span className="rounded-md bg-[#eef6f4] px-2 py-0.5 text-[10px] font-bold text-[#0f352d]">
              Required
            </span>
          </legend>
          <div className="space-y-2.5">
            {item.portions.map((portion) => {
              const selected = portionId === portion.id;
              return (
                <label
                  key={portion.id}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3 transition-all",
                    selected
                      ? "border-[#0f352d] bg-[#eef6f4] text-[#0f352d] font-bold shadow-xs"
                      : "border-[#dfd4c2] bg-[#fffdfa] text-[#4e473d] hover:border-[#4a1d5a]/50 hover:bg-[#faf7f2]",
                  )}
                >
                  <input
                    type="radio"
                    name="portion"
                    value={portion.id}
                    checked={selected}
                    onChange={() => setPortion(portion.id)}
                    className="h-4 w-4 accent-[#0f352d]"
                  />
                  <span className="flex-1 text-sm">{portion.name}</span>
                  <span className="font-mono-tabular text-sm font-extrabold text-[#0f352d]">
                    {formatMoney(portion.pricePaise)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Accompaniments / Add-ons */}
        {item.addons.length > 0 && (
          <fieldset>
            <legend className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-[#0f352d]">
              <Sparkles className="h-3.5 w-3.5 text-[#c99b53]" aria-hidden="true" />
              <span>2. Make it yours</span>
              <span className="ml-1 text-xs font-semibold normal-case text-[#4a1d5a]">
                · optional accompaniments
              </span>
            </legend>
            <div className="space-y-2">
              {item.addons.map((addon) => {
                const checked = addonIds.includes(addon.id);
                return (
                  <label
                    key={addon.id}
                    className={cn(
                      "flex min-h-13 cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-2.5 text-sm transition-all",
                      checked
                        ? "border-[#3b1747] bg-[#f7f2fa] text-[#25221e]"
                        : "border-[#e5dbc9] bg-[#fffdfa] text-[#25221e] hover:border-[#c99b53]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setAddons((ids) =>
                          event.target.checked
                            ? [...ids, addon.id]
                            : ids.filter((id) => id !== addon.id),
                        )
                      }
                      className="h-4 w-4 rounded accent-[#0f352d]"
                    />
                    <span className="flex-1 font-semibold">
                      {addon.name}
                      {addon.allergens.length > 0 && (
                        <span className="block text-xs font-normal text-[#7a7062]">
                          Contains {addon.allergens.join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="font-mono-tabular font-bold text-[#0f352d]">
                      +{formatMoney(addon.pricePaise)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 border-t border-[#ece3d5] bg-[#fffdfa]/95 px-6 py-4 shadow-[0_-8px_20px_rgba(20,18,14,0.04)] backdrop-blur-xs sm:-bottom-7 sm:-mx-7 sm:-mb-7 sm:px-7">
          <Button
            type="submit"
            variant="primary"
            className="min-h-13 w-full text-base font-bold shadow-md"
            disabled={!portion}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Add to basket · {formatMoney(total)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
