import { getDatabase } from "@/server/db/client";
import { buildNotificationTemplates } from "./templates";
import type { NotificationEvent } from "@/generated/prisma/enums";

export async function dispatchOrderNotifications(
  orderId: string,
  event: NotificationEvent,
  options?: {
    extraMinutes?: number;
    reason?: string;
  },
) {
  try {
    const db = getDatabase();
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        outlet: { select: { name: true } },
        customer: { select: { name: true, email: true } },
        items: { select: { name: true, portionName: true, quantity: true } },
      },
    });

    if (!order) return;

    const templates = buildNotificationTemplates(event, {
      id: order.id,
      orderNumber: order.orderNumber,
      outletName: order.outlet.name,
      promisedReadyAt: order.promisedReadyAt,
      items: order.items,
      baseUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      extraMinutes: options?.extraMinutes,
      reason: options?.reason,
    });

    const recipient = "+91 98765 43210"; // Synthetic customer contact number
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const whatsappMsgId = `wamid.HB_${Date.now()}_${randomSuffix}`;
    const smsMsgId = `SM_${Date.now()}_${randomSuffix}`;

    await db.orderNotification.createMany({
      data: [
        {
          orderId: order.id,
          channel: "WHATSAPP",
          event,
          recipient,
          title: templates.whatsapp.title,
          body: templates.whatsapp.body,
          whatsappDeepLink: templates.whatsapp.deepLink,
          gatewayMessageId: whatsappMsgId,
        },
        {
          orderId: order.id,
          channel: "SMS",
          event,
          recipient,
          title: templates.sms.title,
          body: templates.sms.body,
          gatewayMessageId: smsMsgId,
        },
      ],
    });
  } catch (err) {
    console.error("[Notification Dispatcher] Failed to dispatch mock notification:", err);
  }
}
