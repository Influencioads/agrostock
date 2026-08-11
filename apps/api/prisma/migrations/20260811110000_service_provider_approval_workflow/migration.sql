CREATE TYPE "ServiceProviderStatus" AS ENUM ('pending', 'approved', 'rejected', 'suspended');

ALTER TYPE "ServiceEnquiryStatus" ADD VALUE IF NOT EXISTS 'contacted' AFTER 'requested';

ALTER TABLE "ServiceProvider"
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "documents" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "status" "ServiceProviderStatus" NOT NULL DEFAULT 'pending';

-- Existing published providers were already administrator-controlled listings,
-- so preserve their visibility when introducing the approval workflow.
UPDATE "ServiceProvider" SET "status" = 'approved' WHERE "published" = true;
ALTER TABLE "ServiceProvider" ALTER COLUMN "published" SET DEFAULT false;

ALTER TABLE "ServiceEnquiry" ADD COLUMN "location" TEXT;

DROP INDEX IF EXISTS "ServiceProvider_published_createdAt_idx";
CREATE INDEX "ServiceProvider_status_published_createdAt_idx"
  ON "ServiceProvider"("status", "published", "createdAt");
