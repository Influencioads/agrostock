-- BL-09: mark an auction lot as settled once its close notifications have been
-- sent, so the scheduled auto-closer processes each lapsed lot exactly once.
ALTER TABLE "Product" ADD COLUMN "auctionSettledAt" TIMESTAMP(3);
