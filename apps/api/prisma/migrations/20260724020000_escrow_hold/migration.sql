-- F06: ledger-backed per-order escrow holding account.
CREATE TYPE "EscrowHoldStatus" AS ENUM ('held', 'released', 'refunded', 'split');

CREATE TABLE "EscrowHold" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "EscrowHoldStatus" NOT NULL DEFAULT 'held',
    "releasedCents" INTEGER NOT NULL DEFAULT 0,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "heldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowHold_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EscrowHold_orderId_key" ON "EscrowHold"("orderId");
CREATE INDEX "EscrowHold_status_idx" ON "EscrowHold"("status");
CREATE INDEX "EscrowHold_buyerId_idx" ON "EscrowHold"("buyerId");
