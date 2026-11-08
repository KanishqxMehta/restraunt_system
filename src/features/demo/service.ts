import "server-only";
import crypto from "node:crypto";
import { getDatabase } from "@/server/db/client";
import { HttpError } from "@/server/http/errors";
import { dispatchOrderNotifications } from "@/features/notifications/dispatcher";
import { getLoyaltySettings } from "@/features/loyalty/settings";
import {
  fetchOutletKitchenLoad,
  predictKitchenPrepTime,
} from "@/features/orders/ai-estimation";

function assertDemoEnabled() {
  if (process.env.ENABLE_DEMO_DATA !== "true") {
    throw new HttpError(403, "Demo actions are strictly disabled in production.");
  }
}

/**
 * Generates a collision-proof unique order number with the DEMO- prefix
 * so every demo action can be applied repeatedly without unique constraint errors.
 */
function uniqueDemoOrderNumber(prefix: string, index: number = 0): string {
  const timePart = Date.now().toString(36).toUpperCase().slice(-4);
  const randPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  const suffix = index > 0 ? `-${String(index).padStart(2, "0")}` : "";
  return `DEMO-${prefix}-${timePart}${randPart}${suffix}`;
}

/**
 * Universal Demo Reset - Available to ALL roles.
 * Cleans up temporary demo orders, resets item availability across all outlets,
 * enables all outlets, restores baseline seeded KDS tickets, and restores demo loyalty balances.
 */
export async function resetDemoEnvironment() {
  assertDemoEnabled();
  const db = getDatabase();

  return await db.$transaction(
    async (tx) => {
      // 1. Delete all coupon redemptions (onDelete: Restrict guard)
      await tx.couponRedemption.deleteMany({});

      // 2. Delete all orders permanently (PostgreSQL cascades OrderItem, OrderEvent, OrderNotification, PaymentAttempt)
      await tx.order.deleteMany({});

      // 3. Remove temporary flash demo coupons if created
      await tx.coupon.deleteMany({
        where: {
          code: { in: ["ROYAL25", "NAWABI150"] },
        },
      });

      // 4. Reset all outlet dish availabilities to true
      await tx.outletAvailability.updateMany({
        data: { isAvailable: true },
      });

      // 5. Ensure all outlets are active
      await tx.outlet.updateMany({
        data: { isActive: true },
      });

      // 6. Reset demo customer loyalty points to 0
      await tx.loyaltyAccount.updateMany({
        data: { pointsBalance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 },
      });

      return {
        success: true,
        message: "All orders permanently deleted and demo accounts reset.",
      };
    },
    { timeout: 30_000 },
  );
}

/**
 * Set Customer Loyalty Points (e.g. 0, 500, 1500)
 */
export async function setCustomerLoyaltyBalance(userId: string, points: number) {
  assertDemoEnabled();
  const db = getDatabase();
  const settings = await getLoyaltySettings();

  await db.loyaltyAccount.upsert({
    where: { userId },
    update: {
      pointsBalance: points,
      lifetimeEarned: Math.max(points, 500),
    },
    create: {
      userId,
      pointsBalance: points,
      lifetimeEarned: Math.max(points, 500),
      lifetimeRedeemed: 0,
    },
  });

  const discountRupees = Math.floor((points * settings.redeemPaisePerPoint) / 100);

  return {
    success: true,
    points,
    redeemPaisePerPoint: settings.redeemPaisePerPoint,
    discountRupees,
    message:
      points === 0
        ? "Loyalty balance reset to 0 points."
        : `Loyalty balance set to ${points.toLocaleString("en-IN")} points (₹${discountRupees.toLocaleString("en-IN")} discount at ${settings.redeemPaisePerPoint}p/pt).`,
  };
}

/**
 * 1-Click Place Live Tracked Customer Order (with AI ETA + Loyalty Points + WhatsApp/SMS Outbox)
 */
