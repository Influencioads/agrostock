-- BL-15: optional client idempotency key so a replayed hire create collides
-- (P2002) instead of creating a duplicate hire + a second escrow hold.
ALTER TABLE "HireRequest" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "HireRequest_idempotencyKey_key" ON "HireRequest"("idempotencyKey");
