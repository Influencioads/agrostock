-- AlterTable: structured listing location + supply destinations.
-- Idempotent: an earlier dev session added these columns to some databases via
-- `db push`, so guard each ADD to keep this migration replayable everywhere.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT,
ADD COLUMN IF NOT EXISTS "supplyCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
