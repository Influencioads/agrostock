import { stockDisplay } from '@agrotraders/types';
import type { ApiProduct } from '@agrotraders/api-client';
import { C } from '../../theme/tokens';

export interface CardBadge {
  /** i18n key under `compX.product`. */
  key: 'sponsored' | 'auction' | 'verified' | 'outOfStock';
  bg: string;
  fg: string;
}

/**
 * The marks overlaid on a card image, most important first, capped at two so
 * the strip stays one line. A paid placement is always disclosed first; then
 * the listing's state (sold out, live auction); then the one trust mark.
 * Settlement mode, supplier and stock figures live on the product page now.
 */
export function cardBadges(product: ApiProduct, sponsored?: boolean): CardBadge[] {
  const out: CardBadge[] = [];
  if (sponsored) out.push({ key: 'sponsored', bg: C.ink, fg: C.white });
  if (stockDisplay(product.stockQty, product.unit).kind === 'out') out.push({ key: 'outOfStock', bg: C.white, fg: C.error });
  if (product.isAuction) out.push({ key: 'auction', bg: C.mangoDeep, fg: C.white });
  if (product.verified) out.push({ key: 'verified', bg: C.evergreen, fg: C.white });
  return out.slice(0, 2);
}
