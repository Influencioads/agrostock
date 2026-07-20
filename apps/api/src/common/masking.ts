/**
 * Bidder/seller identity masking, shared by the two opposed bidding features:
 * the ascending seller auction (`Product.isAuction` + `AuctionBid`) and the
 * reverse buyer bid (`BuyerBid` + `SellerBid`). Both hide who is bidding while
 * publishing the prices, so they must mask identically — one copy, not two.
 */

// Cosmetic flag pool for the masked bid history. Bidder identities are hidden,
// so the flag is a stable, non-identifying decoration keyed off the bidder id.
export const FLAGS = ['🇦🇪', '🇷🇺', '🇮🇳', '🇹🇷', '🇺🇦', '🇨🇳', '🇪🇬', '🇰🇿', '🇻🇳', '🇧🇷', '🇦🇷', '🇹🇭'];

export function stableHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export const flagFor = (id: string) => FLAGS[stableHash(id) % FLAGS.length];

/** "Rahul Kapoor" → "R••• K." — keep initials, hide the rest (70%-masked look). */
export function maskName(name?: string | null): string {
  const n = (name ?? '').trim();
  if (!n) return 'Bidder';
  const parts = n.split(/\s+/);
  const head = parts[0][0].toUpperCase();
  const tail = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : '';
  return `${head}•••${tail}`;
}
