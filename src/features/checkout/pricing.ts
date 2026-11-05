import type { CartLine } from "./validation";
import type { PricedLine, PriceSummary } from "./types";
import { HttpError } from "@/server/http/errors";

export interface PricingItem {
  id: string;
  name: string;
  isVeg: boolean;
  allergens: string[];
  basePrepMinutes: number;
  availability: { isAvailable: boolean }[];
  portions: {
    id: string;
    name: string;
    prepMinutesOverride: number | null;
    prices: { pricePaise: number }[];
  }[];
  addons: {
    id: string;
    name: string;
    pricePaise: number;
    extraPrepMinutes: number;
    allergens: string[];
  }[];
}
export function priceLines(
  lines: CartLine[],
  items: PricingItem[],
): PricedLine[] {
  return [...lines]
    .sort(
      (a, b) =>
        a.portionId.localeCompare(b.portionId) ||
        [...a.addonIds]
          .sort()
          .join()
          .localeCompare([...b.addonIds].sort().join()),
    )
    .map((line) => {
      const item = items.find((item) =>
        item.portions.some((portion) => portion.id === line.portionId),
      );
      const portion = item?.portions.find(
        (portion) => portion.id === line.portionId,
      );
      if (
        !item ||
        !portion ||
        portion.prices.length !== 1 ||
        !item.availability[0]?.isAvailable
      )
        throw new HttpError(
          409,
          "An item is unavailable or its city price changed. Review your menu and cart.",
        );
      const addons = [...line.addonIds].sort().map((id) => {
        const addon = item.addons.find((addon) => addon.id === id);
        if (!addon)
          throw new HttpError(
            400,
            "An add-on does not belong to the selected dish.",
          );
        return addon;
      });
      return {
        portionId: portion.id,
        addonIds: [...line.addonIds].sort(),
        itemId: item.id,
        name: item.name,
        portionName: portion.name,
        quantity: line.quantity,
        unitPricePaise:
          portion.prices[0].pricePaise +
          addons.reduce((sum, addon) => sum + addon.pricePaise, 0),
        prepMinutes:
          (portion.prepMinutesOverride ?? item.basePrepMinutes) +
          addons.reduce((sum, addon) => sum + addon.extraPrepMinutes, 0),
        isVeg: item.isVeg,
        allergens: [
          ...new Set([
            ...item.allergens,
            ...addons.flatMap((addon) => addon.allergens),
          ]),
        ].sort(),
        addons: addons.map(({ id, name, pricePaise }) => ({
          id,
          name,
          pricePaise,
        })),
      };
    });
}
export function calculateTotals(
  items: Pick<PricedLine, "quantity" | "unitPricePaise">[],
  coupon?: {
    discountType: "PERCENT" | "FLAT";
    value: number;
    minOrderPaise: number;
    maxDiscountPaise: number | null;
  },
): PriceSummary {
  const subtotalPaise = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPricePaise,
    0,
  );
  if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise > 100_000_000)
    throw new HttpError(
      400,
      "This order exceeds the online order limit. Reduce quantities and try again.",
    );
  if (coupon && subtotalPaise < coupon.minOrderPaise)
    throw new HttpError(
      400,
      "Your cart does not meet this coupon's minimum spend.",
    );
  const raw = coupon
    ? coupon.discountType === "PERCENT"
      ? Math.round((subtotalPaise * coupon.value) / 100)
      : coupon.value
    : 0;
  const discountPaise = Math.min(
    subtotalPaise,
    raw,
    coupon?.maxDiscountPaise ?? subtotalPaise,
  );
  const totalPaise = subtotalPaise - discountPaise;
  const includedTaxPaise = Math.round((totalPaise * 5) / 105);
  const cgstPaise = Math.floor(includedTaxPaise / 2);
  return {
    subtotalPaise,
    discountPaise,
    totalPaise,
    includedTaxPaise,
    cgstPaise,
    sgstPaise: includedTaxPaise - cgstPaise,
  };
}
