import { z } from "zod";
import { requireViewer } from "@/features/auth/session";
import { advanceKitchenStage } from "@/features/orders/kitchen-service";
import { kitchenStages } from "@/features/orders/stages";
import { apiError, HttpError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

const stageInput = z.object({ expectedStage: z.enum(kitchenStages) }).strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer(["KITCHEN_STAFF"]);
    requireSameOrigin(request);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid ticket.");
    const { expectedStage } = await readJson(request, stageInput);
    return Response.json(await advanceKitchenStage(viewer, id, expectedStage), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
