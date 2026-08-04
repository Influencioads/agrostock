-- One account, one standing offer on both sides of the market. Placing again
-- now replaces your offer instead of appending a row, so the historic duplicates
-- have to be collapsed before the unique indexes can exist. The replaced rows
-- are archived first so old bid history remains recoverable.

-- Forward auction: keep each bidder's HIGHEST offer (that is the one that was
-- ranking them), newest first on a tie.
CREATE TABLE IF NOT EXISTS "AuctionBidReplacedArchive" (
  LIKE "AuctionBid" INCLUDING DEFAULTS INCLUDING GENERATED
);

ALTER TABLE "AuctionBidReplacedArchive"
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "archiveReason" TEXT NOT NULL DEFAULT 'one_offer_per_bidder';

CREATE UNIQUE INDEX IF NOT EXISTS "AuctionBidReplacedArchive_id_key"
  ON "AuctionBidReplacedArchive" ("id");

INSERT INTO "AuctionBidReplacedArchive" (
  "id",
  "amountCents",
  "auto",
  "createdAt",
  "productId",
  "bidderId",
  "archivedAt",
  "archiveReason"
)
SELECT
  a."id",
  a."amountCents",
  a."auto",
  a."createdAt",
  a."productId",
  a."bidderId",
  CURRENT_TIMESTAMP,
  'one_offer_per_bidder'
FROM "AuctionBid" a
WHERE EXISTS (
  SELECT 1
  FROM "AuctionBid" b
  WHERE a."productId" = b."productId"
    AND a."bidderId" = b."bidderId"
    AND (b."amountCents", b."createdAt", b."id") > (a."amountCents", a."createdAt", a."id")
)
ON CONFLICT ("id") DO NOTHING;

DELETE FROM "AuctionBid" a
USING "AuctionBid" b
WHERE a."productId" = b."productId"
  AND a."bidderId" = b."bidderId"
  AND (b."amountCents", b."createdAt", b."id") > (a."amountCents", a."createdAt", a."id");

CREATE UNIQUE INDEX IF NOT EXISTS "AuctionBid_productId_bidderId_key"
  ON "AuctionBid" ("productId", "bidderId");

-- Reverse auction: an awarded row wins outright (a requirement points at it via
-- `awardedSellerBidId`); otherwise keep the seller's LOWEST offer, which is what
-- the cheapest-first book ranked them on.
CREATE TABLE IF NOT EXISTS "SellerBidReplacedArchive" (
  LIKE "SellerBid" INCLUDING DEFAULTS INCLUDING GENERATED
);

ALTER TABLE "SellerBidReplacedArchive"
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "archiveReason" TEXT NOT NULL DEFAULT 'one_offer_per_bidder';

CREATE UNIQUE INDEX IF NOT EXISTS "SellerBidReplacedArchive_id_key"
  ON "SellerBidReplacedArchive" ("id");

INSERT INTO "SellerBidReplacedArchive" (
  "id",
  "priceCents",
  "qtyValue",
  "etaDays",
  "message",
  "status",
  "createdAt",
  "updatedAt",
  "buyerBidId",
  "sellerId",
  "archivedAt",
  "archiveReason"
)
SELECT
  s."id",
  s."priceCents",
  s."qtyValue",
  s."etaDays",
  s."message",
  s."status",
  s."createdAt",
  s."updatedAt",
  s."buyerBidId",
  s."sellerId",
  CURRENT_TIMESTAMP,
  'one_offer_per_bidder'
FROM "SellerBid" s
WHERE s."id" NOT IN (
  SELECT DISTINCT ON ("buyerBidId", "sellerId") "id"
  FROM "SellerBid"
  ORDER BY "buyerBidId", "sellerId", ("status" = 'awarded') DESC, "priceCents" ASC, "createdAt" DESC
)
ON CONFLICT ("id") DO NOTHING;

DELETE FROM "SellerBid" s
WHERE s."id" NOT IN (
  SELECT DISTINCT ON ("buyerBidId", "sellerId") "id"
  FROM "SellerBid"
  ORDER BY "buyerBidId", "sellerId", ("status" = 'awarded') DESC, "priceCents" ASC, "createdAt" DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS "SellerBid_buyerBidId_sellerId_key"
  ON "SellerBid" ("buyerBidId", "sellerId");
