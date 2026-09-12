-- Guideline 1.2: marketplace listings are user-generated content too, so they
-- need the same "report" affordance as posts and chat messages. Reports land in
-- the existing CommunityReport queue rather than a second table — moderators
-- work one list, and the admin UI already renders it.
--
-- Additive and idempotent: adding a value to an enum cannot invalidate an
-- existing row, and IF NOT EXISTS makes a re-run a no-op.
ALTER TYPE "CommunityReportTargetType" ADD VALUE IF NOT EXISTS 'product';
