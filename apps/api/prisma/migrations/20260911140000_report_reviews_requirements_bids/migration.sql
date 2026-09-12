-- Guideline 1.2 asks for a report path on ALL user-generated content, and the
-- first pass covered posts, chat messages, users, groups and listings. It missed
-- three surfaces that also render one trader's free text to another: product and
-- worker reviews, the requirements/RFQ board, and reverse-auction lots.
--
-- These land in the SAME CommunityReport queue as everything else — moderators
-- work one list. Additive and idempotent: adding a value to an enum cannot
-- invalidate an existing row, and IF NOT EXISTS makes a re-run a no-op.
ALTER TYPE "CommunityReportTargetType" ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE "CommunityReportTargetType" ADD VALUE IF NOT EXISTS 'requirement';
ALTER TYPE "CommunityReportTargetType" ADD VALUE IF NOT EXISTS 'buyer_bid';
