-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FLAT');

-- CreateEnum
CREATE TYPE "MockPaymentOutcome" AS ENUM ('SUCCESS', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "MenuAddon" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryLatitude" DOUBLE PRECISION,
ADD COLUMN     "deliveryLongitude" DOUBLE PRECISION,
ADD COLUMN     "discountPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "paymentExpiresAt" TIMESTAMP(3),
ADD COLUMN     "quoteId" TEXT,
ADD COLUMN     "subtotalPaise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "addons" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN     "closesAtMinute" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN     "opensAtMinute" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CheckoutQuote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minOrderPaise" INTEGER NOT NULL DEFAULT 0,
    "maxDiscountPaise" INTEGER,
    "usageLimit" INTEGER,
    "perCustomerLimit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "outcome" "MockPaymentOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckoutQuote_customerId_expiresAt_idx" ON "CheckoutQuote"("customerId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_customerId_idx" ON "CouponRedemption"("couponId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_orderId_idempotencyKey_key" ON "PaymentAttempt"("orderId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_quoteId_key" ON "Order"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_customerId_idempotencyKey_key" ON "Order"("customerId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "CheckoutQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutQuote" ADD CONSTRAINT "CheckoutQuote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Existing orders predate explicit subtotal/discount columns.
UPDATE "Order" SET "subtotalPaise" = "totalPaise" WHERE "quoteId" IS NULL AND "subtotalPaise" = 0;
UPDATE "MenuAddon" SET "allergens" = ARRAY['Milk']::TEXT[] WHERE "id" = 'addon-chicken-raita' AND cardinality("allergens") = 0;
ALTER TABLE "Order" ADD CONSTRAINT "Order_discount_check" CHECK ("subtotalPaise" >= 0 AND "discountPaise" BETWEEN 0 AND "subtotalPaise" AND "totalPaise" = "subtotalPaise" - "discountPaise");
ALTER TABLE "Order" ADD CONSTRAINT "Order_delivery_location_check" CHECK (
  ("deliveryLatitude" IS NULL AND "deliveryLongitude" IS NULL) OR
  ("deliveryLatitude" IS NOT NULL AND "deliveryLongitude" IS NOT NULL AND "deliveryLatitude" BETWEEN -90 AND 90 AND "deliveryLongitude" BETWEEN -180 AND 180)
);
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_configuration_check" CHECK (
  "value" >= 0 AND ("discountType" <> 'PERCENT' OR "value" <= 100)
  AND "minOrderPaise" >= 0 AND ("maxDiscountPaise" IS NULL OR "maxDiscountPaise" >= 0)
  AND ("usageLimit" IS NULL OR "usageLimit" > 0) AND ("perCustomerLimit" IS NULL OR "perCustomerLimit" > 0)
  AND "expiresAt" > "startsAt"
);
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_hours_check" CHECK ("opensAtMinute" BETWEEN 0 AND 1439 AND "closesAtMinute" BETWEEN 0 AND 1440);
