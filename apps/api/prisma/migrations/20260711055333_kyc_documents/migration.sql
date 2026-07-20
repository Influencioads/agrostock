-- CreateEnum
CREATE TYPE "KycDocType" AS ENUM ('trade_license', 'government_id', 'bank_proof', 'tax_certificate', 'other');

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "type" "KycDocType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordId" TEXT NOT NULL,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycDocument_recordId_idx" ON "KycDocument"("recordId");

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "KycRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