export async function placeDemoCustomerOrder(userId: string) {
  assertDemoEnabled();
  const db = getDatabase();

  const now = new Date();
  const orderNumber = uniqueDemoOrderNumber("LIVE");
  const subtotalPaise = 67000; // ₹670 (Mutton Dum Biryani ₹440 + Double ka meetha ₹120 + Royal Irani chai ₹110)
  const discountPaise = 6700; // 10% DIRECT10
  const totalPaise = subtotalPaise - discountPaise; // ₹603 (60300 paise)
  const pointsEarned = Math.floor(totalPaise / 1000); // 60 pts

  const orderItems = [
    {
      name: "Hyderabadi mutton dum biryani",
      portionName: "Regular",
      quantity: 1,
      unitPricePaise: 44000,
      prepMinutes: 22,
      isVeg: false,
      allergens: ["Milk"],
    },
    {
      name: "Double ka meetha",
      portionName: "Regular",
      quantity: 1,
      unitPricePaise: 12000,
      prepMinutes: 5,
      isVeg: true,
      allergens: ["Wheat", "Milk", "Tree nuts"],
    },
    {
      name: "Royal Irani chai",
      portionName: "With Bun Maska",
      quantity: 1,
      unitPricePaise: 11000,
      prepMinutes: 4,
      isVeg: true,
      allergens: ["Milk"],
    },
  ];

  // Call the genuine Gemini AI & kitchen load estimation engine
  const load = await fetchOutletKitchenLoad("outlet-kondapur", db);
  const prepResult = await predictKitchenPrepTime(
    orderItems,
    {
      id: "outlet-kondapur",
      name: "Kondapur",
      minimumPrepMinutes: 25,
      packingMinutes: 5,
    },
    load,
  );
  const promisedReadyAt = new Date(
    now.getTime() + prepResult.promisedMinutes * 60_000,
  );

  const order = await db.order.create({
    data: {
      orderNumber,
      customerId: userId,
      outletId: "outlet-kondapur",
      status: "PREPARING",
      paymentStatus: "PAID",
      paymentMethod: "UPI",
      subtotalPaise,
      discountPaise,
      pointsDiscountPaise: 0,
      totalPaise,
      couponCode: "DIRECT10",
      pointsEarned,
      includedTaxPaise: Math.round((totalPaise * 5) / 105),
      promisedReadyAt,
      originalPromiseAt: promisedReadyAt,
      estimateSource: prepResult.estimateSource,
      aiEstimatedMinutes: prepResult.aiEstimatedMinutes,
      aiExplanation: prepResult.explanation,
      deliveryAddress: "Whitefields, Hitec City - Kondapur Main Rd, Hyderabad",
      deliveryLatitude: 17.4622,
      deliveryLongitude: 78.3568,
      items: {
        create: orderItems,
      },
      events: {
        createMany: {
          data: [
            { status: "NEW", createdAt: new Date(now.getTime() - 2 * 60_000) },
            { status: "PREPARING", createdAt: now },
          ],
        },
      },
    },
  });

  // Credit loyalty points to customer wallet
  const account = await db.loyaltyAccount.upsert({
    where: { userId },
    update: {
      pointsBalance: { increment: pointsEarned },
      lifetimeEarned: { increment: pointsEarned },
    },
    create: {
      userId,
      pointsBalance: 500 + pointsEarned,
      lifetimeEarned: 500 + pointsEarned,
      lifetimeRedeemed: 0,
    },
  });

  await db.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      orderId: order.id,
      type: "EARNED",
      points: pointsEarned,
      description: `Earned ${pointsEarned} pts on direct order #${orderNumber}`,
    },
  });

  await dispatchOrderNotifications(order.id, "ORDER_CONFIRMED");
  await dispatchOrderNotifications(order.id, "COOKING_STARTED");

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    redirectUrl: `/orders/${order.id}`,
    message: `Created live order #${order.orderNumber} with AI ETA & WhatsApp/SMS notifications!`,
  };
}

/**
 * Simulate incoming kitchen rush (+3 orders)
 */
