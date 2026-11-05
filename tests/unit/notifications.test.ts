import { describe, expect, it } from "vitest";
import { buildNotificationTemplates } from "@/features/notifications/templates";

describe("Mock Notification & Virtual Outbox Suite", () => {
  const mockContext = {
    id: "ord_cuid_test_123",
    orderNumber: "HYD-1042",
    outletName: "Banjara Hills",
    promisedReadyAt: new Date("2026-11-05T20:45:00.000Z"),
    items: [
      { name: "Chicken dum biryani", portionName: "Regular", quantity: 2 },
      { name: "Mirchi ka salan", portionName: "Regular", quantity: 1 },
    ],
    baseUrl: "http://localhost:3000",
  };

  it("generates realistic ORDER_CONFIRMED templates for SMS and WhatsApp", () => {
    const templates = buildNotificationTemplates("ORDER_CONFIRMED", mockContext);

    expect(templates.event).toBe("ORDER_CONFIRMED");
    expect(templates.sms.title).toContain("HYD-1042");
    expect(templates.sms.body).toContain("Company A: Order #HYD-1042 confirmed!");
    expect(templates.sms.body).toContain("Banjara Hills");
    expect(templates.sms.body).toContain("http://localhost:3000/orders/ord_cuid_test_123");

    expect(templates.whatsapp.title).toContain("HYD-1042");
    expect(templates.whatsapp.body).toContain("*Company A Hyderabad — Order Confirmed!*");
    expect(templates.whatsapp.body).toContain("2 × Chicken dum biryani (Regular)");
    expect(templates.whatsapp.body).toContain("1 × Mirchi ka salan (Regular)");
    expect(templates.whatsapp.deepLink).toContain("https://wa.me/?text=");
    expect(decodeURIComponent(templates.whatsapp.deepLink)).toContain("HYD-1042");
  });

  it("generates realistic COOKING_STARTED templates", () => {
    const templates = buildNotificationTemplates("COOKING_STARTED", mockContext);

    expect(templates.event).toBe("COOKING_STARTED");
    expect(templates.sms.body).toContain("prepared at Banjara Hills");
    expect(templates.whatsapp.body).toContain("*Dum Cooking in Progress!*");
    expect(templates.whatsapp.body).toContain("Banjara Hills");
  });

  it("generates realistic PROMISE_EXTENDED delay notifications with supervisor reason", () => {
    const delayContext = {
      ...mockContext,
      extraMinutes: 15,
      reason: "Hand-crafted dum pot slow to seal",
    };

    const templates = buildNotificationTemplates("PROMISE_EXTENDED", delayContext);

    expect(templates.event).toBe("PROMISE_EXTENDED");
    expect(templates.sms.body).toContain("Hand-crafted dum pot slow to seal");
    expect(templates.whatsapp.body).toContain("*Preparation Update — Supervisor Care*");
    expect(templates.whatsapp.body).toContain("Hand-crafted dum pot slow to seal");
    expect(templates.whatsapp.body).toContain("+15m");
  });

  it("generates READY_FOR_PICKUP notifications with rider packaging notice", () => {
    const templates = buildNotificationTemplates("READY_FOR_PICKUP", mockContext);

    expect(templates.event).toBe("READY_FOR_PICKUP");
    expect(templates.sms.body).toContain("packed and ready for pickup");
    expect(templates.whatsapp.body).toContain("*Fresh & Ready for Pickup!*");
    expect(templates.whatsapp.body).toContain("Our delivery partner has been notified");
  });

  it("generates ORDER_HANDED_OFF notifications for delivery completion", () => {
    const templates = buildNotificationTemplates("ORDER_HANDED_OFF", mockContext);

    expect(templates.event).toBe("ORDER_HANDED_OFF");
    expect(templates.sms.body).toContain("handed off to delivery partner");
    expect(templates.whatsapp.body).toContain("*Order Handed Off to Rider!*");
    expect(templates.whatsapp.body).toContain("Enjoy your meal");
  });
});
