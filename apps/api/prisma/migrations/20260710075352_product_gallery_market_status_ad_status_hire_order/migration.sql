-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "AdCampaign" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "AdStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "HireRequest" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "status" "MarketStatus" NOT NULL DEFAULT 'approved';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "AdCampaign_status_active_idx" ON "AdCampaign"("status", "active");

-- CreateIndex
CREATE INDEX "HireRequest_orderId_idx" ON "HireRequest"("orderId");

-- CreateIndex
CREATE INDEX "Market_status_idx" ON "Market"("status");

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Backfills ────────────────────────────────────────────────────

-- Seed the gallery from the existing single cover image so `images[0]` and
-- `imageUrl` agree from day one and every current render keeps working.
UPDATE "Product" SET "images" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL AND "images" = ARRAY[]::TEXT[];

-- `AdStatus` defaults to 'pending' for new campaigns, but campaigns that were
-- already running predate moderation — approve them so none goes dark.
UPDATE "AdCampaign" SET "status" = 'approved', "reviewedAt" = NOW();

-- Existing markets predate the approval gate; the column default ('approved')
-- already covers them, so no market backfill is needed.
