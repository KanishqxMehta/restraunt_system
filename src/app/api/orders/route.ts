import { createPendingOrder } from "@/features/checkout/service";
import { createOrderSchema } from "@/features/checkout/validation";
import { readJson, requireSameOrigin } from "@/server/http/request";
import { requireViewer } from "@/features/auth/session";
import { listOrders } from "@/features/orders/repository";
import { apiError } from "@/server/http/errors";
export async function GET() {
  try {
    return Response.json(
      { orders: await listOrders(await requireViewer()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer(["CUSTOMER"]);
    requireSameOrigin(request);
    return Response.json(
      await createPendingOrder(
        viewer,
        await readJson(request, createOrderSchema),
      ),
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
