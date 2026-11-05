import { requireViewer } from "@/features/auth/session";
import { processMockPayment } from "@/features/checkout/service";
import { mockPaymentSchema } from "@/features/checkout/validation";
import { readJson, requireSameOrigin } from "@/server/http/request";
import { apiError, HttpError } from "@/server/http/errors";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer(["CUSTOMER"]);
    requireSameOrigin(request);
    const { id } = await context.params;
    if (!id || id.length > 128) throw new HttpError(400, "Invalid order.");
    return Response.json(
      await processMockPayment(
        viewer,
        id,
        await readJson(request, mockPaymentSchema),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
