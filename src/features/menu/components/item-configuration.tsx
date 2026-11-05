"use client";
import { useState, type FormEvent } from "react";
import type { CustomerMenuItem } from "../types";
import { useCart } from "@/features/cart/context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { DietaryMark } from "./dietary-mark";
export function ItemConfiguration({
  item,
  onClose,
}: {
  item: CustomerMenuItem;
  onClose: () => void;
}) {
  const cart = useCart();
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
    onClose();
  }
  return (
    <Modal title={item.name} onClose={onClose}>
      <form onSubmit={add} className="space-y-6">
        <div>
          <DietaryMark isVeg={item.isVeg} />
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {item.description}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Allergens: {item.allergens.join(", ") || "None declared"}
          </p>
        </div>
        <fieldset>
          <legend className="mb-3 font-bold text-[#133d34]">Choose a portion</legend>
          <div className="space-y-2">
            {item.portions.map((portion) => (
              <label
                key={portion.id}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 transition cursor-pointer ${
                  portionId === portion.id
                    ? "border-[#133d34] bg-[#eef6f4] text-[#133d34] font-bold shadow-xs"
                    : "border-[#ded5c6] bg-[#fffdfa] text-[#544d42] hover:border-[#4a1d5a]"
                }`}
              >
                <input
                  type="radio"
                  name="portion"
                  value={portion.id}
                  checked={portionId === portion.id}
                  onChange={() => setPortion(portion.id)}
                  className="accent-[#133d34]"
                />
                <span className="flex-1 text-sm">{portion.name}</span>
                <span className="text-sm font-bold text-[#133d34]">
                  {formatMoney(portion.pricePaise)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {item.addons.length > 0 && (
          <fieldset>
            <legend className="mb-3 font-bold text-[#133d34]">
              Make it yours{" "}
              <span className="text-sm font-semibold text-[#4a1d5a]">
                · optional
              </span>
            </legend>
            {item.addons.map((addon) => (
              <label
                key={addon.id}
                className="flex min-h-12 items-center gap-3 text-sm text-[#25221e] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={addonIds.includes(addon.id)}
                  onChange={(event) =>
                    setAddons((ids) =>
                      event.target.checked
                        ? [...ids, addon.id]
                        : ids.filter((id) => id !== addon.id),
                    )
                  }
                  className="h-4 w-4 accent-[#133d34]"
                />
                <span className="flex-1 font-medium">
                  {addon.name}
                  {addon.allergens.length > 0 && (
                    <span className="block text-xs text-[#877d70]">
                      Contains {addon.allergens.join(", ")}
                    </span>
                  )}
                </span>
                <span className="font-bold text-[#133d34]">+{formatMoney(addon.pricePaise)}</span>
              </label>
            ))}
          </fieldset>
        )}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!portion}
        >
          Add to basket · {formatMoney(total)}
        </Button>
      </form>
    </Modal>
  );
}
