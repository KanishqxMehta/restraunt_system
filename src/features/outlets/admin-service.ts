import "server-only";
import { getDatabase } from "@/server/db/client";
import { requireRole, type Viewer } from "@/features/auth/policy";
import type { CreateOutletInput, UpdateOutletInput } from "./validation";

export async function listAllOutletsWithStats(viewer: Viewer) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);
  const db = getDatabase();

  const outlets = await db.outlet.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          orders: true,
          availability: {
            where: { isAvailable: true },
          },
        },
      },
      orders: {
        where: {
          status: { in: ["NEW", "PREPARING", "READY"] },
        },
        select: { id: true },
      },
    },
  });

  return outlets.map((o) => ({
    id: o.id,
    slug: o.slug,
    name: o.name,
    city: o.city,
    address: o.address,
    latitude: o.latitude,
    longitude: o.longitude,
    deliveryRadiusKm: o.deliveryRadiusKm,
    fssaiLicense: o.fssaiLicense,
    isCloudKitchen: o.isCloudKitchen,
    isActive: o.isActive,
    minimumPrepMinutes: o.minimumPrepMinutes,
    packingMinutes: o.packingMinutes,
    kitchenCapacity: o.kitchenCapacity,
    opensAtMinute: o.opensAtMinute,
    closesAtMinute: o.closesAtMinute,
    activeTicketCount: o.orders.length,
    lifetimeOrderCount: o._count.orders,
    availableDishesCount: o._count.availability,
    createdAt: o.createdAt.toISOString(),
  }));
}

export async function createOutlet(viewer: Viewer, input: CreateOutletInput) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);
  const db = getDatabase();

  const baseSlug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  let slug = baseSlug;
  let counter = 1;
  while (await db.outlet.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  return db.$transaction(async (tx) => {
    const outlet = await tx.outlet.create({
      data: {
        name: input.name,
        slug,
        city: input.city,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        deliveryRadiusKm: input.deliveryRadiusKm,
        fssaiLicense: input.fssaiLicense,
        isCloudKitchen: input.isCloudKitchen,
        minimumPrepMinutes: input.minimumPrepMinutes,
        packingMinutes: input.packingMinutes,
        kitchenCapacity: input.kitchenCapacity,
        opensAtMinute: input.opensAtMinute,
        closesAtMinute: input.closesAtMinute,
        isActive: true,
      },
    });

    // Populate default availability for all existing menu items
    const allItems = await tx.menuItem.findMany({ select: { id: true } });
    if (allItems.length > 0) {
      await tx.outletAvailability.createMany({
        data: allItems.map((item) => ({
          outletId: outlet.id,
          itemId: item.id,
          isAvailable: true,
        })),
        skipDuplicates: true,
      });
    }

    return outlet;
  });
}

export async function updateOutlet(viewer: Viewer, id: string, input: UpdateOutletInput) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);
  const db = getDatabase();

  const existing = await db.outlet.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Outlet not found");
  }

  return db.outlet.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.deliveryRadiusKm !== undefined ? { deliveryRadiusKm: input.deliveryRadiusKm } : {}),
      ...(input.fssaiLicense !== undefined ? { fssaiLicense: input.fssaiLicense } : {}),
      ...(input.isCloudKitchen !== undefined ? { isCloudKitchen: input.isCloudKitchen } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.minimumPrepMinutes !== undefined ? { minimumPrepMinutes: input.minimumPrepMinutes } : {}),
      ...(input.packingMinutes !== undefined ? { packingMinutes: input.packingMinutes } : {}),
      ...(input.kitchenCapacity !== undefined ? { kitchenCapacity: input.kitchenCapacity } : {}),
      ...(input.opensAtMinute !== undefined ? { opensAtMinute: input.opensAtMinute } : {}),
      ...(input.closesAtMinute !== undefined ? { closesAtMinute: input.closesAtMinute } : {}),
    },
  });
}

export async function deleteOutlet(viewer: Viewer, id: string) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);
  const db = getDatabase();

  const existing = await db.outlet.findUnique({
    where: { id },
    include: {
      orders: {
        where: { status: { in: ["NEW", "PREPARING", "READY"] } },
      },
    },
  });

  if (!existing) {
    throw new Error("Outlet not found");
  }

  if (existing.orders.length > 0) {
    throw new Error(
      `Cannot delete outlet "${existing.name}" because it has ${existing.orders.length} active order(s) in preparation. Mark it inactive instead.`,
    );
  }

  return db.outlet.delete({
    where: { id },
  });
}
