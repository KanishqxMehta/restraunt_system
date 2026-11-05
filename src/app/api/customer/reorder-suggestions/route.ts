import { requireViewer } from "@/features/auth/session";
import { getCustomerReorderSuggestions } from "@/features/menu/ai-reorder";
import { apiError } from "@/server/http/errors";

export async function GET(request: Request) {
  try {
    const viewer = await requireViewer(["CUSTOMER"]);
    const outletId = new URL(request.url).searchParams.get("outletId") ?? undefined;
    const result = await getCustomerReorderSuggestions(viewer.id, outletId);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