export async function simulateKitchenRush(outletId: string, count: number = 3) {
  assertDemoEnabled();
  const db = getDatabase();

  const presets = [
    {
      totalPaise: 49000,
      subtotalPaise: 49000,
      items: [
        {
          name: "Chicken dum biryani",
          portionName: "Regular",
          quantity: 1,
          unitPricePaise: 35000,
          prepMinutes: 20,
          isVeg: false,
          allergens: ["Milk"],
        },
        {
          name: "Hyderabad mint & lime mojito",
          portionName: "350ml",
          quantity: 1,
          unitPricePaise: 14000,
          prepMinutes: 3,
          isVeg: true,
          allergens: [],
        },
      ],
    },
    {
      totalPaise: 88000,
      subtotalPaise: 88000,
      items: [
        {
          name: "Hyderabadi mutton dum biryani",
          portionName: "Regular",
          quantity: 1,
          unitPricePaise: 44000,
          prepMinutes: 25,
          isVeg: false,
          allergens: ["Milk"],
        },
        {
          name: "Pathar ka gosht",
          portionName: "6 pcs",
          quantity: 1,
          unitPricePaise: 42000,
          prepMinutes: 16,
          isVeg: false,
          allergens: ["Milk"],
        },
        {
          name: "Royal sheermal",
          portionName: "2 pcs",
          quantity: 1,
          unitPricePaise: 9000,
          prepMinutes: 6,
          isVeg: true,
          allergens: ["Wheat", "Milk"],
        },
      ],
    },
    {
      totalPaise: 65000,
      subtotalPaise: 65000,
      items: [
        {
          name: "Nizami tarkari veg biryani",
          portionName: "Regular",
          quantity: 1,
          unitPricePaise: 25000,
          prepMinutes: 15,
          isVeg: true,
          allergens: ["Milk"],
        },
        {
          name: "Paneer tikka nizami",
          portionName: "6 pcs",
          quantity: 1,
          unitPricePaise: 28000,
          prepMinutes: 14,
          isVeg: true,
          allergens: ["Milk"],
        },
        {
          name: "Double ka meetha",
          portionName: "Regular",
          quantity: 1,
          unitPricePaise: 12000,
          prepMinutes: 5,
          isVeg: true,
          allergens: ["Wheat", "Milk", "Tree nuts"],
        },
      ],
    },
  ];

  const now = new Date();
  const createdOrders = [];

  for (let i = 0; i < count; i++) {
    const preset = presets[i % presets.length];
    const orderNumber = uniqueDemoOrderNumber("KITCHEN", i + 1);
    const promisedReadyAt = new Date(now.getTime() + (22 + i * 3) * 60 * 1000);

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: i % 2 === 0 ? "demo-customer" : "demo-customer-two",
        outletId,
        status: "NEW",
        paymentStatus: "PAID",
        paymentMethod: i % 2 === 0 ? "UPI" : "CARD",
        totalPaise: preset.totalPaise,
        subtotalPaise: preset.subtotalPaise,
        discountPaise: 0,
        includedTaxPaise: Math.round(preset.totalPaise * 0.05),
        promisedReadyAt,
        originalPromiseAt: promisedReadyAt,
        estimateSource: "HYBRID_PROMISE",
        aiEstimatedMinutes: 22 + i * 3,
        deliveryAddress: "Demo Live Delivery Address, Hyderabad",
        deliveryLatitude: 17.4622,
        deliveryLongitude: 78.3568,
        items: {
          create: preset.items,
        },
        events: {
          create: {
            status: "NEW",
            createdAt: now,
          },
        },
      },
    });
    await dispatchOrderNotifications(order.id, "ORDER_CONFIRMED");
    createdOrders.push(order);
  }

  return {
    success: true,
    count: createdOrders.length,
    message: `Dispatched ${createdOrders.length} new multi-station tickets to the kitchen queue.`,
  };
}

/**
 * Force SLA Overdue Ticket (promised 15 minutes ago)
 */
