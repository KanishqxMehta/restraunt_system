import { z } from "zod";
import { requireViewer } from "@/features/auth/session";
import {
  getLoyaltySettings,
  updateLoyaltySettings,
} from "@/features/loyalty/settings";
import { apiError } from "@/server/http/errors";

const updateSchema = z.object({
  earnRupeesPerPoint: z.number().min(1).max(1000).optional(),
  redeemPaisePerPoint: z.number().min(1).max(1000).optional(),
  maxRebatePercent: z.number().min(5).max(100).optional(),
});

export async function GET() {
  try {
    await requireViewer(["CENTRAL_ADMIN"]);
    const settings = await getLoyaltySettings();
    return Response.json({ settings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireViewer(["CENTRAL_ADMIN"]);
    const json = await request.json();
    const parsed = updateSchema.parse(json);
    const updated = await updateLoyaltySettings(parsed);
    return Response.json({ settings: updated });
  } catch (error) {
    return apiError(error);
  }
}
