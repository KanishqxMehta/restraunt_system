-- AlterTable
ALTER TABLE "Order" ADD COLUMN "isCatering" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "guestCount" INTEGER;
ALTER TABLE "Order" ADD COLUMN "eventDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "specialInstructions" TEXT;

-- CreateIndex
CREATE INDEX "Order_isCatering_status_idx" ON "Order"("isCatering", "status");
