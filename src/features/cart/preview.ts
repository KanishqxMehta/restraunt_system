import type { CartLine } from "@/features/checkout/validation";
import type { CustomerMenuItem } from "@/features/menu/types";
export function previewCart(lines: CartLine[], items: CustomerMenuItem[]) {
  return lines.map((line) => {
    const item = items.find((item) =>
      item.portions.some((portion) => portion.id === line.portionId),
    );
    const portion = item?.portions.find(
      (portion) => portion.id === line.portionId,
    );
    const addons =
      item?.addons.filter((addon) => line.addonIds.includes(addon.id)) ?? [];
    const invalid =
      !item ||
      !portion ||
      !item.isAvailable ||
      addons.length !== line.addonIds.length;
    return {
      ...line,
      name: item?.name ?? "Unavailable item",
      portionName: portion?.name ?? "",
      addons,
      unitPricePaise:
        (portion?.pricePaise ?? 0) +
        addons.reduce((sum, addon) => sum + addon.pricePaise, 0),
      invalid,
    };
  });
}
