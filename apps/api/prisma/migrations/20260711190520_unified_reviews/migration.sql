-- CreateEnum
CREATE TYPE "ReviewKind" AS ENUM ('order', 'trip', 'loaderjob', 'assignment', 'hire');

-- CreateEnum
CREATE TYPE "ReviewRole" AS ENUM ('seller', 'buyer', 'product', 'transporter', 'loaderco', 'worker', 'client');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('visible', 'hidden', 'removed');

-- AlterEnum
ALTER TYPE "AdminPermission" ADD VALUE 'reviews_moderate';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ratingAvg" DOUBLE PRECISION,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ratingAvg" DOUBLE PRECISION,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "kind" "ReviewKind" NOT NULL,
    "revieweeRole" "ReviewRole" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "text" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'visible',
    "adminNote" TEXT,
    "editedByAdminId" TEXT,
    "editedByAuthorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "raterId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "orderId" TEXT,
    "tripId" TEXT,
    "loaderJobId" TEXT,
    "jobAssignmentId" TEXT,
    "hireRequestId" TEXT,
    "productId" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_revieweeId_status_idx" ON "Review"("revieweeId", "status");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_kind_status_idx" ON "Review"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_kind_subjectId_raterId_revieweeRole_key" ON "Review"("kind", "subjectId", "raterId", "revieweeRole");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_editedByAdminId_fkey" FOREIGN KEY ("editedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_loaderJobId_fkey" FOREIGN KEY ("loaderJobId") REFERENCES "LoaderJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_jobAssignmentId_fkey" FOREIGN KEY ("jobAssignmentId") REFERENCES "JobAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_hireRequestId_fkey" FOREIGN KEY ("hireRequestId") REFERENCES "HireRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: fold existing loader-company reviews into the unified Review table.
-- (dev is reseeded after migrate, so this only matters for existing/prod data.)
INSERT INTO "Review" (
    "id", "kind", "revieweeRole", "subjectId", "stars", "text", "status",
    "createdAt", "updatedAt", "raterId", "revieweeId", "loaderJobId"
)
SELECT
    'rv_' || lr."id",
    'loaderjob'::"ReviewKind",
    'loaderco'::"ReviewRole",
    COALESCE(lr."jobId", lr."id"),
    lr."stars",
    lr."text",
    'visible'::"ReviewStatus",
    lr."createdAt",
    lr."createdAt",
    lr."raterId",
    lr."loadercoId",
    lr."jobId"
FROM "LoaderReview" lr
ON CONFLICT DO NOTHING;

-- Backfill denormalized rating aggregates on User from the folded reviews.
UPDATE "User" u
SET "ratingAvg" = agg.avg, "ratingCount" = agg.cnt
FROM (
    SELECT "revieweeId", AVG("stars")::double precision AS avg, COUNT(*)::int AS cnt
    FROM "Review" WHERE "status" = 'visible' GROUP BY "revieweeId"
) agg
WHERE u."id" = agg."revieweeId";
