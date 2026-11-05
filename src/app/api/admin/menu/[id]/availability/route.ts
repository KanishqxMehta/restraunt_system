import { requireViewer } from "@/features/auth/session";
import { updateItemAvailability } from "@/features/menu/admin-service";
import { updateAvailabilitySchema } from "@/features/menu/validation";
import { apiError, HttpError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["CENTRAL_ADMIN", "KITCHEN_STAFF"]);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid item ID.");

    const { outletId, isAvailable } = await readJson(
      request,
      updateAvailabilitySchema,
    );

    const result = await updateItemAvailability(
      viewer,
      id,
      outletId,
      isAvailable,
    );
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
