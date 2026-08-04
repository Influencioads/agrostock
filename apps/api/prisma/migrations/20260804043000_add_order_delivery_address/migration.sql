-- Store the full delivery line for order dispatch. Nullable and additive so
-- existing orders remain valid.
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryPostcode" TEXT;
