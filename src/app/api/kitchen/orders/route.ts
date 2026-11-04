import { requireViewer } from "@/features/auth/session";
import { listKitchenOrders } from "@/features/orders/repository";
import { apiError } from "@/server/http/errors";
export async function GET() {
  try {
    return Response.json(
      {
        orders: await listKitchenOrders(
          await requireViewer(["KITCHEN_STAFF", "CENTRAL_ADMIN"]),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
