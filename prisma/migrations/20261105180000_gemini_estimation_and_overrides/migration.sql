-- AlterTable
ALTER TABLE "Order" ADD COLUMN "aiEstimatedMinutes" INTEGER;
ALTER TABLE "Order" ADD COLUMN "aiExplanation" TEXT;
ALTER TABLE "Order" ADD COLUMN "managerOverrideReason" TEXT;

-- Drop and re-create trigger to include promisedReadyAt and estimateSource updates
DROP TRIGGER IF EXISTS paid_order_change ON "Order";

CREATE TRIGGER paid_order_change
AFTER UPDATE OF status, "paymentStatus", "promisedReadyAt", "estimateSource" ON "Order"
FOR EACH ROW
WHEN (
  NEW."paymentStatus" = 'PAID'
  AND (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD."paymentStatus" IS DISTINCT FROM NEW."paymentStatus"
    OR OLD."promisedReadyAt" IS DISTINCT FROM NEW."promisedReadyAt"
    OR OLD."estimateSource" IS DISTINCT FROM NEW."estimateSource"
  )
)
EXECUTE FUNCTION notify_paid_order_change();
