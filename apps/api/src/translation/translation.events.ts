/**
 * Events emitted by content services after a row is created/updated, consumed by
 * the translation workers (translate-on-write). Mirrors the `NOTIFICATION_CREATED`
 * convention: a constant beside a typed payload, fanned out via EventEmitter2 and
 * handled by decoupled `@OnEvent` listeners in the translation module.
 */

export const PRODUCT_UPSERTED = 'product.upserted';
export const REVIEW_UPSERTED = 'review.upserted';
export const COMMUNITY_GROUP_UPSERTED = 'community-group.upserted';
export const COMMUNITY_POST_UPSERTED = 'community-post.upserted';
export const COMMUNITY_REQUIREMENT_UPSERTED = 'community-requirement.upserted';
export const BUYER_BID_UPSERTED = 'buyer-bid.upserted';

/** Payload for every `*.upserted` content event: just the row id to (re)translate. */
export interface ContentUpsertedEvent {
  id: string;
}
