-- CreateEnum
CREATE TYPE "HireTargetType" AS ENUM ('transporter', 'loaderco', 'worker');

-- CreateEnum
CREATE TYPE "HireStatus" AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_loadercoId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "marketId" TEXT,
ADD COLUMN     "priceCents" INTEGER;

-- AlterTable
ALTER TABLE "Worker" ALTER COLUMN "loadercoId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "flag" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "availableFrom" TEXT,
    "availableTo" TEXT,
    "timezone" TEXT,
    "languages" TEXT,
    "avatarEmoji" TEXT,
    "marketId" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HireRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "targetType" "HireTargetType" NOT NULL,
    "status" "HireStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "fromCity" TEXT,
    "toCity" TEXT,
    "cargo" TEXT,
    "location" TEXT,
    "workersNeeded" INTEGER,
    "neededDate" TIMESTAMP(3),
    "budgetCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "requesterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "workerId" TEXT,
    "transportRequestId" TEXT,
    "loaderJobId" TEXT,

    CONSTRAINT "HireRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_slug_key" ON "Market"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HireRequest_reference_key" ON "HireRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "HireRequest_transportRequestId_key" ON "HireRequest"("transportRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "HireRequest_loaderJobId_key" ON "HireRequest"("loaderJobId");

-- CreateIndex
CREATE INDEX "HireRequest_targetUserId_status_idx" ON "HireRequest"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "HireRequest_requesterId_idx" ON "HireRequest"("requesterId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_loadercoId_fkey" FOREIGN KEY ("loadercoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