export async function forceKitchenSlaBreach(outletId: string) {
  assertDemoEnabled();
  const db = getDatabase();

  const now = new Date();
  const overdueTime = new Date(now.getTime() - 15 * 60 * 1000);
  const orderNumber = uniqueDemoOrderNumber("BREACH");

  const order = await db.order.create({
    data: {
      orderNumber,
      customerId: "demo-customer-two",
      outletId,
      status: "PREPARING",
      paymentStatus: "PAID",
      paymentMethod: "CARD",
      totalPaise: 76000,
      subtotalPaise: 76000,
      discountPaise: 0,
      includedTaxPaise: Math.round(76000 * 0.05),
      promisedReadyAt: overdueTime,
      originalPromiseAt: overdueTime,
      estimateSource: "OVERDUE_BREACH_SIMULATOR",
      aiEstimatedMinutes: 30,
      managerOverrideReason:
        "Simulated priority queue delay for testing kitchen alert state",
      deliveryAddress: "Gachibowli Financial District, Hyderabad",
      deliveryLatitude: 17.4401,
      deliveryLongitude: 78.3489,
      items: {
        create: [
          {
            name: "Kache gosht ki biryani",
            portionName: "Regular",
            quantity: 1,
            unitPricePaise: 49000,
            prepMinutes: 30,
            isVeg: false,
            allergens: ["Milk"],
          },
          {
            name: "Classic frappé cold coffee",
            portionName: "350ml",
            quantity: 1,
            unitPricePaise: 16000,
            prepMinutes: 4,
            isVeg: true,
            allergens: ["Milk"],
          },
          {
            name: "Royal sheermal",
            portionName: "2 pcs",
            quantity: 1,
            unitPricePaise: 9000,
            prepMinutes: 6,
            isVeg: true,
            allergens: ["Wheat", "Milk"],
          },
        ],
      },
      events: {
        createMany: {
          data: [
            { status: "NEW", createdAt: new Date(now.getTime() - 40 * 60 * 1000) },
            { status: "PREPARING", createdAt: new Date(now.getTime() - 30 * 60 * 1000) },
          ],
        },
      },
    },
  });

  await dispatchOrderNotifications(order.id, "PROMISE_EXTENDED", {
    extraMinutes: 15,
    reason: "High kitchen load — SLA breach escalation triggered",
  });

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    message: `Injected overdue ticket #${order.orderNumber} (15m past SLA promise).`,
  };
}

/**
 * 1-Click Advance Kitchen Stages (NEW -> PREPARING or PREPARING -> READY).
 * If repeated when all tickets are already READY/empty, automatically replenishes and advances
 * so repeated clicks always demonstrate stage transitions without dead-ending.
 */
export async function advanceKitchenBatch(outletId: string) {
  assertDemoEnabled();
  const db = getDatabase();

  // 1. If there are unlocked NEW tickets, move them to PREPARING
  const newOrders = await db.order.findMany({
    where: {
      outletId,
      status: "NEW",
      paymentStatus: "PAID",
      NOT: {
        isCatering: true,
        cateringStatus: { not: "CONFIRMED" },
      },
    },
    select: { id: true },
  });

  if (newOrders.length > 0) {
    await db.$transaction(async (tx) => {
      for (const order of newOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PREPARING" },
        });
        await tx.orderEvent.create({
          data: { orderId: order.id, status: "PREPARING" },
        });
      }
    });
    return {
      success: true,
      advancedCount: newOrders.length,
      nextStage: "PREPARING",
      message: `Advanced ${newOrders.length} NEW ticket(s) to PREPARING.`,
    };
  }

  // 2. Otherwise move PREPARING tickets to READY
  const preparingOrders = await db.order.findMany({
    where: {
      outletId,
      status: "PREPARING",
      paymentStatus: "PAID",
      NOT: {
        isCatering: true,
        cateringStatus: { not: "CONFIRMED" },
      },
    },
    select: { id: true },
  });

  if (preparingOrders.length > 0) {
    await db.$transaction(async (tx) => {
      for (const order of preparingOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "READY" },
        });
        await tx.orderEvent.create({
          data: { orderId: order.id, status: "READY" },
        });
      }
    });
    return {
      success: true,
      advancedCount: preparingOrders.length,
      nextStage: "READY",
      message: `Advanced ${preparingOrders.length} PREPARING ticket(s) to READY.`,
    };
  }

  // 3. If all tickets were already READY or board is empty, seed 3 fresh tickets and move 2 to PREPARING
  await simulateKitchenRush(outletId, 3);
  const freshNewOrders = await db.order.findMany({
    where: {
      outletId,
      status: "NEW",
      paymentStatus: "PAID",
      NOT: {
        isCatering: true,
        cateringStatus: { not: "CONFIRMED" },
      },
    },
    select: { id: true },
    take: 2,
  });

  if (freshNewOrders.length > 0) {
    await db.$transaction(async (tx) => {
      for (const order of freshNewOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PREPARING" },
        });
        await tx.orderEvent.create({
          data: { orderId: order.id, status: "PREPARING" },
        });
      }
    });
  }

  return {
    success: true,
    advancedCount: freshNewOrders.length,
    nextStage: "PREPARING",
    message: `Replenished board and advanced ${freshNewOrders.length} tickets into PREPARING.`,
  };
}

