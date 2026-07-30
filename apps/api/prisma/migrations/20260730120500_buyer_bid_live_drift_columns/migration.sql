-- Defensive production drift repair for live DBs restored from older dumps.
-- Current code reads these columns on BuyerBid/Product.  The migration is
-- idempotent so it is safe on databases that already received some columns via
-- manual SQL or `prisma db push`.

ALTER TABLE "BuyerBid"
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS "destinationCountry" TEXT,
ADD COLUMN IF NOT EXISTS "auctionEndsAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "procureBy" TEXT,
ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "categoryId" TEXT,
ADD COLUMN IF NOT EXISTS "subcategoryId" TEXT,
ADD COLUMN IF NOT EXISTS "productId" TEXT,
ADD COLUMN IF NOT EXISTS "sourceHashes" JSONB;

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "startBidSrcCents" INTEGER,
ADD COLUMN IF NOT EXISTS "bidIncrementCents" INTEGER,
ADD COLUMN IF NOT EXISTS "reserveCents" INTEGER,
ADD COLUMN IF NOT EXISTS "auctionSettledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT,
ADD COLUMN IF NOT EXISTS "supplyCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "priceCurrency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS "attributes" JSONB,
ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "sourceHashes" JSONB;

CREATE INDEX IF NOT EXISTS "BuyerBid_status_mode_idx" ON "BuyerBid"("status", "mode");
CREATE INDEX IF NOT EXISTS "BuyerBid_buyerId_idx" ON "BuyerBid"("buyerId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BuyerBid_subcategoryId_fkey') THEN
    ALTER TABLE "BuyerBid" ADD CONSTRAINT "BuyerBid_subcategoryId_fkey"
    FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

