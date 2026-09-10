import { View, type ViewStyle } from 'react-native';
import { C, radius, space } from '../theme/tokens';
import { MotiView, useReduceMotion } from './motion';

/**
 * Shimmer placeholders. Every list/grid/detail screen shows the shape of the
 * content it is about to render instead of a centred spinner, so the layout
 * doesn't jump when data lands.
 *
 * Under reduce-motion the pulse is dropped and a flat block is shown — still a
 * correct placeholder, just not animated.
 */
export function Skeleton({ width, height, radius: r = radius.card, style }: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const reduce = useReduceMotion();
  const base: ViewStyle = { width: width ?? '100%', height, borderRadius: r, backgroundColor: C.hairline };
  if (reduce) return <View style={[base, style]} />;
  return (
    <MotiView
      style={[base, style]}
      from={{ opacity: 0.45 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 750, loop: true, repeatReverse: true }}
    />
  );
}

/** Placeholder matching a `ProductCard`: 10:11 image, then name, price and a meta line. */
export function SkeletonCard({ width }: { width?: number }) {
  return (
    <View style={{ width: width ?? '100%', gap: 8 }}>
      <Skeleton height={width ? width * 1.1 : 180} radius={radius.card} />
      <Skeleton height={13} width="85%" />
      <Skeleton height={14} width="55%" />
      <Skeleton height={10} width="45%" />
    </View>
  );
}

/** A 2-column grid of card placeholders, on the same rows/gap as `ProductGrid`. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  const rows = Array.from({ length: Math.ceil(count / 2) }, (_, i) => i);
  return (
    <View style={{ gap: space.md }}>
      {rows.map((r) => (
        <View key={r} style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><SkeletonCard /></View>
          <View style={{ flex: 1 }}>{r * 2 + 1 < count ? <SkeletonCard /> : null}</View>
        </View>
      ))}
    </View>
  );
}

/** Stacked row placeholders for lists (orders, jobs, invoices, directory). */
export function SkeletonRows({ count = 5, height = 56 }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: space.md }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Skeleton width={height} height={height} radius={radius.card} />
          <View style={{ flex: 1, gap: 7 }}>
            <Skeleton height={12} width="70%" />
            <Skeleton height={10} width="40%" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Placeholder for a KPI strip. */
export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.lg }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flex: 1, gap: 7 }}>
          <Skeleton height={18} width="60%" />
          <Skeleton height={10} width="85%" />
        </View>
      ))}
    </View>
  );
}