/**
 * 1-Click Complete & Hand-off all READY tickets.
 * If no READY tickets exist on repeat click, promotes active tickets to READY & hands them off.
 */
export async function completeKitchenReadyTickets(outletId: string) {
  assertDemoEnabled();
  const db = getDatabase();

  let readyOrders = await db.order.findMany({
    where: { outletId, status: "READY", paymentStatus: "PAID" },
    select: { id: true },
  });

  // If no READY tickets exist yet, promote up to 3 PREPARING/NEW unlocked tickets to READY first
  if (readyOrders.length === 0) {
    const activeOrders = await db.order.findMany({
      where: {
        outletId,
        status: { in: ["PREPARING", "NEW"] },
        paymentStatus: "PAID",
        NOT: {
          isCatering: true,
          cateringStatus: { not: "CONFIRMED" },
        },
      },
      select: { id: true },
      take: 3,
    });

    if (activeOrders.length === 0) {
      await simulateKitchenRush(outletId, 2);
      readyOrders = await db.order.findMany({
        where: {
          outletId,
          status: "NEW",
          paymentStatus: "PAID",
          NOT: { isCatering: true },
        },
        select: { id: true },
      });
    } else {
      readyOrders = activeOrders;
    }
  }

  await db.$transaction(async (tx) => {
    for (const order of readyOrders) {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "HANDED_OFF" },
      });
      await tx.orderEvent.create({
        data: { orderId: order.id, status: "HANDED_OFF" },
      });
    }
  });

  return {
    success: true,
    completedCount: readyOrders.length,
    message: `Handed off and archived ${readyOrders.length} order(s).`,
  };
}

/**
 * Toggle Dish 86 (Stockout) Availability
 */
export async function toggleDishStockout(outletId: string, itemId: string) {
  assertDemoEnabled();
  const db = getDatabase();

  const existing = await db.outletAvailability.findUnique({
    where: { outletId_itemId: { outletId, itemId } },
  });

  const nextState = existing ? !existing.isAvailable : false;

  await db.outletAvailability.upsert({
    where: { outletId_itemId: { outletId, itemId } },
    update: { isAvailable: nextState },
    create: { outletId, itemId, isAvailable: nextState },
  });

  return {
    success: true,
    itemId,
    isAvailable: nextState,
    message: nextState
      ? "Dish restored to IN STOCK across live customer menu."
      : "Dish marked 86 (OUT OF STOCK) — blocked on live customer menu.",
  };
}

/**
 * Inject a VIP Bulk Party Catering Order (for Customer, Kitchen KDS, or Executive Admin)
 */
