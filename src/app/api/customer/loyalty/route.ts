import { requireViewer } from "@/features/auth/session";
import { getOrCreateLoyaltyAccount } from "@/features/loyalty/service";
import { apiError } from "@/server/http/errors";

export async function GET() {
  try {
    const viewer = await requireViewer(["CUSTOMER"]);
    const account = await getOrCreateLoyaltyAccount(viewer.id);
    return Response.json({ account }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
