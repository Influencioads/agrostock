-- F11: optional client idempotency key so a replayed order placement collides
-- instead of creating a duplicate order.
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
