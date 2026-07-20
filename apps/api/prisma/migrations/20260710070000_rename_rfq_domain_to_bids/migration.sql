-- Rename the RFQ domain to the Bid domain, preserving all data.
--
-- Prisma cannot detect renames: `migrate dev` would emit DROP TABLE + CREATE TABLE
-- and destroy every row. This migration is hand-written so the tables, columns,
-- enum types, and every constraint/index are RENAMED in place instead.
--
--   Rfq      -> BuyerBid    (a buyer-posted requirement)
--   RfqQuote -> SellerBid   (a seller's response to a BuyerBid)
--   Bid      -> AuctionBid  (a sealed bid on a seller's auction listing)
--
-- The `Bid` -> `AuctionBid` rename resolves the collision the other two would
-- otherwise create. Enum *values* are untouched, so no row data is rewritten.

-- ── Enum type renames ────────────────────────────────────────────
-- Columns typed by these follow the rename automatically.
ALTER TYPE "RfqMode"        RENAME TO "BuyerBidMode";
ALTER TYPE "RfqStatus"      RENAME TO "BuyerBidStatus";
ALTER TYPE "RfqQuoteStatus" RENAME TO "SellerBidStatus";

-- ── Table renames ────────────────────────────────────────────────
ALTER TABLE "Rfq"      RENAME TO "BuyerBid";
ALTER TABLE "RfqQuote" RENAME TO "SellerBid";
ALTER TABLE "Bid"      RENAME TO "AuctionBid";

-- ── FK-scalar column renames ─────────────────────────────────────
ALTER TABLE "BuyerBid"  RENAME COLUMN "awardedQuoteId" TO "awardedSellerBidId";
ALTER TABLE "SellerBid" RENAME COLUMN "rfqId"          TO "buyerBidId";

-- ── BuyerBid (ex-Rfq): PK, unique indexes, plain indexes, FKs ────
-- Renaming a PK constraint renames its backing index too.
ALTER TABLE "BuyerBid" RENAME CONSTRAINT "Rfq_pkey" TO "BuyerBid_pkey";
ALTER INDEX "Rfq_reference_key"      RENAME TO "BuyerBid_reference_key";
ALTER INDEX "Rfq_awardedQuoteId_key" RENAME TO "BuyerBid_awardedSellerBidId_key";
ALTER INDEX "Rfq_orderId_key"        RENAME TO "BuyerBid_orderId_key";
ALTER INDEX "Rfq_status_mode_idx"    RENAME TO "BuyerBid_status_mode_idx";
ALTER INDEX "Rfq_buyerId_idx"        RENAME TO "BuyerBid_buyerId_idx";
ALTER TABLE "BuyerBid" RENAME CONSTRAINT "Rfq_categoryId_fkey" TO "BuyerBid_categoryId_fkey";
ALTER TABLE "BuyerBid" RENAME CONSTRAINT "Rfq_productId_fkey"  TO "BuyerBid_productId_fkey";
ALTER TABLE "BuyerBid" RENAME CONSTRAINT "Rfq_buyerId_fkey"    TO "BuyerBid_buyerId_fkey";
ALTER TABLE "BuyerBid" RENAME CONSTRAINT "Rfq_orderId_fkey"    TO "BuyerBid_orderId_fkey";

-- ── SellerBid (ex-RfqQuote): PK, indexes, FKs ────────────────────
-- The ON DELETE CASCADE clause rides along with the renamed FK constraint.
ALTER TABLE "SellerBid" RENAME CONSTRAINT "RfqQuote_pkey" TO "SellerBid_pkey";
ALTER INDEX "RfqQuote_rfqId_priceCents_idx" RENAME TO "SellerBid_buyerBidId_priceCents_idx";
ALTER INDEX "RfqQuote_sellerId_idx"         RENAME TO "SellerBid_sellerId_idx";
ALTER TABLE "SellerBid" RENAME CONSTRAINT "RfqQuote_rfqId_fkey"    TO "SellerBid_buyerBidId_fkey";
ALTER TABLE "SellerBid" RENAME CONSTRAINT "RfqQuote_sellerId_fkey" TO "SellerBid_sellerId_fkey";

-- ── AuctionBid (ex-Bid): PK, FKs ─────────────────────────────────
ALTER TABLE "AuctionBid" RENAME CONSTRAINT "Bid_pkey"           TO "AuctionBid_pkey";
ALTER TABLE "AuctionBid" RENAME CONSTRAINT "Bid_productId_fkey" TO "AuctionBid_productId_fkey";
ALTER TABLE "AuctionBid" RENAME CONSTRAINT "Bid_bidderId_fkey"  TO "AuctionBid_bidderId_fkey";
