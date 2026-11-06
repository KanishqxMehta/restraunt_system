import { requireViewer } from "@/features/auth/session";
import { confirmCateringOrder } from "@/features/catering/confirmation-service";
import { apiError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";
import { z } from "zod";

const confirmCateringSchema = z.object({
  action: z.enum(["CONFIRM", "DECLINE"]),
  notes: z.string().trim().max(250).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const viewer = await requireViewer(["KITCHEN_STAFF", "CENTRAL_ADMIN"]);
    const { id } = await context.params;
    const input = await readJson(request, confirmCateringSchema);
    const result = await confirmCateringOrder(viewer, id, input);
    return Response.json({ success: true, catering: result });
  } catch (error) {
    return apiError(error);
  }
}
