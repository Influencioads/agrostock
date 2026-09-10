import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { countryFlag, type ApiProduct } from '@agrotraders/api-client';
import { stockDisplay, unitSuffix } from '@agrotraders/types';
import { C, radius, space, type } from '../theme/tokens';
import { microLabel } from '../theme/casing';
import { assetUrl } from '../lib/api';
import { useCurrency } from '../currency/CurrencyContext';
import { useWishlist } from '../lib/useWishlist';
import { ProduceMark, RatingPill } from '../ui';
import { useI18n } from '../i18n';
import { cardBadges } from './components/cardBadges';

/**
 * F02: the wishlist heart overlaid on a card image. A real add/remove control
 * (not decorative). Only rendered for signed-in users, so guests aren't shown a
 * save affordance that can't persist. Its own Pressable swallows the tap so it
 * never triggers the card's navigation.
 */
function SaveHeart({ productId }: { productId: string }) {
  const { t } = useI18n();
  const { canSave, isSaved, toggle } = useWishlist();
  if (!canSave) return null;
  const saved = isSaved(productId);
  return (
    <Pressable
      onPress={() => toggle(productId)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? t('compX.product.removeFromSaved') : t('compX.product.addToSaved')}
      style={s.heart}
    >
      <Ionicons name={saved ? 'heart' : 'heart-outline'} size={16} color={saved ? C.mangoDeep : C.dark} />
    </Pressable>
  );
}

/**
 * Product cards, B2B edition.
 *
 * Built to be compared across a grid, so every card carries the same four
 * lines in the same order — name, price per unit, minimum order, where the
 * goods are — and nothing else. Supplier, settlement mode, market and the
 * stock figure moved to the product page; a sold-out listing is flagged on the
 * image instead of costing a text line.
 */

/** Trust/state marks overlaid on the image. See `cardBadges` for the order. */
function ImageBadges({ product, sponsored }: { product: ApiProduct; sponsored?: boolean }) {
  const { t } = useI18n();
  const marks = cardBadges(product, sponsored);
  if (marks.length === 0) return null;
  return (
    <View style={s.badgeStrip}>
      {marks.map((m) => (
        <View key={m.key} style={[s.imgBadge, { backgroundColor: m.bg }]}>
          <Text numberOfLines={1} style={[s.imgBadgeText, { color: m.fg }]}>{t(`compX.product.${m.key}`)}</Text>
        </View>
      ))}
    </View>
  );
}

/** The image well, or the shared produce mark when there is no artwork. */
function Cover({ product, height }: { product: ApiProduct; height: number | undefined }) {
  const [failed, setFailed] = useState(false);
  const uri = failed ? undefined : assetUrl(product.imageUrl);
  return (
    <View style={[s.cover, height ? { height } : { aspectRatio: 10 / 11 }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ProduceMark size={56} />
      )}
    </View>
  );
}

/** Supply line: "MOQ 20 MT". */
function useSupplyLine(product: ApiProduct): string | null {
  const { t } = useI18n();
  return product.moq ? t('compX.product.moq', { value: product.moq }) : null;
}

/**
 * Where the goods are.
 *
 * Careful with `flag`: despite the name it holds a full display string like
 * "🇺🇸 USA" — the same value as `origin` — so prefixing it to `origin` renders
 * the flag and country twice. Structured `city`/`country` win when present;
 * otherwise `origin` is used alone, since it already carries its own flag.
 */
function placeLine(product: ApiProduct): string | null {
  const structured = [product.city, product.country].filter(Boolean).join(', ');
  if (structured) {
    const flag = product.country ? countryFlag(product.country) : '';
    return `${flag} ${structured}`.trim();
  }
  // Some seeded rows carry only a flag emoji as their origin ("🇹🇷" with no
  // "Türkiye"). A lone flag names nothing, so drop the line rather than render
  // a stray glyph under the price.
  const origin = product.origin?.trim();
  return origin && /\p{L}/u.test(origin) ? origin : null;
}

