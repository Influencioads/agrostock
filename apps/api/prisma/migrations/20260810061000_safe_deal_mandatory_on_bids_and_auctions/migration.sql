-- Safe Deal is mandatory on auctions and bids.
--
-- The opt-out is gone from every form and rejected at the service layer (see
-- apps/api/src/products/safe-deal.ts). Rows written before that rule existed
-- still carry `safeDeal = false`, and they would now be un-settleable: the award
-- guard reads the stored flag, so a legacy direct-deal requirement could never
-- be awarded at all. Promote them instead of stranding them.
--
-- Ordinary (non-auction) listings are deliberately untouched — a seller may
-- still offer those as a direct deal, and this rule was never about them.

-- Every auction lot becomes escrow-protected.
UPDATE "Product" SET "safeDeal" = true WHERE "isAuction" = true AND "safeDeal" = false;

-- Every buyer requirement/bid becomes escrow-protected, in both modes
-- (`quote` and `auction`) — the client's rule covers bids and auctions alike.
UPDATE "BuyerBid" SET "safeDeal" = true WHERE "safeDeal" = false;
