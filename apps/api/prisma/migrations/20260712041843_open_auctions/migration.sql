-- AlterTable
ALTER TABLE "AuctionBid" ADD COLUMN     "auto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bidIncrementCents" INTEGER,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "reserveCents" INTEGER,
ADD COLUMN     "supplyCountries" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "AuctionAutoBid" (
    "id" TEXT NOT NULL,
    "maxCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,

    CONSTRAINT "AuctionAutoBid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuctionAutoBid_productId_bidderId_key" ON "AuctionAutoBid"("productId", "bidderId");

-- CreateIndex
CREATE INDEX "AuctionBid_productId_amountCents_idx" ON "AuctionBid"("productId", "amountCents");

-- AddForeignKey
ALTER TABLE "AuctionAutoBid" ADD CONSTRAINT "AuctionAutoBid_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionAutoBid" ADD CONSTRAINT "AuctionAutoBid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
