-- The consignee and the finer-grained destination captured at checkout.
-- Nullable and additive so existing orders remain valid.
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "deliveryMarket" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryLocation" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryName" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryPhone" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryEmail" TEXT;
