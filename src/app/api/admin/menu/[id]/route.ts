import { z } from "zod";
import { requireViewer } from "@/features/auth/session";
import {
  getAdminMenuItem,
  updateMenuItem,
  toggleItemActiveStatus,
} from "@/features/menu/admin-service";
import { updateMenuItemSchema } from "@/features/menu/validation";
import { apiError, HttpError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

const toggleStatusSchema = z.object({
  isActive: z.boolean(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid item ID.");
    const item = await getAdminMenuItem(viewer, id);
    return Response.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid item ID.");
    const input = await readJson(request, updateMenuItemSchema);
    const item = await updateMenuItem(viewer, id, input);
    return Response.json({ item });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid item ID.");
    const { isActive } = await readJson(request, toggleStatusSchema);
    const item = await toggleItemActiveStatus(viewer, id, isActive);
    return Response.json({ item });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid item ID.");
    const item = await toggleItemActiveStatus(viewer, id, false);
    return Response.json({ item, message: "Dish deactivated successfully." });
  } catch (error) {
    return apiError(error);
  }
}