export async function injectCateringBooking(options: {
  outletId: string;
  customerId?: string;
  autoConfirm?: boolean;
  guestCount?: number;
}) {
  assertDemoEnabled();
  const db = getDatabase();

  const now = new Date();
  const promisedReadyAt = new Date(now.getTime() + 180 * 60 * 1000);
  const guestCount = options.guestCount ?? (options.autoConfirm ? 120 : 75);
  const handiQty = options.autoConfirm ? 2 : 1;
  const totalPaise = options.autoConfirm ? 4500000 : 2850000; // ₹45,000 or ₹28,500
  const orderNumber = uniqueDemoOrderNumber("CAT");
  const status = options.autoConfirm ? "PREPARING" : "NEW";
  const cateringStatus = options.autoConfirm ? "CONFIRMED" : "PENDING_CONFIRMATION";

  const order = await db.order.create({
    data: {
      orderNumber,
      customerId: options.customerId || "demo-customer",
      outletId: options.outletId,
      status,
      paymentStatus: "PAID",
      paymentMethod: "UPI",
      totalPaise,
      subtotalPaise: totalPaise,
      discountPaise: 0,
      includedTaxPaise: Math.round((totalPaise * 5) / 105),
      promisedReadyAt,
      originalPromiseAt: promisedReadyAt,
      eventDate: promisedReadyAt,
      isCatering: true,
      guestCount,
      cateringStatus,
      cateringConfirmedAt: options.autoConfirm ? now : null,
      cateringConfirmedBy: options.autoConfirm ? "Central Catering Desk" : null,
      cateringNotes: options.autoConfirm
        ? "Executive banquet confirmed; 2 master dum handi stations assigned."
        : "Awaiting Catering Manager confirmation before firing handis.",
      specialInstructions: `VIP Corporate Banquet for ${guestCount} guests at Hitec City Convention Hall. Include chafing dishes & silverware.`,
      deliveryAddress: "Hitec City Convention Center, Madhapur, Hyderabad",
      deliveryLatitude: 17.4474,
      deliveryLongitude: 78.3762,
      items: {
        create: [
          {
            name: "Hyderabadi mutton dum biryani",
            portionName: "Family pack",
            quantity: handiQty * 15,
            unitPricePaise: Math.round((totalPaise * 0.7) / (handiQty * 15)),
            prepMinutes: 45,
            isVeg: false,
            allergens: ["Milk"],
          },
          {
            name: "Pathar ka gosht",
            portionName: "6 pcs",
            quantity: handiQty * 10,
            unitPricePaise: Math.round((totalPaise * 0.2) / (handiQty * 10)),
            prepMinutes: 25,
            isVeg: false,
            allergens: ["Milk"],
          },
          {
            name: "Qubani ka meetha",
            portionName: "With Malai Cream",
            quantity: handiQty * 10,
            unitPricePaise: Math.round((totalPaise * 0.1) / (handiQty * 10)),
            prepMinutes: 10,
            isVeg: true,
            allergens: ["Tree nuts"],
          },
        ],
      },
      events: {
        create: {
          status,
          createdAt: now,
        },
      },
    },
  });

  await dispatchOrderNotifications(order.id, "ORDER_CONFIRMED", {
    reason: options.autoConfirm
      ? `VIP Catering #${order.orderNumber} (${guestCount} guests) confirmed!`
      : `Bulk Catering request #${order.orderNumber} (${guestCount} guests) received and pending manager approval.`,
  });

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    guestCount,
    totalRupees: totalPaise / 100,
    message: options.autoConfirm
      ? `Injected confirmed ${guestCount}-guest Catering Banquet (#${order.orderNumber}, ₹${(totalPaise / 100).toLocaleString("en-IN")} GMV).`
      : `Injected ${guestCount}-guest Party Catering request (#${order.orderNumber}) awaiting KDS manager confirmation.`,
  };
}

/**
 * 1-Click Approve All Pending Catering Bookings at Outlet
 */
export async function approvePendingCateringBookings(outletId: string, actorName: string) {
  assertDemoEnabled();
  const db = getDatabase();

  let pendingCatering = await db.order.findMany({
    where: {
      outletId,
      isCatering: true,
      cateringStatus: "PENDING_CONFIRMATION",
    },
    select: { id: true, orderNumber: true },
  });

  // If none are currently pending, create a fresh pending catering order and approve it so repeat clicks always work
  if (pendingCatering.length === 0) {
    const created = await injectCateringBooking({
      outletId,
      autoConfirm: false,
      guestCount: 60,
    });
    pendingCatering = [{ id: created.orderId, orderNumber: created.orderNumber }];
  }

  const now = new Date();
  for (const order of pendingCatering) {
    await db.order.update({
      where: { id: order.id },
      data: {
        cateringStatus: "CONFIRMED",
        cateringConfirmedAt: now,
        cateringConfirmedBy: actorName,
        cateringNotes: "Approved via 1-Click Demo Catering Manager Confirmation.",
      },
    });
    await dispatchOrderNotifications(order.id, "ORDER_CONFIRMED", {
      reason: `Catering booking #${order.orderNumber} CONFIRMED by ${actorName}. Handi preparation unlocked!`,
    });
  }

  return {
    success: true,
    approvedCount: pendingCatering.length,
    message: `Confirmed ${pendingCatering.length} bulk catering booking(s) and unlocked KDS stage controls.`,
  };
}

/**
 * Inject burst of 50 completed orders for Executive Dashboard Analytics.
 * Uses collision-proof unique orderNumbers and fast batch createMany queries
 * so it can be applied repeatedly without errors or transaction timeouts.
 */
