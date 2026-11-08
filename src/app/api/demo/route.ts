import { z } from "zod";
import { getViewer } from "@/features/auth/session";
import { apiError, HttpError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";
import { getLoyaltySettings } from "@/features/loyalty/settings";
import {
  resetDemoEnvironment,
  setCustomerLoyaltyBalance,
  placeDemoCustomerOrder,
  simulateKitchenRush,
  forceKitchenSlaBreach,
  advanceKitchenBatch,
  completeKitchenReadyTickets,
  toggleDishStockout,
  injectCateringBooking,
  approvePendingCateringBookings,
  injectAdminAnalyticsBurst,
  triggerCancellationSpike,
  toggleOutletActive,
  launchFlashCouponCampaign,
} from "@/features/demo/service";

export async function GET() {
  try {
    const viewer = await getViewer();
    const loyaltySettings = await getLoyaltySettings();
    return Response.json(
      {
        role: viewer?.role,
        loyaltySettings: {
          earnRupeesPerPoint: loyaltySettings.earnRupeesPerPoint,
          redeemPaisePerPoint: loyaltySettings.redeemPaisePerPoint,
          maxRebatePercent: loyaltySettings.maxRebatePercent,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset") }),
  z.object({
    action: z.literal("set-loyalty"),
    points: z.number().int().min(0).max(10000),
  }),
  z.object({
    action: z.literal("place-demo-customer-order"),
  }),
  z.object({
    action: z.literal("simulate-kitchen-rush"),
    outletId: z.string().optional(),
    count: z.number().int().min(1).max(5).default(3),
  }),
  z.object({
    action: z.literal("force-kitchen-sla-breach"),
    outletId: z.string().optional(),
  }),
  z.object({
    action: z.literal("advance-kitchen-batch"),
    outletId: z.string().optional(),
  }),
  z.object({
    action: z.literal("complete-kitchen-ready"),
    outletId: z.string().optional(),
  }),
  z.object({
    action: z.literal("toggle-dish-stockout"),
    outletId: z.string().optional(),
    itemId: z.string().default("item-mutton-biryani"),
  }),
  z.object({
    action: z.literal("inject-catering-booking"),
    outletId: z.string().optional(),
    autoConfirm: z.boolean().default(false),
    guestCount: z.number().int().min(15).max(500).optional(),
  }),
  z.object({
    action: z.literal("approve-pending-catering"),
    outletId: z.string().optional(),
  }),
  z.object({
    action: z.literal("inject-admin-analytics"),
    count: z.number().int().min(10).max(100).default(50),
  }),
  z.object({
    action: z.literal("trigger-cancellation-spike"),
    outletId: z.string().optional(),
  }),
  z.object({
    action: z.literal("toggle-outlet-active"),
    outletId: z.string().optional(),
  }),
  z.object({
    action: z.literal("launch-flash-coupon"),
  }),
]);

export async function POST(request: Request) {
  try {
    if (process.env.ENABLE_DEMO_DATA !== "true") {
      throw new HttpError(403, "Demo actions are disabled.");
    }

    requireSameOrigin(request);
    const viewer = await getViewer();
    if (!viewer) {
      throw new HttpError(401, "Sign in to use demo tools.");
    }

    const input = await readJson(request, actionSchema);

    // 1. Reset Demo - ALWAYS allowed for ALL roles
    if (input.action === "reset") {
      const result = await resetDemoEnvironment();
      return Response.json(result);
    }

    // 2. Customer Actions
    if (input.action === "set-loyalty") {
      const result = await setCustomerLoyaltyBalance(viewer.id, input.points);
      return Response.json(result);
    }

    if (input.action === "place-demo-customer-order") {
      const result = await placeDemoCustomerOrder(viewer.id);
      return Response.json(result);
    }

    // Default outlet for kitchen/admin actions if not explicitly passed
    const targetOutletId =
      "outletId" in input && input.outletId
        ? input.outletId
        : viewer.outletIds[0] || "outlet-kondapur";

    // 3. Kitchen, Catering & Stock Actions
    if (input.action === "simulate-kitchen-rush") {
      const result = await simulateKitchenRush(targetOutletId, input.count);
      return Response.json(result);
    }

    if (input.action === "force-kitchen-sla-breach") {
      const result = await forceKitchenSlaBreach(targetOutletId);
      return Response.json(result);
    }

    if (input.action === "advance-kitchen-batch") {
      const result = await advanceKitchenBatch(targetOutletId);
      return Response.json(result);
    }

    if (input.action === "complete-kitchen-ready") {
      const result = await completeKitchenReadyTickets(targetOutletId);
      return Response.json(result);
    }

    if (input.action === "toggle-dish-stockout") {
      const result = await toggleDishStockout(targetOutletId, input.itemId);
      return Response.json(result);
    }

    if (input.action === "inject-catering-booking") {
      const result = await injectCateringBooking({
        outletId: targetOutletId,
        customerId: viewer.role === "CUSTOMER" ? viewer.id : "demo-customer",
        autoConfirm: input.autoConfirm,
        guestCount: input.guestCount,
      });
      return Response.json(result);
    }

    if (input.action === "approve-pending-catering") {
      if (viewer.role !== "KITCHEN_STAFF" && viewer.role !== "CENTRAL_ADMIN") {
        throw new HttpError(403, "Staff privileges required.");
      }
      const result = await approvePendingCateringBookings(targetOutletId, viewer.name);
      return Response.json(result);
    }

    // 4. Admin Only Actions
    if (input.action === "inject-admin-analytics") {
      if (viewer.role !== "CENTRAL_ADMIN") {
        throw new HttpError(403, "Admin privileges required.");
      }
      const result = await injectAdminAnalyticsBurst(input.count);
      return Response.json(result);
    }

    if (input.action === "trigger-cancellation-spike") {
      if (viewer.role !== "CENTRAL_ADMIN" && viewer.role !== "KITCHEN_STAFF") {
        throw new HttpError(403, "Staff privileges required.");
      }
      const result = await triggerCancellationSpike(targetOutletId);
      return Response.json(result);
    }

    if (input.action === "toggle-outlet-active") {
      if (viewer.role !== "CENTRAL_ADMIN") {
        throw new HttpError(403, "Admin privileges required.");
      }
      const result = await toggleOutletActive(targetOutletId);
      return Response.json(result);
    }

    if (input.action === "launch-flash-coupon") {
      if (viewer.role !== "CENTRAL_ADMIN") {
        throw new HttpError(403, "Admin privileges required.");
      }
      const result = await launchFlashCouponCampaign();
      return Response.json(result);
    }

    throw new HttpError(400, "Unknown demo action.");
  } catch (error) {
    return apiError(error);
  }
}
