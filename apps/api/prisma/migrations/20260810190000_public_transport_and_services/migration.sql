ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'packer';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'processor';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'fulfillment_partner';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'finance_partner';

CREATE TYPE "ServiceCategory" AS ENUM ('accounting','customs_clearance','financial_services','fulfillment','packing','roasting','roasting_salting','chopping','blanching','pitting','sorting_grading');
CREATE TYPE "ServiceEnquiryStatus" AS ENUM ('requested','accepted','rejected','in_progress','completed');

CREATE TABLE "ServiceProvider" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "companyName" TEXT NOT NULL,
  "description" TEXT, "categories" "ServiceCategory"[] NOT NULL,
  "citiesServed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "capacityPerDay" DOUBLE PRECISION,
  "capacityUnit" TEXT, "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "minOrderQty" DOUBLE PRECISION, "turnaroundDays" INTEGER, "pricingBasis" TEXT,
  "minPriceCents" INTEGER, "maxPriceCents" INTEGER, "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rating" DOUBLE PRECISION DEFAULT 0, "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceProvider_slug_key" ON "ServiceProvider"("slug");
CREATE UNIQUE INDEX "ServiceProvider_ownerId_key" ON "ServiceProvider"("ownerId");
CREATE INDEX "ServiceProvider_published_createdAt_idx" ON "ServiceProvider"("published", "createdAt");
ALTER TABLE "ServiceProvider" ADD CONSTRAINT "ServiceProvider_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ServiceEnquiry" (
  "id" TEXT NOT NULL, "reference" TEXT NOT NULL, "serviceType" "ServiceCategory" NOT NULL,
  "message" TEXT NOT NULL, "quantity" DOUBLE PRECISION, "neededDate" TIMESTAMP(3),
  "status" "ServiceEnquiryStatus" NOT NULL DEFAULT 'requested', "documents" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "providerId" TEXT NOT NULL, "customerId" TEXT NOT NULL,
  CONSTRAINT "ServiceEnquiry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceEnquiry_reference_key" ON "ServiceEnquiry"("reference");
CREATE INDEX "ServiceEnquiry_providerId_status_idx" ON "ServiceEnquiry"("providerId", "status");
CREATE INDEX "ServiceEnquiry_customerId_createdAt_idx" ON "ServiceEnquiry"("customerId", "createdAt");
ALTER TABLE "ServiceEnquiry" ADD CONSTRAINT "ServiceEnquiry_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceEnquiry" ADD CONSTRAINT "ServiceEnquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