export async function injectAdminAnalyticsBurst(count: number = 50) {
  assertDemoEnabled();
  const db = getDatabase();

  const outlets = await db.outlet.findMany({ select: { id: true, name: true } });
  if (outlets.length === 0) throw new HttpError(400, "No outlets available.");

  const now = Date.now();
  const daysRange = 14;
  const batchPrefix = `${now.toString(36).toUpperCase().slice(-4)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  const ordersData: {
    id: string;
    orderNumber: string;
    customerId: string;
    outletId: string;
    status: "HANDED_OFF";
    paymentStatus: "PAID";
    paymentMethod: "UPI" | "CARD";
    totalPaise: number;
    subtotalPaise: number;
    discountPaise: number;
    pointsDiscountPaise: number;
    couponCode: string | null;
    includedTaxPaise: number;
    promisedReadyAt: Date;
    originalPromiseAt: Date;
    estimateSource: string;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];

  const itemsData: {
    id: string;
    orderId: string;
    name: string;
    portionName: string;
    quantity: number;
    unitPricePaise: number;
    prepMinutes: number;
    isVeg: boolean;
    allergens: string[];
  }[] = [];

  const eventsData: {
    id: string;
    orderId: string;
    status: "NEW" | "READY" | "HANDED_OFF";
    createdAt: Date;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const orderId = crypto.randomUUID();
    const randomOutlet = outlets[i % outlets.length];
    const daysAgo = (i % daysRange) + 1;
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - i * 19 * 60 * 1000);
    const orderNumber = `DEMO-HIST-${batchPrefix}-${String(i + 1).padStart(2, "0")}`;
    const subtotalPaise = 38000 + (i % 6) * 16000;
    const isDirect = i % 3 !== 0;
    const discountPaise = isDirect && i % 4 === 0 ? 3800 : 0;
    const totalPaise = subtotalPaise - discountPaise;
    const customerId = i % 2 === 0 ? "demo-customer" : "demo-customer-two";
    const prepDurationMin = 18 + (i % 7); // 18-24 mins (on-time SLA)
    const promisedReadyAt = new Date(createdAt.getTime() + 25 * 60 * 1000);
    const readyAt = new Date(createdAt.getTime() + prepDurationMin * 60 * 1000);
    const handedOffAt = new Date(readyAt.getTime() + 4 * 60 * 1000);

    ordersData.push({
      id: orderId,
      orderNumber,
      customerId,
      outletId: randomOutlet.id,
      status: "HANDED_OFF",
      paymentStatus: "PAID",
      paymentMethod: i % 2 === 0 ? "UPI" : "CARD",
      totalPaise,
      subtotalPaise,
      discountPaise,
      pointsDiscountPaise: 0,
      couponCode: discountPaise > 0 ? "DIRECT10" : null,
      includedTaxPaise: Math.round((totalPaise * 5) / 105),
      promisedReadyAt,
      originalPromiseAt: promisedReadyAt,
      estimateSource: "HISTORICAL_SIMULATION",
      createdAt,
      updatedAt: handedOffAt,
    });

    itemsData.push({
      id: crypto.randomUUID(),
      orderId,
      name: i % 3 === 0 ? "Hyderabadi mutton dum biryani" : "Chicken dum biryani",
      portionName: "Regular",
      quantity: 1,
      unitPricePaise: totalPaise,
      prepMinutes: prepDurationMin,
      isVeg: false,
      allergens: ["Milk"],
    });

    eventsData.push(
      {
        id: crypto.randomUUID(),
        orderId,
        status: "NEW",
        createdAt,
      },
      {
        id: crypto.randomUUID(),
        orderId,
        status: "READY",
        createdAt: readyAt,
      },
      {
        id: crypto.randomUUID(),
        orderId,
        status: "HANDED_OFF",
        createdAt: handedOffAt,
      },
    );
  }

  // Execute in 3 fast bulk inserts inside a single transaction
  await db.$transaction([
    db.order.createMany({ data: ordersData }),
    db.orderItem.createMany({ data: itemsData }),
    db.orderEvent.createMany({ data: eventsData }),
  ]);

  return {
    success: true,
    count: ordersData.length,
    message: `Injected ${ordersData.length} completed orders across all ${outlets.length} outlets!`,
  };
}

/**
 * Trigger real-time cancellation spike (6 orders) to test risk alerts
 */
export async function triggerCancellationSpike(outletId: string) {
  assertDemoEnabled();
  const db = getDatabase();

  const now = new Date();
  const cancelledOrders = [];

  for (let i = 0; i < 6; i++) {
    const orderNumber = uniqueDemoOrderNumber("CANCEL", i + 1);
    const createdAt = new Date(now.getTime() - (i * 2 + 1) * 60 * 1000);

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: i % 2 === 0 ? "demo-customer" : "demo-customer-two",
        outletId,
        status: "CANCELLED",
        paymentStatus: "FAILED",
        paymentMethod: "UPI",
        totalPaise: 44000,
        subtotalPaise: 44000,
        discountPaise: 0,
        includedTaxPaise: Math.round((44000 * 5) / 105),
        promisedReadyAt: createdAt,
        originalPromiseAt: createdAt,
        estimateSource: "CANCELLATION_SPIKE_SIMULATOR",
        createdAt,
        updatedAt: createdAt,
        items: {
          create: [
            {
              name: "Hyderabadi mutton dum biryani",
              portionName: "Regular",
              quantity: 1,
              unitPricePaise: 44000,
              prepMinutes: 25,
              isVeg: false,
              allergens: ["Milk"],
            },
          ],
        },
        events: {
          create: {
            status: "CANCELLED",
            createdAt,
          },
        },
      },
    });
    cancelledOrders.push(order);
  }

  return {
    success: true,
    count: cancelledOrders.length,
    message: `Triggered ${cancelledOrders.length} rapid cancellations to fire operational risk alerts.`,
  };
}

/**
 * Toggle Outlet Active status (Kitchen pause simulation)
 */
export async function toggleOutletActive(outletId: string) {
  assertDemoEnabled();
  const db = getDatabase();

  const outlet = await db.outlet.findUnique({
    where: { id: outletId },
    select: { id: true, name: true, isActive: true },
  });

  if (!outlet) throw new HttpError(404, "Outlet not found.");

  const nextState = !outlet.isActive;
  await db.outlet.update({
    where: { id: outletId },
    data: { isActive: nextState },
  });

  return {
    success: true,
    outletId,
    name: outlet.name,
    isActive: nextState,
    message: nextState
      ? `${outlet.name} kitchen RESUMED and accepting live orders.`
      : `${outlet.name} kitchen PAUSED — orders now failover to nearest cloud kitchen.`,
  };
}

/**
 * Launch Flash Festival Promotional Coupons (ROYAL25 & NAWABI150)
 */
export async function launchFlashCouponCampaign() {
  assertDemoEnabled();
  const db = getDatabase();

  const startsAt = new Date("2020-01-01T00:00:00Z");
  const expiresAt = new Date("2099-01-01T00:00:00Z");

  await db.$transaction([
    db.coupon.upsert({
      where: { code: "ROYAL25" },
      update: {
        isActive: true,
        discountType: "PERCENT",
        value: 25,
        minOrderPaise: 40000,
        maxDiscountPaise: 25000,
        startsAt,
        expiresAt,
      },
      create: {
        code: "ROYAL25",
        isActive: true,
        discountType: "PERCENT",
        value: 25,
        minOrderPaise: 40000,
        maxDiscountPaise: 25000,
        startsAt,
        expiresAt,
      },
    }),
    db.coupon.upsert({
      where: { code: "NAWABI150" },
      update: {
        isActive: true,
        discountType: "FLAT",
        value: 15000,
        minOrderPaise: 80000,
        maxDiscountPaise: null,
        startsAt,
        expiresAt,
      },
      create: {
        code: "NAWABI150",
        isActive: true,
        discountType: "FLAT",
        value: 15000,
        minOrderPaise: 80000,
        maxDiscountPaise: null,
        startsAt,
        expiresAt,
      },
    }),
  ]);

  return {
    success: true,
    coupons: ["ROYAL25", "NAWABI150"],
    message: "Activated flash coupons ROYAL25 (25% OFF) & NAWABI150 (₹150 Flat OFF) across all outlets!",
  };
}
