-- AlterEnum
ALTER TYPE "TxType" ADD VALUE 'withdraw';

-- AlterTable
ALTER TABLE "HireRequest" ADD COLUMN     "escrowState" TEXT;
