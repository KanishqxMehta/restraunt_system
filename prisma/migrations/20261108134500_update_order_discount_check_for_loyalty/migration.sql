-- Update Order_discount_check constraint to include pointsDiscountPaise
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_discount_check";

ALTER TABLE "Order" ADD CONSTRAINT "Order_discount_check" CHECK (
  "subtotalPaise" >= 0
  AND "discountPaise" >= 0
  AND "pointsDiscountPaise" >= 0
  AND ("discountPaise" + "pointsDiscountPaise") <= "subtotalPaise"
  AND "totalPaise" = ("subtotalPaise" - "discountPaise" - "pointsDiscountPaise")
);
