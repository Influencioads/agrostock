-- Scheduled lifecycle email flow: renewal reminders, add-on expiry, quota
-- warnings and the upgrade nudge sequence.
--
-- Additive and idempotent, like the translation-settings migration before it.
-- Nothing here rewrites or back-fills an existing row.

-- Master controls on the BillingSettings singleton.
--
-- `lifecycleEmailsEnabled` defaults TRUE to match the Prisma schema, so the
-- singleton that already exists in production picks up the same value the code
-- expects. It gates SCHEDULED mail only — transactional receipts (paid, failed,
-- cancelled) are deliberately outside it, because a customer must always be told
-- what happened to their money.
ALTER TABLE "BillingSettings"
  ADD COLUMN IF NOT EXISTS "lifecycleEmailsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Days after email verification on which the three upgrade nudges go out.
-- An empty array turns the sequence off while leaving the reminders running.
ALTER TABLE "BillingSettings"
  ADD COLUMN IF NOT EXISTS "upgradeNudgeDays" INTEGER[] NOT NULL DEFAULT ARRAY[3, 12, 30];

-- Send-once ledger. The unique index IS the anti-spam mechanism: writing the row
-- is the claim to send, so a re-run sweep, a second replica or a retried cron can
-- never send the same message twice.
CREATE TABLE IF NOT EXISTS "LifecycleEmail" (
  "id"     TEXT         NOT NULL,
  "userId" TEXT         NOT NULL,
  "key"    TEXT         NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LifecycleEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LifecycleEmail_userId_key_key"
  ON "LifecycleEmail" ("userId", "key");

CREATE INDEX IF NOT EXISTS "LifecycleEmail_userId_sentAt_idx"
  ON "LifecycleEmail" ("userId", "sentAt");

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so guard it explicitly rather
-- than letting a re-run abort the whole migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LifecycleEmail_userId_fkey'
  ) THEN
    ALTER TABLE "LifecycleEmail"
      ADD CONSTRAINT "LifecycleEmail_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
