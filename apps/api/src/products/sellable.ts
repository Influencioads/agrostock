import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/**
 * F04: one authoritative "can this be bought right now?" predicate, used on
 * every path that resolves a listing to a purchase — detail read, quote, order
 * placement, cart validation — not just the catalog list. Previously only the
 * list query filtered on moderation/expiry, so a moderated, hidden, rejected or
 * expired listing could still be read and ordered directly by id/slug.
 */

/** Prisma filter for catalog/search queries — the list form of the predicate. */
export function sellableWhere(now: Date = new Date()): Prisma.ProductWhereInput {
  return {
    status: 'live',
    // A finished auction lot is no longer purchasable (open-ended lots and plain
    // products are unaffected).
    NOT: { isAuction: true, auctionEndsAt: { lte: now } },
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
 * Throw unless the listing is live, owned by a seller, and (for auctions) still
 * open. Callers that resolve a listing to a purchase must run this before taking
 * payment or reserving stock.
 */
export function assertProductSellable(product: SellableProduct, now: Date = new Date()): void {
  if (product.status !== 'live' || product.approved === false) {
    throw new BadRequestException('This listing is not available for purchase.');
  }
  if (!product.sellerId) {
    throw new BadRequestException('This listing has no seller and cannot be ordered.');
  }
  if (product.isAuction && product.auctionEndsAt && product.auctionEndsAt.getTime() <= now.getTime()) {
    throw new BadRequestException('This auction has ended and can no longer be purchased.');
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
