import { formatTime } from "@/lib/format";
import type { NotificationEvent } from "@/generated/prisma/enums";

export interface NotificationOrderContext {
  id: string;
  orderNumber: string;
  outletName: string;
  promisedReadyAt: Date;
  items: Array<{ name: string; portionName: string; quantity: number }>;
  baseUrl?: string;
  extraMinutes?: number;
  reason?: string;
}

export interface FormattedNotification {
  event: NotificationEvent;
  sms: {
    title: string;
    body: string;
  };
  whatsapp: {
    title: string;
    body: string;
    deepLink: string;
  };
}

export function buildNotificationTemplates(
  event: NotificationEvent,
  context: NotificationOrderContext,
): FormattedNotification {
  const baseUrl = context.baseUrl || "http://localhost:3000";
  const trackingUrl = `${baseUrl}/orders/${context.id}`;
  const readyTime = formatTime(context.promisedReadyAt);

  const itemList = context.items
    .map((item) => `• ${item.quantity} × ${item.name} (${item.portionName})`)
    .join("\n");

  switch (event) {
    case "ORDER_CONFIRMED": {
      const smsBody = `Company A: Order #${context.orderNumber} confirmed! Prepared fresh at ${context.outletName}. Promised ready by ${readyTime}. Track: ${trackingUrl}`;
      const whatsappBody = `🍽️ *Company A Hyderabad — Order Confirmed!*\n\nThank you for ordering direct! Your order *#${context.orderNumber}* has been received at our *${context.outletName}* kitchen.\n\n📦 *Order Items:*\n${itemList}\n\n⏱️ *Kitchen Ready By:* ${readyTime}\n📍 *Kitchen Outlet:* ${context.outletName}\n\nTrack your order in real time:\n${trackingUrl}`;

      return {
        event,
        sms: {
          title: `Order #${context.orderNumber} Confirmed`,
          body: smsBody,
        },
        whatsapp: {
          title: `🍽️ Order #${context.orderNumber} Confirmed`,
          body: whatsappBody,
          deepLink: `https://wa.me/?text=${encodeURIComponent(whatsappBody)}`,
        },
      };
    }

    case "COOKING_STARTED": {
      const smsBody = `Company A: Your order #${context.orderNumber} is now being prepared at ${context.outletName}. Promised by ${readyTime}. Track: ${trackingUrl}`;
      const whatsappBody = `🔥 *Dum Cooking in Progress!*\n\nOur kitchen team at *${context.outletName}* has started preparing order *#${context.orderNumber}*.\n\nSlow dum cooking is underway with authentic spices.\n\n⏱️ *Expected Ready Time:* ${readyTime}\n\nTrack live kitchen progress:\n${trackingUrl}`;

      return {
        event,
        sms: {
          title: `Cooking Started #${context.orderNumber}`,
          body: smsBody,
        },
        whatsapp: {
          title: `🔥 Cooking Started #${context.orderNumber}`,
          body: whatsappBody,
          deepLink: `https://wa.me/?text=${encodeURIComponent(whatsappBody)}`,
        },
      };
    }

    case "PROMISE_EXTENDED": {
      const reason = context.reason || "Dum pot slow to seal / Station rush";
      const extra = context.extraMinutes ? `+${context.extraMinutes}m` : "Extended";
      const smsBody = `Company A: Update on order #${context.orderNumber}. To ensure authentic dum quality, promised ready time is now ${readyTime} (${reason}). Track: ${trackingUrl}`;
      const whatsappBody = `⏱️ *Preparation Update — Supervisor Care*\n\nOur kitchen supervisor at *${context.outletName}* has adjusted the promised preparation time for order *#${context.orderNumber}* (${extra}).\n\n*Reason:* ${reason}\n*New Promised Ready Time:* ${readyTime}\n\nWe apologize for the extra minutes—we are ensuring your dishes are served piping hot.\n${trackingUrl}`;

      return {
        event,
        sms: {
          title: `Ready Time Adjusted #${context.orderNumber}`,
          body: smsBody,
        },
        whatsapp: {
          title: `⏱️ Promise Adjusted #${context.orderNumber}`,
          body: whatsappBody,
          deepLink: `https://wa.me/?text=${encodeURIComponent(whatsappBody)}`,
        },
      };
    }

    case "READY_FOR_PICKUP": {
      const smsBody = `Company A: Order #${context.orderNumber} is packed and ready for pickup at ${context.outletName}! Delivery partner notified. Track: ${trackingUrl}`;
      const whatsappBody = `🎉 *Fresh & Ready for Pickup!*\n\nGreat news! Your order *#${context.orderNumber}* is freshly packed and ready at *${context.outletName}*.\n\n🛵 Our delivery partner has been notified for rider collection & transit.\n\nTrack live handoff:\n${trackingUrl}`;

      return {
        event,
        sms: {
          title: `Order Ready #${context.orderNumber}`,
          body: smsBody,
        },
        whatsapp: {
          title: `🎉 Order Ready #${context.orderNumber}`,
          body: whatsappBody,
          deepLink: `https://wa.me/?text=${encodeURIComponent(whatsappBody)}`,
        },
      };
    }

    case "ORDER_HANDED_OFF": {
      const smsBody = `Company A: Order #${context.orderNumber} handed off to delivery partner! Enjoy your meal. Track: ${trackingUrl}`;
      const whatsappBody = `🛵 *Order Handed Off to Rider!*\n\nYour order *#${context.orderNumber}* has been handed off to the delivery partner and is on its way to you.\n\nThank you for dining with Company A Hyderabad! Enjoy your meal.\n\nView final receipt:\n${trackingUrl}`;

      return {
        event,
        sms: {
          title: `Handed Off #${context.orderNumber}`,
          body: smsBody,
        },
        whatsapp: {
          title: `🛵 Handed Off #${context.orderNumber}`,
          body: whatsappBody,
          deepLink: `https://wa.me/?text=${encodeURIComponent(whatsappBody)}`,
        },
      };
    }
  }
}
