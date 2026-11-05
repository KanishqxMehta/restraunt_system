ALTER TABLE "OrderEvent" ADD COLUMN "actorId" TEXT;
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PostgreSQL sends this signal only if the order transaction commits.
CREATE FUNCTION notify_paid_order_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify(
    'restaurant_order_change',
    json_build_object('orderId', NEW.id, 'outletId', NEW."outletId")::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER paid_order_change
AFTER UPDATE OF status, "paymentStatus" ON "Order"
FOR EACH ROW
WHEN (
  NEW."paymentStatus" = 'PAID'
  AND (OLD.status IS DISTINCT FROM NEW.status OR OLD."paymentStatus" IS DISTINCT FROM NEW."paymentStatus")
)
EXECUTE FUNCTION notify_paid_order_change();
