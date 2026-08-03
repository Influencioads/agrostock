-- Buyer requirements now mirror product listing metadata so sellers can see the
-- same trade terms and specs on buyer-side bids. These are all additive and
-- safe for existing rows.
ALTER TABLE "BuyerBid"
ADD COLUMN IF NOT EXISTS "vatExtra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "moq" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "origin" TEXT,
ADD COLUMN IF NOT EXISTS "delivery" TEXT,
ADD COLUMN IF NOT EXISTS "supplyCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "safeDeal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "negotiable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "attributes" JSONB,
ADD COLUMN IF NOT EXISTS "marketId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BuyerBid_marketId_fkey') THEN
    ALTER TABLE "BuyerBid" ADD CONSTRAINT "BuyerBid_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
