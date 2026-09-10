import { StyleSheet, View } from 'react-native';
import type { ApiProduct } from '@agrotraders/api-client';
import { space } from '../../theme/tokens';
import { EmptyState, ErrorState, SkeletonGrid } from '../../ui';
import { useI18n } from '../../i18n';
import { ProductCard } from '../components';

/** Pairs a flat list into rows of two — the one grid rhythm every surface shares. */
export function pairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

/**
 * The 2-column results grid shared by every product surface — Home, Browse,
 * Search, Offers, the boards. Page gutters and a fixed card gap, so cards look
 * the same wherever they appear; rows of two flex cells keep both cards in a
 * row the same width and height.
 */
export function ProductGrid({ products, loading, error, onRetry, onOpen, empty, sponsoredIds }: {
  products: ApiProduct[];
  loading?: boolean;
  /** F28: true when the query failed — shown as a retryable error, not "empty". */
  error?: boolean;
  onRetry?: () => void;
  onOpen: (p: ApiProduct) => void;
  /** Shown when the query succeeded but matched nothing. */
  empty?: { title: string; body?: string; action?: string; onAction?: () => void };
  /** F30: ids of paid placements, so their cards carry the "Sponsored" mark. */
  sponsoredIds?: Set<string>;
}) {
  const { t } = useI18n();
  if (loading) {
    return (
      <View style={s.pad}>
        <SkeletonGrid count={6} />
      </View>
    );
  }
  // F28: a failed fetch with no data is an error (retryable), never "no results".
  if (error && products.length === 0) {
    return (
      <ErrorState
        title={t('common:errorTitle')}
        body={t('common:errorBody')}
        onRetry={onRetry}
        retryLabel={t('common:retry')}
      />
    );
  }
  if (products.length === 0 && empty) {
    return (
      <EmptyState
        icon="search-outline"
        title={empty.title}
        body={empty.body}
        action={empty.action}
        onAction={empty.onAction}
      />
    );
  }
  return (
    <View style={[s.pad, s.grid]}>
      {pairs(products).map((row) => (
        <View key={row[0].id} style={s.row}>
          {row.map((p) => (
            <View key={p.id} style={s.cell}>
              <ProductCard product={p} onPress={() => onOpen(p)} sponsored={sponsoredIds?.has(p.id)} />
            </View>
          ))}
          {/* An odd last row keeps its single card at half width. */}
          {row.length === 1 ? <View style={s.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: space.lg },
  grid: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  cell: { flex: 1 },
});
