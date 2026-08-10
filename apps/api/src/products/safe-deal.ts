import { BadRequestException } from '@nestjs/common';

/**
 * Safe Deal is MANDATORY on every competitive-bidding flow.
 *
 * Auctions and buyer bids settle between two parties who have not traded before
 * and who agreed a price in public — the two cases where "we'll settle it
 * ourselves" turned into the disputes the platform then had to arbitrate with no
 * money in hand. Escrow is therefore not an option on those flows any more: the
 * opt-out is gone from every form, and this guard is the service-layer backstop
 * so a hand-rolled request, an older mobile build or a future code path cannot
 * put a direct deal back.
 *
 * Plain (non-auction) listings are untouched — a seller may still offer those as
 * a direct deal, and `Product.safeDeal` keeps meaning what it always did there.
 *
 * Enforced, not defaulted: a request that explicitly asks for `safeDeal: false`
 * is REJECTED rather than quietly coerced to `true`, so an integration built
 * against the old behaviour fails loudly instead of silently changing meaning.
 */

/** The message every surface (API error, UI copy, terms) states this rule with. */
export const SAFE_DEAL_REQUIRED_MESSAGE =
  'Auctions and bids are settled through Safe Deal escrow. A direct deal is not available on these flows.';

/**
 * Reject an explicit opt-out, then return the value to store — always `true`.
 *
 * `undefined` (the field was never sent) is fine and resolves to `true`: that is
 * the ordinary path for a client that no longer has the toggle at all.
 */
export function requireSafeDeal(requested: boolean | null | undefined): true {
  if (requested === false) throw new BadRequestException(SAFE_DEAL_REQUIRED_MESSAGE);
  return true;
}

/**
 * The same rule applied to a listing being created or edited: it only binds when
 * the listing IS an auction, so an ordinary product keeps its seller's choice.
 */
export function resolveListingSafeDeal(requested: boolean | null | undefined, isAuction: boolean): boolean {
  if (isAuction) return requireSafeDeal(requested);
  return requested ?? true;
}

/**
 * Guard for the moment money is committed — awarding a bid, or minting an order
 * out of an auction win. Reads the stored flag rather than a request field, so a
 * row written before this rule existed (or through some path that missed the
 * guard above) cannot be settled outside escrow.
 */
export function assertSafeDealSettlement(source: { safeDeal?: boolean | null }): void {
  if (source.safeDeal !== true) throw new BadRequestException(SAFE_DEAL_REQUIRED_MESSAGE);
}
