-- Vehicles become a public listing, not a number.
--
-- The transporter profile showed only `_count.vehicles` ("Vehicles: 5") because
-- that is all the API returned. Buyers now see the actual fleet, so a Vehicle
-- needs the fields a buyer decides on: body type, capacity, where it is, reefer
-- range, rates, GPS, and more than one photo.
--
-- Every column is additive and nullable (or defaulted), so existing rows stay
-- valid and nothing is rewritten except the two backfills at the bottom, which
-- only ever fill columns that were just created.

CREATE TYPE "VehicleType" AS ENUM (
  'reefer', 'open_truck', 'container', 'tanker', 'tipper', 'mini_truck', 'trailer'
);

ALTER TABLE "Vehicle"
  ADD COLUMN IF NOT EXISTS "vehicleType"      "VehicleType",
  ADD COLUMN IF NOT EXISTS "capacityTons"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "bodyLengthFt"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "availableFrom"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "photos"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "refrigerated"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tempMinC"         INTEGER,
  ADD COLUMN IF NOT EXISTS "tempMaxC"         INTEGER,
  ADD COLUMN IF NOT EXISTS "gpsTracking"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "driverCount"      INTEGER,
  ADD COLUMN IF NOT EXISTS "city"             TEXT,
  ADD COLUMN IF NOT EXISTS "country"          TEXT,
  ADD COLUMN IF NOT EXISTS "servicingCities"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "ratePerKmCents"   INTEGER,
  ADD COLUMN IF NOT EXISTS "ratePerTripCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "rateCurrency"     TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "loadingIncluded"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "permitExpiry"     TIMESTAMP(3);

-- ── backfill 1: the single cover photo becomes the first gallery entry ──────
-- `photoUrl` keeps mirroring `photos[0]`, exactly like Product.imageUrl/images,
-- so every existing single-photo render keeps working with no code change.
UPDATE "Vehicle"
SET "photos" = ARRAY["photoUrl"]
WHERE "photoUrl" IS NOT NULL AND "photoUrl" <> '' AND cardinality("photos") = 0;

-- ── backfill 2: numeric capacity from the legacy free-text column ───────────
-- `capacityMt` is free text the transporter typed ("28", "28 MT", "up to 30").
-- Promote only a string holding exactly ONE number, for the same reason the
-- stock migration does: an ambiguous string turned into a filterable number is
-- worse than no number, because buyers then filter the vehicle out (or in)
-- wrongly. Anything else stays NULL and still displays via `capacityMt`.
UPDATE "Vehicle"
SET "capacityTons" = NULLIF(regexp_replace("capacityMt", '[^0-9.]', '', 'g'), '')::double precision
WHERE "capacityTons" IS NULL
  AND "capacityMt" IS NOT NULL
  AND (SELECT count(*) FROM regexp_matches(replace("capacityMt", ',', ''), '[0-9]+(\.[0-9]+)?', 'g')) = 1
  AND NULLIF(regexp_replace("capacityMt", '[^0-9.]', '', 'g'), '') ~ '^[0-9]+(\.[0-9]+)?$';

-- ── backfill 3: body type, only where the free text names it unambiguously ──
-- Conservative on purpose: a wrong `vehicleType` puts a truck in the wrong
-- filter bucket, which is harder for a transporter to notice (and to explain to
-- a buyer) than a missing one. Anything unrecognised stays NULL and keeps
-- showing its free-text `type`.
--
-- Order matters: "Container Trailer" is matched as a container, because that is
-- the bucket a buyer looking for containerised freight actually wants.
UPDATE "Vehicle" SET "vehicleType" = CASE
  WHEN "type" ILIKE '%reefer%' OR "type" ILIKE '%refrigerat%' THEN 'reefer'::"VehicleType"
  WHEN "type" ILIKE '%tanker%'                                THEN 'tanker'::"VehicleType"
  WHEN "type" ILIKE '%tipper%'                                THEN 'tipper'::"VehicleType"
  WHEN "type" ILIKE '%container%'                             THEN 'container'::"VehicleType"
  WHEN "type" ILIKE '%trailer%'                               THEN 'trailer'::"VehicleType"
  WHEN "type" ILIKE '%tempo%' OR "type" ILIKE '%mini%'        THEN 'mini_truck'::"VehicleType"
  WHEN "type" ILIKE '%open%'                                  THEN 'open_truck'::"VehicleType"
  ELSE NULL
END
WHERE "vehicleType" IS NULL;

-- A reefer is refrigerated by definition; the flag is what the card badges on.
UPDATE "Vehicle" SET "refrigerated" = true WHERE "vehicleType" = 'reefer' AND "refrigerated" = false;

-- Public browse + the owner's own fleet list.
CREATE INDEX IF NOT EXISTS "Vehicle_ownerId_createdAt_idx" ON "Vehicle"("ownerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Vehicle_vehicleType_status_idx" ON "Vehicle"("vehicleType", "status");
CREATE INDEX IF NOT EXISTS "Vehicle_country_city_idx" ON "Vehicle"("country", "city");
