import "server-only";
import { notFound } from "next/navigation";
import type { Viewer } from "@/features/auth/policy";
import { HttpError } from "@/server/http/errors";
import { findOrder } from "./repository";
export async function loadOrderPage(viewer: Viewer, id: string) {
  if (!id || id.length > 128) notFound();
  try {
    return await findOrder(viewer, id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }
}
