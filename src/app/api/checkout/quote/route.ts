import { requireViewer } from "@/features/auth/session";
import { createQuote } from "@/features/checkout/service";
import { quoteInputSchema } from "@/features/checkout/validation";
import { readJson, requireSameOrigin } from "@/server/http/request";
import { apiError } from "@/server/http/errors";
export async function POST(request: Request) {
  try {
    const viewer = await requireViewer(["CUSTOMER"]);
    requireSameOrigin(request);
    return Response.json(
      await createQuote(viewer, await readJson(request, quoteInputSchema)),
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
