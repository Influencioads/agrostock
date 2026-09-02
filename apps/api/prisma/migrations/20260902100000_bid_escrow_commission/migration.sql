-- Competitive bidding: free + unlimited, commission on award, manual escrow check.
--
-- Additive and idempotent, like the lifecycle-emails migration before it. The
-- production BillingSettings singleton already exists, so the DEFAULTs below are
-- what that row picks up — "on by default" has to be encoded here, not only in
-- the Prisma schema.

-- ── Commission rates (bps). 0 switches one off; no extra enable flag. ──
ALTER TABLE "BillingSettings" ADD COLUMN IF NOT EXISTS "auctionCommissionBps"  INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "BillingSettings" ADD COLUMN IF NOT EXISTS "buyerBidCommissionBps" INTEGER NOT NULL DEFAULT 50;

-- ── Order: buyer-borne bid fee + the agent's verification stamp. ──
-- `buyerFeeCents` is separate from `amountCents` on purpose: the seller is still
-- owed the goods total, and the revenue analytics parse `amount`.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "buyerFeeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "verifyRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "verifiedAt"    TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "verifiedById"  TEXT;

-- ── The commission ledger an agent collects from. ──
DO $$ BEGIN
  CREATE TYPE "CommissionChargeKind" AS ENUM ('auction', 'buyer_bid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CommissionChargeStatus" AS ENUM ('pending', 'collected', 'waived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CommissionCharge" (
  "id"            TEXT NOT NULL,
  "ref"           TEXT NOT NULL,
  "kind"          "CommissionChargeKind" NOT NULL,
  "status"        "CommissionChargeStatus" NOT NULL DEFAULT 'pending',
  "payerId"       TEXT NOT NULL,
  "baseCents"     INTEGER NOT NULL,
  "rateBps"       INTEGER NOT NULL,
  "amountCents"   INTEGER NOT NULL,
  "currency"      TEXT NOT NULL DEFAULT 'USD',
  "orderId"       TEXT,
  "productId"     TEXT,
  "buyerBidId"    TEXT,
  "note"          TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "collectedAt"   TIMESTAMP(3),
  "collectedById" TEXT,
  CONSTRAINT "CommissionCharge_pkey" PRIMARY KEY ("id")
);

-- `ref` is the idempotency key: a retried settlement collides instead of
-- double-charging the same auction or bid.
CREATE UNIQUE INDEX IF NOT EXISTS "CommissionCharge_ref_key"          ON "CommissionCharge"("ref");
CREATE INDEX        IF NOT EXISTS "CommissionCharge_status_kind_idx"  ON "CommissionCharge"("status", "kind");
CREATE INDEX        IF NOT EXISTS "CommissionCharge_payerId_idx"      ON "CommissionCharge"("payerId");
CREATE INDEX        IF NOT EXISTS "CommissionCharge_createdAt_idx"    ON "CommissionCharge"("createdAt");

DO $$ BEGIN
  ALTER TABLE "CommissionCharge"
    ADD CONSTRAINT "CommissionCharge_payerId_fkey"
    FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Auctions and buy requests become free and unlimited. ──
-- The two quota keys are KEPT (they stay editable per plan in the admin console)
-- and set to null, which is how this codebase spells "unlimited". Plan.limits is
-- the RUNTIME source of truth and seeds are not part of a deploy, so the live
-- rows have to be updated right here or the old caps keep being enforced.
-- One statement per key, and create_missing = FALSE on both: a seller plan has
-- no business carrying a buy-request cap (nor a buyer plan an auction cap), and
-- creating the key would put an irrelevant field on every plan in the admin
-- editor. Only plans that already declare the cap are touched.
UPDATE "Plan"
SET "limits" = jsonb_set("limits", '{auctionLotsPerMonth}', 'null'::jsonb, false)
WHERE jsonb_exists("limits", 'auctionLotsPerMonth');

UPDATE "Plan"
SET "limits" = jsonb_set("limits", '{rfqsPerMonth}', 'null'::jsonb, false)
WHERE jsonb_exists("limits", 'rfqsPerMonth');

-- ── Retire two perks that were sold but never enforced. ──
-- `bidRoom` and `escrowPriority` had no enforcement call site anywhere in the
-- API, and with bids now free and unlimited "Buyer bid room" as a paid feature
-- is a false claim rather than merely a dormant one. Same reasoning as the
-- limits above: Plan.features is the runtime source of truth.
UPDATE "Plan"
SET "features" = "features" - 'bidRoom' - 'escrowPriority'
WHERE jsonb_exists("features", 'bidRoom')
   OR jsonb_exists("features", 'escrowPriority');
