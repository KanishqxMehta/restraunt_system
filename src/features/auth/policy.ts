import type { Role } from "./roles";
import { HttpError } from "@/server/http/errors";

export interface Viewer {
  id: string;
  name: string;
  email: string;
  role: Role;
  outletIds: string[];
}

export function requireRole(viewer: Viewer, allowed: readonly Role[]): void {
  if (!allowed.includes(viewer.role))
    throw new HttpError(403, "You do not have access to this area.");
}

export function orderScope(viewer: Viewer) {
  if (viewer.role === "CENTRAL_ADMIN") return {};
  if (viewer.role === "KITCHEN_STAFF")
    return { outletId: { in: viewer.outletIds } };
  return { customerId: viewer.id };
}
