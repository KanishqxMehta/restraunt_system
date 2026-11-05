import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { HttpError } from "@/server/http/errors";
import { isOpenAt } from "@/features/outlets/serviceability";

export type DatabaseReader = Pick<
  Prisma.TransactionClient,
  "outlet" | "menuItem" | "coupon" | "couponRedemption"
>;
export const outletSelection = {
  id: true,
  slug: true,
  name: true,
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  deliveryRadiusKm: true,
  fssaiLicense: true,
  minimumPrepMinutes: true,
  packingMinutes: true,
  opensAtMinute: true,
  closesAtMinute: true,
  isActive: true,
} as const;

export async function loadCatalog(
  outletId: string,
  database: DatabaseReader = getDatabase(),
) {
  const outlet = await database.outlet.findUnique({
    where: { id: outletId },
    select: outletSelection,
  });
  if (!outlet || !outlet.isActive)
    throw new HttpError(404, "This outlet is not available.");
  const items = await database.menuItem.findMany({
    where: { isActive: true, availability: { some: { outletId } } },
    include: {
      portions: {
        include: { prices: { where: { city: outlet.city } } },
        orderBy: { id: "asc" },
      },
      addons: { orderBy: { id: "asc" } },
      availability: { where: { outletId } },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return { outlet, items };
}

export async function getCustomerMenu(outletId: string) {
  const { outlet, items } = await loadCatalog(outletId);
  return {
    outlet,
    isOpen: isOpenAt(outlet.opensAtMinute, outlet.closesAtMinute, new Date()),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl,
      isVeg: item.isVeg,
      allergens: item.allergens,
      spiceLevel: item.spiceLevel,
      isAvailable: Boolean(item.availability[0]?.isAvailable),
      portions: item.portions
        .filter((portion) => portion.prices.length > 0)
        .map((portion) => ({
          id: portion.id,
          name: portion.name,
          pricePaise: portion.prices[0].pricePaise,
        }))
        .sort((a, b) => a.pricePaise - b.pricePaise),
      addons: item.addons.map((addon) => ({
        id: addon.id,
        name: addon.name,
        pricePaise: addon.pricePaise,
        allergens: addon.allergens,
      })),
    })),
  };
}
