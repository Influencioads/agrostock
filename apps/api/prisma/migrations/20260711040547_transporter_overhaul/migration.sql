-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "licenseExpiry" TIMESTAMP(3),
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "ratePerHourCents" INTEGER;

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "baseRateCents" INTEGER,
ADD COLUMN     "fromCountry" TEXT,
ADD COLUMN     "toCountry" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "insuranceExpiry" TIMESTAMP(3),
ADD COLUMN     "makeModel" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "year" INTEGER;
