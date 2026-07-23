import { StyleSheet, View } from 'react-native';
import type { ApiProduct } from '@agrotraders/api-client';
import { space } from '../../theme/tokens';
import { EmptyState, SkeletonGrid } from '../../ui';
import { ProductCard } from '../components';

/**
 * The 2-column results grid shared by every listing surface (Browse, Search,
 * Offers, the boards). Bleeds to the screen edges with a hairline-width gutter
 * so the cards, not the page padding, define the rhythm.
 */
export function ProductGrid({ products, loading, onOpen, empty }: {
  products: ApiProduct[];
  loading?: boolean;
  onOpen: (p: ApiProduct) => void;
  /** Shown when the query succeeded but matched nothing. */
  empty?: { title: string; body?: string; action?: string; onAction?: () => void };
}) {
  if (loading) {
    return (
      <View style={s.pad}>
        <SkeletonGrid count={6} />
      </View>
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
    <View style={s.grid}>
      {products.map((p) => (
        <View key={p.id} style={s.cell}>
          <ProductCard product={p} onPress={() => onOpen(p)} />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1 },
  // Two columns with a 1px seam: the page colour showing between white cards is
  // what separates them, in place of borders and shadows.
  cell: { width: '49.8%' },
  pad: { paddingHorizontal: space.lg },
});
