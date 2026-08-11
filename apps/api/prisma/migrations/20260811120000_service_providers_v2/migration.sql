-- Replace the superseded public-services schema with the role-based provider
-- profile used by the current application. The legacy tables are known to be
-- empty in production; keep a database-side guard so this migration refuses to
-- discard data in any other environment where that assumption is false.

DO $$
DECLARE
  provider_rows BIGINT := 0;
  enquiry_rows BIGINT := 0;
BEGIN
  IF to_regclass('public."ServiceProvider"') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM "ServiceProvider"' INTO provider_rows;
  END IF;
  IF to_regclass('public."ServiceEnquiry"') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM "ServiceEnquiry"' INTO enquiry_rows;
  END IF;
  IF provider_rows > 0 OR enquiry_rows > 0 THEN
    RAISE EXCEPTION 'Refusing service schema replacement: ServiceProvider rows=%, ServiceEnquiry rows=%', provider_rows, enquiry_rows;
  END IF;
END $$;

-- These values may have been added by the failed first attempt, so every enum
-- extension is idempotent.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'packer';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'processor';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'fulfillment_partner';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'finance_partner';
ALTER TYPE "HireTargetType" ADD VALUE IF NOT EXISTS 'service_provider';

-- Remove only the verified-empty legacy service objects. Service enquiries now
-- use the existing HireRequest workflow rather than a parallel enquiry table.
DROP TABLE IF EXISTS "ServiceEnquiry" CASCADE;
DROP TABLE IF EXISTS "ServiceProvider" CASCADE;
DROP TYPE IF EXISTS "ServiceEnquiryStatus";
DROP TYPE IF EXISTS "ServiceProviderStatus";
DROP TYPE IF EXISTS "ServiceCategory";
DROP TYPE IF EXISTS "ServicePricingBasis";

CREATE TYPE "ServiceCategory" AS ENUM (
  'accounting', 'customs_clearance', 'financial_services',
  'fulfillment', 'packing',
  'roasting', 'roasting_salting', 'chopping', 'blanching', 'pitting', 'sorting_grading'
);

CREATE TYPE "ServicePricingBasis" AS ENUM (
  'per_kg', 'per_ton', 'per_lot', 'per_hour', 'per_month'
);

CREATE TABLE "ServiceProvider" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "companyName"    TEXT,
  "categories"     "ServiceCategory"[] NOT NULL DEFAULT ARRAY[]::"ServiceCategory"[],
  "citiesServed"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "country"        TEXT,
  "capacityPerDay" INTEGER,
  "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "minOrderQty"    INTEGER,
  "turnaroundDays" INTEGER,
  "pricingBasis"   "ServicePricingBasis",
  "priceFromCents" INTEGER,
  "priceCurrency"  TEXT NOT NULL DEFAULT 'USD',
  "photos"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "blurb"          TEXT,
  "listed"         BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceProvider_userId_key" ON "ServiceProvider"("userId");
CREATE INDEX "ServiceProvider_listed_idx" ON "ServiceProvider"("listed");
CREATE INDEX "ServiceProvider_country_idx" ON "ServiceProvider"("country");

ALTER TABLE "ServiceProvider"
  ADD CONSTRAINT "ServiceProvider_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
