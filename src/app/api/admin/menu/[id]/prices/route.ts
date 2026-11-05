import { requireViewer } from "@/features/auth/session";
import {
  updatePortionPrices,
  addPortion,
} from "@/features/menu/admin-service";
import {
  updatePortionPricesSchema,
  portionInputSchema,
} from "@/features/menu/validation";
import { apiError, HttpError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid item ID.");

    const { portionId, prices } = await readJson(
      request,
      updatePortionPricesSchema,
    );
    const portion = await updatePortionPrices(viewer, id, portionId, prices);
    return Response.json({ portion });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid item ID.");

    const input = await readJson(request, portionInputSchema);
    const portion = await addPortion(viewer, id, input);
    return Response.json({ portion }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
