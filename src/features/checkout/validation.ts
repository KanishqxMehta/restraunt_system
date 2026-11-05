import { z } from "zod";
import { locationSchema } from "@/features/outlets/serviceability";
export const cartLineSchema = z
  .object({
    portionId: z.string().min(1).max(128),
    addonIds: z
      .array(z.string().min(1).max(128))
      .max(10)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Remove duplicate add-ons.",
      ),
    quantity: z.number().int().min(1).max(20),
  })
  .strict();
export type CartLine = z.infer<typeof cartLineSchema>;
export function lineKey(
  line: Pick<CartLine, "portionId" | "addonIds">,
): string {
  return `${line.portionId}:${[...line.addonIds].sort().join(",")}`;
}
export const quoteInputSchema = z
  .object({
    outletId: z.string().min(1).max(128),
    location: locationSchema,
    lines: z
      .array(cartLineSchema)
      .min(1, "Your cart is empty.")
      .max(30)
      .refine(
        (lines) => lines.reduce((sum, line) => sum + line.quantity, 0) <= 100,
        "Limit your order to 100 portions.",
      )
      .refine(
        (lines) => new Set(lines.map(lineKey)).size === lines.length,
        "Combine duplicate cart lines.",
      ),
    couponCode: z
      .string()
      .trim()
      .max(32)
      .transform((value) => value.toUpperCase())
      .optional(),
  })
  .strict();
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export const deliveryAddressSchema = z
  .string()
  .trim()
  .min(10, "Enter a complete delivery address.")
  .max(240);
export const createOrderSchema = z
  .object({
    quoteId: z.string().min(1).max(128),
    idempotencyKey: z.uuid(),
    deliveryAddress: deliveryAddressSchema,
    paymentMethod: z.enum(["UPI", "CARD"]),
  })
  .strict();
export const mockPaymentSchema = z
  .object({
    idempotencyKey: z.uuid(),
    method: z.enum(["UPI", "CARD"]),
    outcome: z.enum(["SUCCESS", "FAILED", "CANCELLED"]),
  })
  .strict();
