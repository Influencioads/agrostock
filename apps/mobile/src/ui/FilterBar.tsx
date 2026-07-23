import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, elevation, space, type } from '../theme/tokens';
import { microLabel } from '../theme/casing';

/**
 * The split SORT | FILTER bar pinned to the bottom of every listing surface.
 * Pass it to `<Screen footer={…}>` so it sits above the tab bar rather than
 * floating over the last row of results.
 */
export function FilterBar({ sortLabel, filterLabel, activeCount, onSort, onFilter }: {
  sortLabel: string;
  filterLabel: string;
  /** Number of applied filters; shown as a count bubble on the FILTER half. */
  activeCount?: number;
  onSort: () => void;
  onFilter: () => void;
}) {
  return (
    <View style={s.bar}>
      <Pressable onPress={onSort} style={s.half}>
        <Ionicons name="swap-vertical" size={17} color={C.ink} />
        <Text style={[s.label, microLabel()]}>{sortLabel}</Text>
      </Pressable>
      <View style={s.rule} />
      <Pressable onPress={onFilter} style={s.half}>
        <Ionicons name="options-outline" size={17} color={C.ink} />
        <Text style={[s.label, microLabel()]}>{filterLabel}</Text>
        {activeCount ? (
          <View style={s.count}>
            <Text style={s.countText}>{activeCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
    ...elevation.low,
  },
  half: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14 },
  rule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: C.hairline, marginVertical: 9 },
  label: { ...type.micro, color: C.ink, fontSize: 12 },
  count: {
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 2,
  },
  countText: { color: C.white, ...type.micro, fontSize: 9.5, lineHeight: 12 },
});

/** Horizontal strip of removable applied-filter chips, shown above the results. */
export function AppliedFilters({ items, onClearAll, clearLabel }: {
  items: { key: string; label: string; onRemove: () => void }[];
  onClearAll?: () => void;
  clearLabel?: string;
}) {
  if (items.length === 0) return null;
  return (
    <View style={a.wrap}>
      {items.map((it) => (
        <Pressable key={it.key} onPress={it.onRemove} style={a.chip}>
          <Text numberOfLines={1} style={a.chipText}>{it.label}</Text>
          <Ionicons name="close" size={12} color={C.dark} />
        </Pressable>
      ))}
      {onClearAll && clearLabel ? (
        <Pressable onPress={onClearAll} style={a.clear}>
          <Text style={[a.clearText, microLabel()]}>{clearLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const a = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.surface,
    borderRadius: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 190,
  },
  chipText: { ...type.caption, color: C.dark, flexShrink: 1 },
  clear: { paddingVertical: 5, paddingHorizontal: 4 },
  clearText: { ...type.micro, color: C.error, fontSize: 11 },
});
