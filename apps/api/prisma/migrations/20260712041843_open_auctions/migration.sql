-- AlterTable
ALTER TABLE "AuctionBid" ADD COLUMN IF NOT EXISTS "auto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
-- V03 fix: city/country/supplyCountries are also added (guarded) by the earlier
-- 20260712000000_product_location_supply migration, which runs first. Guard the
-- overlapping columns here too so the full history replays cleanly on a fresh
-- database (previously this failed with `column "city" already exists`). The
-- genuinely-new auction columns keep IF NOT EXISTS for the same reason.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "bidIncrementCents" INTEGER,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT,
ADD COLUMN IF NOT EXISTS "reserveCents" INTEGER,
ADD COLUMN IF NOT EXISTS "supplyCountries" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuctionAutoBid" (
    "id" TEXT NOT NULL,
    "maxCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,

    CONSTRAINT "AuctionAutoBid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AuctionAutoBid_productId_bidderId_key" ON "AuctionAutoBid"("productId", "bidderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuctionBid_productId_amountCents_idx" ON "AuctionBid"("productId", "amountCents");

-- AddForeignKey
ALTER TABLE "AuctionAutoBid" ADD CONSTRAINT "AuctionAutoBid_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionAutoBid" ADD CONSTRAINT "AuctionAutoBid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
