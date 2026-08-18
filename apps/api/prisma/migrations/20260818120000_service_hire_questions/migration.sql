-- Per-service hire questions.
--
-- A service-provider enquiry now names the leaf service it is about and carries
-- the answers to that service's question set. Both columns are nullable and
-- every existing hire keeps its current shape.
ALTER TABLE "HireRequest" ADD COLUMN IF NOT EXISTS "serviceNodeId" TEXT;
ALTER TABLE "HireRequest" ADD COLUMN IF NOT EXISTS "details" JSONB;

ALTER TABLE "HireRequest"
  ADD CONSTRAINT "HireRequest_serviceNodeId_fkey"
  FOREIGN KEY ("serviceNodeId") REFERENCES "ServiceNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The provider side of the same questions: without these, a buyer answering
-- "you collect" or "I need frozen storage" has nothing on the profile to match.
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "pickupOffered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "deliveryOffered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "packagingSupplied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "sampleAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceProvider" ADD COLUMN IF NOT EXISTS "storageTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
