import { z } from "zod";
import { requireViewer } from "@/features/auth/session";
import { listCoupons, createCoupon } from "@/features/coupons/service";
import { apiError } from "@/server/http/errors";
import { readJson, requireSameOrigin } from "@/server/http/request";

const createCouponSchema = z.object({
  code: z.string().min(3).max(30),
  discountType: z.enum(["PERCENT", "FLAT"]),
  value: z.number().positive(),
  minOrderRupees: z.number().min(0).default(0),
  maxDiscountRupees: z.number().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  perCustomerLimit: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string(),
  expiresAt: z.string(),
});

export async function GET() {
  try {
    await requireViewer(["CENTRAL_ADMIN"]);
    const result = await listCoupons();
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireViewer(["CENTRAL_ADMIN"]);
    const input = await readJson(request, createCouponSchema);
    const coupon = await createCoupon({
      ...input,
      maxDiscountRupees: input.maxDiscountRupees ?? null,
      usageLimit: input.usageLimit ?? null,
      perCustomerLimit: input.perCustomerLimit ?? null,
    });
    return Response.json({ coupon }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
