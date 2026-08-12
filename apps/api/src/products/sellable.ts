import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/**
 * F04: one authoritative "can this be bought right now?" predicate, used on
 * every path that resolves a listing to a purchase — detail read, quote, order
 * placement, cart validation — not just the catalog list. Previously only the
 * list query filtered on moderation/expiry, so a moderated, hidden, rejected or
 * expired listing could still be read and ordered directly by id/slug.
 */

/**
 * What a buyer may SEE in the catalog — deliberately wider than what they may
 * BUY.
 *
 * Auction lots are products and belong in the grid: a category holding six
 * listings, two of them auctions, has to show six. Browse used to run the
 * purchase predicate instead, so every auction lot silently vanished from the
 * category it belongs to and the counts never added up.
 *
 * Nothing is weakened by this. The direct-buy path is guarded independently by
 * `assertProductSellable`, which rejects EVERY auction (live or ended), and the
 * detail route already resolves auction lots — expired ones keep `status:
 * 'live'` precisely so their result pages stay readable.
 */
export function browsableWhere(): Prisma.ProductWhereInput {
  return { status: 'live' };
}

/**
 * Prisma filter for paths that resolve a listing to a purchase.
 *
 * The auction clause is written as an explicit OR of the passing cases rather
 * than `NOT: { isAuction: true, auctionEndsAt: { lte: now } }`. That negation
 * ran into SQL's three-valued logic: for an OPEN-ENDED lot (`auctionEndsAt`
 * null) the inner AND evaluates to NULL, `NOT NULL` is NULL, and a WHERE keeps
 * only rows that are TRUE — so open-ended auctions were dropped by a predicate
 * whose own comment claimed they were unaffected. Spelling out the three
 * passing cases has no NULL to propagate.
 */
export function sellableWhere(now: Date = new Date()): Prisma.ProductWhereInput {
  return {
    status: 'live',
    OR: [
      { isAuction: false },
      // Open-ended lot — no countdown to have run out.
      { auctionEndsAt: null },
      { auctionEndsAt: { gt: now } },
    ],
  };
}

/** The fields the assertion needs — a subset of Product. */
export interface SellableProduct {
  status: string;
  approved?: boolean;
  sellerId?: string | null;
  isAuction?: boolean;
  auctionEndsAt?: Date | null;
}

/**
 * Throw unless the listing is live, owned by a seller, and NOT an auction.
 * Callers that resolve a listing to a *direct* purchase (buy-now / enquiry) must
 * run this before taking payment or reserving stock.
 *
 * BL-09: an auction lot is sold through the bidding flow, never bought outright.
 * Previously only an *ended* auction was rejected here, so a still-live auction
 * lot that also carried a `priceCents` could be bought directly via `POST
 * /orders`, sidestepping the auction entirely. We now reject any auction on the
 * direct-buy path — ended ones with an explicit "ended" message, live ones by
 * directing the buyer to bid.
 */
export function assertProductSellable(product: SellableProduct, now: Date = new Date()): void {
  if (product.status !== 'live' || product.approved === false) {
    throw new BadRequestException('This listing is not available for purchase.');
  }
  if (!product.sellerId) {
    throw new BadRequestException('This listing has no seller and cannot be ordered.');
  }
  if (product.isAuction) {
    if (product.auctionEndsAt && product.auctionEndsAt.getTime() <= now.getTime()) {
      throw new BadRequestException('This auction has ended and can no longer be purchased.');
    }
    throw new BadRequestException('This is an auction lot — place a bid instead of buying directly.');
  }
}

/**
 * F12: resolve the canonical unit price in integer minor units. Rejects listings
 * with no trustworthy numeric price rather than silently coercing an unparseable
 * display string to 0. `priceCents` is the source of truth; a positive parsed
 * `price` string is accepted as a backfill only.
 */
export function resolveUnitPriceCents(product: { priceCents?: number | null; price?: string | null }): number {
  const canonical = product.priceCents;
  if (typeof canonical === 'number' && Number.isInteger(canonical) && canonical > 0) return canonical;
  const parsed = Math.round((Number(String(product.price ?? '').replace(/[^0-9.]/g, '')) || 0) * 100);
  if (parsed > 0) return parsed;
  throw new BadRequestException('This listing has no valid price and cannot be ordered.');
}
