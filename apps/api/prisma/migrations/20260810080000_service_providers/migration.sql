-- Service providers: five self-registering roles and their listing profile.
--
-- Accountants, customs agents, finance companies, packers/fulfilment and the
-- processing trades (roasting, chopping, blanching, pitting, sorting) become
-- first-class roles that receive customer enquiries through the SAME HireRequest
-- flow transporters and loader companies already use — accept, decline, escrow,
-- notifications and invoicing all come along unchanged.
--
-- Entirely additive. New enum values, one new table, one new nullable relation.
-- No existing row is read or written.

-- ── 1. the five roles ──────────────────────────────────────────────────────
-- Added BEFORE 'admin' in the Prisma enum for readability, but Postgres enum
-- order only affects sorting, never storage or comparison, so appending here is
-- equivalent and avoids rewriting the type. Each ADD VALUE is idempotent.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'packer';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'processor';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'fulfillment_partner';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'finance_partner';

-- ── 2. enquiries can target a service provider ─────────────────────────────
-- One value rather than five: the specific role is already on the target user,
-- and splitting it would fork every accept/decline/escrow branch for no gain.
ALTER TYPE "HireTargetType" ADD VALUE IF NOT EXISTS 'service_provider';

-- ── 3. what a provider offers ──────────────────────────────────────────────
CREATE TYPE "ServiceCategory" AS ENUM (
  'accounting', 'customs_clearance', 'financial_services',
  'fulfillment', 'packing',
  'roasting', 'roasting_salting', 'chopping', 'blanching', 'pitting', 'sorting_grading'
);

CREATE TYPE "ServicePricingBasis" AS ENUM (
  'per_kg', 'per_ton', 'per_lot', 'per_hour', 'per_month'
);

CREATE TABLE IF NOT EXISTS "ServiceProvider" (
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
  -- Hidden from the directory until the provider opts in, so a half-filled
  -- profile is never the first thing a buyer sees.
  "listed"         BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);

-- One profile per user; deleting the account takes the listing with it.
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceProvider_userId_key" ON "ServiceProvider"("userId");
CREATE INDEX IF NOT EXISTS "ServiceProvider_listed_idx" ON "ServiceProvider"("listed");
CREATE INDEX IF NOT EXISTS "ServiceProvider_country_idx" ON "ServiceProvider"("country");

ALTER TABLE "ServiceProvider"
  ADD CONSTRAINT "ServiceProvider_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
