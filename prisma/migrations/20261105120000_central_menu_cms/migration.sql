-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "availableFromMinute" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN "availableToMinute" INTEGER;

-- Check constraint for minute ranges
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_availableFromMinute_check"
  CHECK ("availableFromMinute" IS NULL OR ("availableFromMinute" >= 0 AND "availableFromMinute" <= 1440));
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_availableToMinute_check"
  CHECK ("availableToMinute" IS NULL OR ("availableToMinute" >= 0 AND "availableToMinute" <= 1440));
