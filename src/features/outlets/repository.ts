import "server-only";
import { getDatabase } from "@/server/db/client";
import type { Viewer } from "@/features/auth/policy";

export function listOutlets(viewer: Viewer) {
  return getDatabase().outlet.findMany({
    where:
      viewer.role === "KITCHEN_STAFF"
        ? { id: { in: viewer.outletIds } }
        : { isActive: true },
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      fssaiLicense: true,
      minimumPrepMinutes: true,
      isCloudKitchen: true,
    },
    orderBy: { name: "asc" },
  });
}
