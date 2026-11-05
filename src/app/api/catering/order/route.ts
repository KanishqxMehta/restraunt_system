import { z } from "zod";
import { requireViewer } from "@/features/auth/session";
import { createCateringOrder } from "@/features/catering/service";
import { apiError, HttpError } from "@/server/http/errors";

const cateringOrderSchema = z.object({
  outletId: z.string().min(1),
  guestCount: z.number().int().min(15).max(500),
  vegPercentage: z.number().min(0).max(100),
  biryaniChoice: z.enum(["CHICKEN", "MUTTON", "MIXED"]),
  packageTier: z.enum(["ROYAL_DAAWAT", "NIZAMI_FEAST"]),
  eventDateTime: z.string().datetime(),
  deliveryAddress: z.string().min(10).max(300),
  specialInstructions: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer(["CUSTOMER"]);
    const json = await request.json();
    const parsed = cateringOrderSchema.safeParse(json);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid catering order payload.");
    }

    const order = await createCateringOrder(viewer, parsed.data);
    return Response.json({ order }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
