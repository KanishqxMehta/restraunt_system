import { getViewer } from "@/features/auth/session";
import { listAvailableCustomerCoupons } from "@/features/coupons/service";
import { apiError } from "@/server/http/errors";

export async function GET() {
  try {
    const viewer = await getViewer();
    const coupons = await listAvailableCustomerCoupons(viewer?.id);
    return Response.json(
      { coupons },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
