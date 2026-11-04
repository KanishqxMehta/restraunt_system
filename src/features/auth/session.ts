import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./server";
import { getDatabase } from "@/server/db/client";
import { HttpError } from "@/server/http/errors";
import { requireRole, type Viewer } from "./policy";
import { homeForRole, type Role } from "./roles";

export async function getViewer(): Promise<Viewer | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  // Read current permissions from the database, never client parameters or cached role claims.
  const user = await getDatabase().user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      memberships: { select: { outletId: true } },
    },
  });
  return user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        outletIds: user.memberships.map((membership) => membership.outletId),
      }
    : null;
}

export async function requireViewer(
  allowed?: readonly Role[],
): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new HttpError(401, "Please sign in to continue.");
  if (allowed) requireRole(viewer, allowed);
  return viewer;
}

export async function requirePageViewer(
  allowed: readonly Role[],
): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!allowed.includes(viewer.role)) redirect(homeForRole(viewer.role));
  return viewer;
}
