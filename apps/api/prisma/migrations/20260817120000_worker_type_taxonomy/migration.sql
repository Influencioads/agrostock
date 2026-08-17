-- CreateEnum
CREATE TYPE "WorkerTypeGroup" AS ENUM ('loading_handling', 'packing', 'sorting_grading', 'processing_line', 'warehouse', 'transport', 'field_to_gate');

-- CreateEnum
CREATE TYPE "LabourRateBasis" AS ENUM ('per_hour', 'per_day', 'on_request');

-- NOTE: `prisma migrate diff` also proposed dropping AuctionBidReplacedArchive
-- and SellerBidReplacedArchive here. Both are pre-existing drift (present in the
-- migration history, absent from schema.prisma) and have nothing to do with the
-- labour taxonomy, so they are deliberately NOT dropped in this migration.
-- Retiring them is its own decision and belongs in its own migration.

-- CreateTable
CREATE TABLE "WorkerType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "group" "WorkerTypeGroup" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerTypeTranslation" (
    "id" TEXT NOT NULL,
    "workerTypeId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WorkerTypeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerOffering" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workerTypeId" TEXT NOT NULL,
    "rateBasis" "LabourRateBasis" NOT NULL DEFAULT 'per_hour',
    "rateMinCents" INTEGER,
    "rateMaxCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "headcount" INTEGER,
    "minHours" INTEGER,
    "notes" TEXT,
    "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerOffering_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerType_slug_key" ON "WorkerType"("slug");

-- CreateIndex
CREATE INDEX "WorkerType_group_sortOrder_idx" ON "WorkerType"("group", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkerTypeTranslation_locale_idx" ON "WorkerTypeTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerTypeTranslation_workerTypeId_locale_key" ON "WorkerTypeTranslation"("workerTypeId", "locale");

-- CreateIndex
CREATE INDEX "WorkerOffering_workerTypeId_isActive_idx" ON "WorkerOffering"("workerTypeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerOffering_userId_workerTypeId_key" ON "WorkerOffering"("userId", "workerTypeId");

-- AddForeignKey
ALTER TABLE "WorkerTypeTranslation" ADD CONSTRAINT "WorkerTypeTranslation_workerTypeId_fkey" FOREIGN KEY ("workerTypeId") REFERENCES "WorkerType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerOffering" ADD CONSTRAINT "WorkerOffering_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerOffering" ADD CONSTRAINT "WorkerOffering_workerTypeId_fkey" FOREIGN KEY ("workerTypeId") REFERENCES "WorkerType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

