-- Add nullable/default columns expected by the seller dashboard overhaul.
-- These are defensive because the VPS database had drifted behind the schema.

ALTER TABLE "BuyerBid"
ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "sourceHashes" JSONB;

ALTER TABLE "CommunityMessage"
ADD COLUMN IF NOT EXISTS "sourceLang" TEXT;

ALTER TABLE "CommunityPost"
ADD COLUMN IF NOT EXISTS "sourceHashes" JSONB;

ALTER TABLE "CommunityTradeRequirement"
ADD COLUMN IF NOT EXISTS "sourceHashes" JSONB;

ALTER TABLE "Notification"
ADD COLUMN IF NOT EXISTS "params" JSONB;

ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "sourceHashes" JSONB;

ALTER TABLE "Profile"
ADD COLUMN IF NOT EXISTS "minDistanceKm" INTEGER,
ADD COLUMN IF NOT EXISTS "minLoaders" INTEGER,
ADD COLUMN IF NOT EXISTS "minWorkHours" INTEGER,
ADD COLUMN IF NOT EXISTS "operatingCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "operatingCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "originCity" TEXT,
ADD COLUMN IF NOT EXISTS "originCountry" TEXT,
ADD COLUMN IF NOT EXISTS "supplyingCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "supplyingCountries" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Review"
ADD COLUMN IF NOT EXISTS "sourceHashes" JSONB;

ALTER TABLE "Worker"
ADD COLUMN IF NOT EXISTS "minWorkHours" INTEGER,
ADD COLUMN IF NOT EXISTS "operatingCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "operatingCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "originCity" TEXT,
ADD COLUMN IF NOT EXISTS "originCountry" TEXT;