/** Compact product card for carousels (fixed width) or grids (flex). */
export function ProductCard({ product, onPress, width, sponsored }: { product: ApiProduct; onPress?: () => void; width?: number; sponsored?: boolean }) {
  const { fmtPrice } = useCurrency();
  const { t } = useI18n();
  const supply = useSupplyLine(product);
  // Only real, review-derived ratings are shown; an unrated listing shows nothing
  // rather than the cosmetic "4.8" default the legacy `rating` string carries.
  const rated = (product.ratingCount ?? 0) > 0;
  const place = placeLine(product);

  return (
    <Pressable
      onPress={onPress}
      // A grid card fills its cell so the two cards in a row stay the same height.
      style={({ pressed }) => [s.card, width ? { width } : s.cardFill, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View>
        <Cover product={product} height={width ? width * 1.1 : undefined} />
        <ImageBadges product={product} sponsored={sponsored} />
        <SaveHeart productId={product.id} />
        {rated ? (
          <View style={s.ratingSlot}>
            <RatingPill avg={product.ratingAvg ?? 0} count={product.ratingCount ?? 0} />
          </View>
        ) : null}
      </View>

      <View style={s.body}>
        {/* Two lines reserved even for a short name, so prices line up across the row. */}
        <Text numberOfLines={2} style={s.name}>{product.name}</Text>
        <Text numberOfLines={1} style={s.price}>
          {fmtPrice(product)}
          <Text style={s.unit}>{unitSuffix(product.unit, t)}</Text>
        </Text>
        {supply ? <Text numberOfLines={1} style={s.meta}>{supply}</Text> : null}
        {place ? <Text numberOfLines={1} style={s.meta}>{place}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * The one stock figure, from the shared resolver the web card and product page
 * use. `stockQty` is the source of truth; null/undefined means the seller does
 * not track stock, so we say "in stock" rather than "0".
 */
export function stockLabel(product: ApiProduct, t: (k: string, o?: Record<string, unknown>) => string): string {
  const s = stockDisplay(product.stockQty, product.unit);
  if (s.kind === 'untracked') return t('compX.product.inStock');
  if (s.kind === 'out') return t('compX.product.outOfStock');
  return t('compX.product.stockCount', { count: s.count, unit: t(`enums:unitShort.${s.unit}`) });
}

/**
 * Horizontal variant for lists where the row, not the grid, is the unit —
 * saved items, order lines, the RFQ basket.
 */
export function ProductRow({ product, onPress, right, subtitle }: {
  product: ApiProduct;
  onPress?: () => void;
  /** Trailing control (qty stepper, remove button). */
  right?: React.ReactNode;
  /** Overrides the supply line, e.g. with an order status. */
  subtitle?: string;
}) {
  const { t } = useI18n();
  const { fmtPrice } = useCurrency();
  const supply = useSupplyLine(product);
  const [failed, setFailed] = useState(false);
  const uri = failed ? undefined : assetUrl(product.imageUrl);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
      <View style={s.rowCover}>
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setFailed(true)} />
        ) : (
          <ProduceMark size={36} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {product.seller?.name ? (
          <Text numberOfLines={1} style={[s.supplier, microLabel()]}>{product.seller.name}</Text>
        ) : null}
        <Text numberOfLines={2} style={s.name}>{product.name}</Text>
        <Text numberOfLines={1} style={s.price}>
          {fmtPrice(product)}
          <Text style={s.unit}>{unitSuffix(product.unit, t)}</Text>
        </Text>
        {subtitle ?? supply ? <Text numberOfLines={1} style={s.meta}>{subtitle ?? supply}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

const s = StyleSheet.create({
  // Cards sit flat: the page colour and a hairline separate them, never a shadow.
  card: { backgroundColor: C.white, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, overflow: 'hidden' },
  cardFill: { flex: 1 },
  cover: { width: '100%', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badgeStrip: { position: 'absolute', bottom: 8, start: 8, flexDirection: 'row', gap: 4, maxWidth: '90%' },
  imgBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  imgBadgeText: { ...type.title, fontSize: 12, lineHeight: 15 },
  ratingSlot: { position: 'absolute', bottom: 8, end: 8 },
  heart: {
    position: 'absolute', top: 8, end: 8, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: space.md, gap: 3 },
  supplier: { ...type.micro, fontSize: 11, color: C.inkSoft },
  name: { ...type.title, color: C.ink, minHeight: type.title.lineHeight * 2 },
  price: { ...type.numeric, fontSize: 16, lineHeight: 21, color: C.ink, marginTop: 2 },
  unit: { ...type.caption, color: C.inkSoft },
  meta: { ...type.caption, color: C.inkSoft },
  row: { flexDirection: 'row', gap: space.md, backgroundColor: C.white, padding: space.md, alignItems: 'center' },
  rowCover: { width: 76, height: 84, borderRadius: radius.card, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
