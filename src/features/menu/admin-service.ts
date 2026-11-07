import "server-only";
import { getDatabase } from "@/server/db/client";
import { requireRole, type Viewer } from "@/features/auth/policy";
import { HttpError } from "@/server/http/errors";
import { serializable } from "@/server/db/transaction";
import type { z } from "zod";
import type {
  createMenuItemSchema,
  updateMenuItemSchema,
  portionInputSchema,
} from "./validation";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `item-${Date.now()}`;
}

export async function listAdminMenuWithOutlets(viewer: Viewer) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);
  const db = getDatabase();

  const [items, outlets] = await Promise.all([
    db.menuItem.findMany({
      include: {
        portions: {
          include: { prices: { orderBy: { city: "asc" } } },
          orderBy: { name: "asc" },
        },
        addons: { orderBy: { name: "asc" } },
        availability: {
          include: { outlet: { select: { id: true, name: true, city: true } } },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    db.outlet.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        isCloudKitchen: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return { items, outlets };
}

export async function getAdminMenuItem(viewer: Viewer, id: string) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);
  const db = getDatabase();

  const item = await db.menuItem.findUnique({
    where: { id },
    include: {
      portions: {
        include: { prices: true },
      },
      addons: true,
      availability: {
        include: { outlet: { select: { id: true, name: true, city: true } } },
      },
    },
  });

  if (!item) {
    throw new HttpError(404, "Menu item not found.");
  }
  return item;
}

export async function createMenuItem(
  viewer: Viewer,
  input: z.infer<typeof createMenuItemSchema>,
) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);

  return serializable(async (transaction) => {
    let slug = input.slug ? slugify(input.slug) : slugify(input.name);

    // Verify slug uniqueness, deduplicating if collision occurs
    const existing = await transaction.menuItem.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const { portions, addons, ...details } = input;

    const item = await transaction.menuItem.create({
      data: {
        ...details,
        isActive: details.isActive ?? false,
        slug,
        allergens: details.allergens ?? [],
      },
    });

    for (const portion of portions) {
      const createdPortion = await transaction.menuPortion.create({
        data: {
          itemId: item.id,
          name: portion.name,
          prepMinutesOverride: portion.prepMinutesOverride ?? null,
        },
      });

      for (const price of portion.prices) {
        await transaction.cityPrice.create({
          data: {
            portionId: createdPortion.id,
            city: price.city,
            pricePaise: price.pricePaise,
          },
        });
      }
    }

    for (const addon of addons) {
      await transaction.menuAddon.create({
        data: {
          itemId: item.id,
          name: addon.name,
          pricePaise: addon.pricePaise,
          extraPrepMinutes: addon.extraPrepMinutes ?? 0,
          allergens: addon.allergens ?? [],
        },
      });
    }

    // Auto-create availability records for all active outlets so the dish is visible chain-wide
    const outlets = await transaction.outlet.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const outlet of outlets) {
      await transaction.outletAvailability.create({
        data: {
          outletId: outlet.id,
          itemId: item.id,
          isAvailable: true,
        },
      });
    }

    const fullItem = await transaction.menuItem.findUnique({
      where: { id: item.id },
      include: {
        portions: {
          include: { prices: { orderBy: { city: "asc" } } },
          orderBy: { name: "asc" },
        },
        addons: { orderBy: { name: "asc" } },
        availability: {
          include: { outlet: { select: { id: true, name: true, city: true } } },
        },
      },
    });

    return fullItem ?? item;
  });
}

export async function updateMenuItem(
  viewer: Viewer,
  id: string,
  input: z.infer<typeof updateMenuItemSchema>,
) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);

  return serializable(async (transaction) => {
    const existing = await transaction.menuItem.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, "Menu item not found.");
    }

    return transaction.menuItem.update({
      where: { id },
      data: input,
    });
  });
}

export async function updateItemAvailability(
  viewer: Viewer,
  itemId: string,
  outletId: string,
  isAvailable: boolean,
) {
  // Can be executed by CENTRAL_ADMIN, or KITCHEN_STAFF assigned to that outlet
  if (viewer.role === "KITCHEN_STAFF") {
    if (!viewer.outletIds.includes(outletId)) {
      throw new HttpError(403, "You can only manage stock for your assigned kitchen outlet.");
    }
  } else if (viewer.role !== "CENTRAL_ADMIN") {
    throw new HttpError(403, "You do not have permission to manage item stock.");
  }

  return serializable(async (transaction) => {
    const [item, outlet] = await Promise.all([
      transaction.menuItem.findUnique({ where: { id: itemId }, select: { id: true } }),
      transaction.outlet.findUnique({ where: { id: outletId }, select: { id: true } }),
    ]);

    if (!item) throw new HttpError(404, "Menu item not found.");
    if (!outlet) throw new HttpError(404, "Outlet not found.");

    const availability = await transaction.outletAvailability.upsert({
      where: {
        outletId_itemId: {
          outletId,
          itemId,
        },
      },
      update: {
        isAvailable,
      },
      create: {
        outletId,
        itemId,
        isAvailable,
      },
    });

    return {
      itemId,
      outletId,
      isAvailable: availability.isAvailable,
    };
  });
}

export async function updatePortionPrices(
  viewer: Viewer,
  itemId: string,
  portionId: string,
  prices: { city: string; pricePaise: number }[],
) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);

  return serializable(async (transaction) => {
    const portion = await transaction.menuPortion.findFirst({
      where: { id: portionId, itemId },
    });
    if (!portion) {
      throw new HttpError(404, "Portion not found for this dish.");
    }

    for (const price of prices) {
      await transaction.cityPrice.upsert({
        where: {
          portionId_city: {
            portionId,
            city: price.city,
          },
        },
        update: {
          pricePaise: price.pricePaise,
        },
        create: {
          portionId,
          city: price.city,
          pricePaise: price.pricePaise,
        },
      });
    }

    return transaction.menuPortion.findUnique({
      where: { id: portionId },
      include: { prices: true },
    });
  });
}

export async function addPortion(
  viewer: Viewer,
  itemId: string,
  input: z.infer<typeof portionInputSchema>,
) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);

  return serializable(async (transaction) => {
    const item = await transaction.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new HttpError(404, "Menu item not found.");

    const portion = await transaction.menuPortion.create({
      data: {
        itemId,
        name: input.name,
        prepMinutesOverride: input.prepMinutesOverride ?? null,
      },
    });

    for (const price of input.prices) {
      await transaction.cityPrice.create({
        data: {
          portionId: portion.id,
          city: price.city,
          pricePaise: price.pricePaise,
        },
      });
    }

    return transaction.menuPortion.findUnique({
      where: { id: portion.id },
      include: { prices: true },
    });
  });
}

export async function toggleItemActiveStatus(
  viewer: Viewer,
  itemId: string,
  isActive: boolean,
) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);

  return serializable(async (transaction) => {
    const item = await transaction.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw new HttpError(404, "Menu item not found.");

    return transaction.menuItem.update({
      where: { id: itemId },
      data: { isActive },
    });
  });
}
