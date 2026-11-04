import { z } from "zod";
import { requireViewer } from "@/features/auth/session";
import { findOrder } from "@/features/orders/repository";
import { apiError, HttpError } from "@/server/http/errors";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer();
    const parsed = z
      .string()
      .min(1)
      .max(128)
      .safeParse((await context.params).id);
    if (!parsed.success) throw new HttpError(400, "Invalid order identifier.");
    return Response.json(
      { order: await findOrder(viewer, parsed.data) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
