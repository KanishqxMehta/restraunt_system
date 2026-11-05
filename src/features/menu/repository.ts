import { requireRole, type Viewer } from "@/features/auth/policy";
import "server-only";
import { getDatabase } from "@/server/db/client";

export function listAdminMenu(viewer: Viewer) {
  requireRole(viewer, ["CENTRAL_ADMIN"]);
  return getDatabase().menuItem.findMany({
    include: {
      portions: { include: { prices: true } },
      addons: true,
      availability: {
        include: { outlet: { select: { id: true, name: true, city: true } } },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}
