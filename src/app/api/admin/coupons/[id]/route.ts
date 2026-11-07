import { z } from "zod";
import { requireViewer } from "@/features/auth/session";
import { updateCoupon, deleteCoupon } from "@/features/coupons/service";
import { apiError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

const updateCouponSchema = z.object({
  code: z.string().min(3).max(30).optional(),
  discountType: z.enum(["PERCENT", "FLAT"]).optional(),
  value: z.number().positive().optional(),
  minOrderRupees: z.number().min(0).optional(),
  maxDiscountRupees: z.number().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  perCustomerLimit: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    const input = await readJson(request, updateCouponSchema);
    const coupon = await updateCoupon(id, input);
    return Response.json({ coupon });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    await requireViewer(["CENTRAL_ADMIN"]);
    const { id } = await context.params;
    const outcome = await deleteCoupon(id);
    return Response.json(outcome);
  } catch (error) {
    return apiError(error);
  }
}
