import { requireViewer } from "@/features/auth/session";
import { updateItemAvailability } from "@/features/menu/admin-service";
import { pauseItemStockSchema } from "@/features/menu/validation";
import { apiError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
    const { itemId, outletId, isAvailable } = await readJson(
      request,
      pauseItemStockSchema,
    );

    const result = await updateItemAvailability(
      viewer,
      itemId,
      outletId,
      isAvailable,
    );
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
