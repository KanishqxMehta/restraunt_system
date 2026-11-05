import { z } from "zod";
import { requireViewer } from "@/features/auth/session";
import { findOrder } from "@/features/orders/repository";
import { getDatabase } from "@/server/db/client";
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

    // Verify viewer has access to this order
    await findOrder(viewer, parsed.data);

    const db = getDatabase();
    const notifications = await db.orderNotification.findMany({
      where: { orderId: parsed.data },
      orderBy: { sentAt: "asc" },
      select: {
        id: true,
        orderId: true,
        channel: true,
        event: true,
        recipient: true,
        title: true,
        body: true,
        whatsappDeepLink: true,
        gatewayMessageId: true,
        sentAt: true,
      },
    });

    return Response.json(
      { notifications },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
