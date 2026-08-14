-- Per-service provider pricing.
--
-- PURELY ADDITIVE. One new table, five new nullable/defaulted columns on
-- ServiceProvider, and ten new values on an existing enum. No DROP, no column
-- removed, no data rewritten — safe on a populated database.
--
-- `ServiceProvider.categories`, `pricingBasis` and `priceFromCents` are NOT
-- touched and keep driving the existing directory card. ProviderService is the
-- finer-grained layer beside them, so every provider listed today carries on
-- working with no backfill and no dual-write.
--
-- `listApproved` defaults TRUE on purpose: a FALSE default would delist every
-- existing provider the moment this ran. New providers are approved by default
-- too, matching today's behaviour where `listed` alone decides.
--
-- The enum additions need PostgreSQL 12+ to run inside a migration transaction
-- (infra pins postgres:16-alpine). None of the new values is USED in this
-- migration, which is the other condition Postgres imposes.
--
-- To reverse:
--   DROP TABLE "ProviderService";
--   ALTER TABLE "ServiceProvider"
--     DROP COLUMN "countriesServed", DROP COLUMN "productsHandled",
--     DROP COLUMN "acceptsInternationalOrders", DROP COLUMN "listApproved",
--     DROP COLUMN "listRejectedReason";
--   -- enum values cannot be removed in Postgres; they are inert if unused.

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServicePricingBasis" ADD VALUE 'per_unit';
ALTER TYPE "ServicePricingBasis" ADD VALUE 'per_piece';
ALTER TYPE "ServicePricingBasis" ADD VALUE 'per_order';
ALTER TYPE "ServicePricingBasis" ADD VALUE 'per_shipment';
ALTER TYPE "ServicePricingBasis" ADD VALUE 'per_container';
ALTER TYPE "ServicePricingBasis" ADD VALUE 'per_pallet';
ALTER TYPE "ServicePricingBasis" ADD VALUE 'per_day';
ALTER TYPE "ServicePricingBasis" ADD VALUE 'per_sqft';
ALTER TYPE "ServicePricingBasis" ADD VALUE 'percentage';
ALTER TYPE "ServicePricingBasis" ADD VALUE 'on_request';

-- AlterTable
ALTER TABLE "ServiceProvider" ADD COLUMN     "acceptsInternationalOrders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "countriesServed" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "listApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "listRejectedReason" TEXT,
ADD COLUMN     "productsHandled" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ProviderService" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceNodeId" TEXT NOT NULL,
    "pricingBasis" "ServicePricingBasis" NOT NULL,
    "priceMinCents" INTEGER,
    "priceMaxCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "minOrderQty" INTEGER,
    "minOrderUnit" TEXT,
    "leadTimeDays" INTEGER,
    "capacityNote" TEXT,
    "notes" TEXT,
    "countryScope" "ServiceCountryScope",
    "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderService_serviceNodeId_isActive_idx" ON "ProviderService"("serviceNodeId", "isActive");

-- CreateIndex
CREATE INDEX "ProviderService_providerId_isActive_idx" ON "ProviderService"("providerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderService_providerId_serviceNodeId_key" ON "ProviderService"("providerId", "serviceNodeId");

-- CreateIndex
CREATE INDEX "ServiceProvider_listApproved_listed_idx" ON "ServiceProvider"("listApproved", "listed");

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_serviceNodeId_fkey" FOREIGN KEY ("serviceNodeId") REFERENCES "ServiceNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

