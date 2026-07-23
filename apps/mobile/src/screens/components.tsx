import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { countryFlag, type ApiProduct } from '@agrotraders/api-client';
import { unitSuffix } from '@agrotraders/types';
import { C, radius, space, type } from '../theme/tokens';
import { microLabel } from '../theme/casing';
import { assetUrl } from '../lib/api';
import { useCurrency } from '../currency/CurrencyContext';
import { RatingPill } from '../ui';
import { useI18n } from '../i18n';

/**
 * Product cards, B2B edition.
 *
 * The layout borrows retail-grade density — image bleeding to the card edge at
 * a tall aspect ratio, a two-line text block, one figure per line — but the
 * content is trade data, not retail: supplier in the "brand" slot, price per
 * unit, MOQ and available quantity. There is deliberately no discount badge,
 * strikethrough price or wishlist heart; none of those exist in this market.
 */

/** Trust markers overlaid on the image. Kept to two so the strip stays one line. */
function ImageBadges({ product, t }: { product: ApiProduct; t: (k: string) => string }) {
  const marks: { label: string; bg: string; fg: string }[] = [];
  if (product.isAuction) marks.push({ label: t('compX.product.auction'), bg: C.mangoDeep, fg: C.white });
  if (product.verified) marks.push({ label: t('compX.product.verified'), bg: C.evergreen, fg: C.white });
  else if (product.safeDeal) marks.push({ label: t('compX.product.safeDeal'), bg: C.white, fg: C.dark });
  if (marks.length === 0) return null;
  return (
    <View style={s.badgeStrip}>
      {marks.slice(0, 2).map((m) => (
        <View key={m.label} style={[s.imgBadge, { backgroundColor: m.bg }]}>
          <Text numberOfLines={1} style={[{ ...type.micro, fontSize: 9, color: m.fg }, microLabel()]}>{m.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** The image well, or the product emoji when there is no artwork. */
function Cover({ product, height }: { product: ApiProduct; height: number | undefined }) {
  const [failed, setFailed] = useState(false);
  const uri = failed ? undefined : assetUrl(product.imageUrl);
  return (
    <View style={[s.cover, height ? { height } : { aspectRatio: 4 / 5 }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ fontSize: 46 }}>{product.emoji ?? '🌾'}</Text>
      )}
    </View>
  );
}

/** Supply line: "MOQ 20 MT · 400 MT available". Omits whichever half is missing. */
function useSupplyLine(product: ApiProduct): string | null {
  const { t } = useI18n();
  const parts: string[] = [];
  if (product.moq) parts.push(t('compX.product.moq', { value: product.moq }));
  if (product.qty) parts.push(t('compX.product.available', { value: product.qty }));
  return parts.length ? parts.join(' · ') : null;
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
export function ProductCard({ product, onPress, width }: { product: ApiProduct; onPress?: () => void; width?: number }) {
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
      style={({ pressed }) => [s.card, { width: width ?? '100%', opacity: pressed ? 0.85 : 1 }]}
    >
      <View>
        <Cover product={product} height={width ? width * 1.25 : undefined} />
        <ImageBadges product={product} t={t} />
        {rated ? (
          <View style={s.ratingSlot}>
            <RatingPill avg={product.ratingAvg ?? 0} count={product.ratingCount ?? 0} />
          </View>
        ) : null}
      </View>

      <View style={s.body}>
        {product.seller?.name ? (
          <Text numberOfLines={1} style={[s.supplier, microLabel()]}>{product.seller.name}</Text>
        ) : null}
        <Text numberOfLines={1} style={s.name}>{product.name}</Text>
        <Text numberOfLines={1} style={s.price}>
          {fmtPrice(product)}
          <Text style={s.unit}>{unitSuffix(product.unit)}</Text>
        </Text>
        {supply ? <Text numberOfLines={1} style={s.meta}>{supply}</Text> : null}
        {place ? <Text numberOfLines={1} style={s.meta}>{place}</Text> : null}
      </View>
    </Pressable>
  );
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
          <Text style={{ fontSize: 26 }}>{product.emoji ?? '🌾'}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {product.seller?.name ? (
          <Text numberOfLines={1} style={[s.supplier, microLabel()]}>{product.seller.name}</Text>
        ) : null}
        <Text numberOfLines={2} style={s.name}>{product.name}</Text>
        <Text numberOfLines={1} style={s.price}>
          {fmtPrice(product)}
          <Text style={s.unit}>{unitSuffix(product.unit)}</Text>
        </Text>
        {subtitle ?? supply ? <Text numberOfLines={1} style={s.meta}>{subtitle ?? supply}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: radius.card, overflow: 'hidden' },
  cover: { width: '100%', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badgeStrip: { position: 'absolute', bottom: 6, start: 6, flexDirection: 'row', gap: 4, maxWidth: '90%' },
  imgBadge: { borderRadius: 2, paddingHorizontal: 5, paddingVertical: 2.5 },
  ratingSlot: { position: 'absolute', bottom: 6, end: 6 },
  body: { padding: space.md, gap: 2 },
  supplier: { ...type.micro, fontSize: 10.5, color: C.ink },
  name: { ...type.body, color: C.inkMuted },
  price: { ...type.numeric, color: C.ink, marginTop: 2 },
  unit: { ...type.caption, color: C.inkMuted },
  meta: { ...type.caption, fontSize: 11, color: C.inkMuted },
  row: { flexDirection: 'row', gap: space.md, backgroundColor: C.white, padding: space.md, alignItems: 'center' },
  rowCover: { width: 76, height: 95, borderRadius: radius.card, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
