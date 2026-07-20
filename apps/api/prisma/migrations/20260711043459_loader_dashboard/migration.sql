-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "recordedById" TEXT;

-- AlterTable
ALTER TABLE "LoaderJob" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "neededDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "dailyWageCents" INTEGER,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "skill" TEXT;

-- CreateTable
CREATE TABLE "LoaderRate" (
    "id" TEXT NOT NULL,
    "loadercoId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "rateCents" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'MT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoaderRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoaderReview" (
    "id" TEXT NOT NULL,
    "loadercoId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "jobId" TEXT,
    "teamId" TEXT,
    "stars" INTEGER NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoaderReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoaderRate_loadercoId_idx" ON "LoaderRate"("loadercoId");

-- CreateIndex
CREATE INDEX "LoaderReview_loadercoId_idx" ON "LoaderReview"("loadercoId");

-- CreateIndex
CREATE INDEX "Attendance_workerId_idx" ON "Attendance"("workerId");

-- CreateIndex
CREATE INDEX "Attendance_jobId_idx" ON "Attendance"("jobId");

-- AddForeignKey
ALTER TABLE "LoaderJob" ADD CONSTRAINT "LoaderJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoaderRate" ADD CONSTRAINT "LoaderRate_loadercoId_fkey" FOREIGN KEY ("loadercoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoaderReview" ADD CONSTRAINT "LoaderReview_loadercoId_fkey" FOREIGN KEY ("loadercoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoaderReview" ADD CONSTRAINT "LoaderReview_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoaderReview" ADD CONSTRAINT "LoaderReview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "LoaderJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoaderReview" ADD CONSTRAINT "LoaderReview_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
