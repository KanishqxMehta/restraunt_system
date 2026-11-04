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
