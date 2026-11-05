import { z } from "zod";
import { requireViewer } from "@/features/auth/session";
import { overrideOrderPromise } from "@/features/orders/kitchen-service";
import { apiError, HttpError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

const overrideInputSchema = z.object({
  extraMinutes: z.number().int().min(1).max(180),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(200),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer(["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
    requireSameOrigin(request);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid ticket.");

    const { extraMinutes, reason } = await readJson(request, overrideInputSchema);
    const result = await overrideOrderPromise(viewer, id, extraMinutes, reason);

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
