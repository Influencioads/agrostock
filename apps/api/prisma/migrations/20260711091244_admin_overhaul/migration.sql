-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('users_manage', 'kyc_review', 'role_requests', 'products_moderate', 'auctions_manage', 'bids_manage', 'orders_manage', 'disputes_manage', 'finance_manage', 'transport_manage', 'loaders_manage', 'markets_manage', 'offices_manage', 'ads_moderate', 'community_moderate', 'support_agent', 'cms_manage', 'branding_manage', 'audit_view', 'reports_view', 'staff_manage');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('pending', 'live', 'rejected', 'hidden');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'approved', 'rejected', 'paid');

-- AlterTable
ALTER TABLE "AdCampaign" ADD COLUMN     "clicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "impressions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'live';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "listApproved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminPermissions" "AdminPermission"[] DEFAULT ARRAY[]::"AdminPermission"[];

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutRequest_userId_idx" ON "PayoutRequest"("userId");

-- CreateIndex
CREATE INDEX "PayoutRequest_status_idx" ON "PayoutRequest"("status");

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: existing admin accounts become super-admins (all permissions) so
-- nothing they could do before is now blocked.
UPDATE "User"
SET "adminPermissions" = ENUM_RANGE(NULL::"AdminPermission")
WHERE "role" = 'admin';

-- Backfill: derive product moderation status from the legacy `approved` flag.
UPDATE "Product" SET "status" = 'pending' WHERE "approved" = false;
UPDATE "Product" SET "status" = 'live' WHERE "approved" = true;
