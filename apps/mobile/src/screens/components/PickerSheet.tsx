import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Sheet, Txt } from '../../ui';
import { C, radius, space, type } from '../../theme/tokens';
import { useI18n } from '../../i18n';

export interface PickerOption {
  /** Stored value. */
  value: string;
  /** What the row shows — defaults to `value`. */
  label?: string;
}

/** Shared search box for both sheets. */
function SearchBox({ value, onChange, placeholder, loading }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  loading?: boolean;
}) {
  const { t } = useI18n();
  return (
    <View style={s.searchWrap}>
      <View style={s.search}>
        <Ionicons name="search" size={17} color={C.inkSoft} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? t('pubX.browse.searchInList')}
          placeholderTextColor={C.inkMuted}
          style={{ flex: 1, ...type.body, color: C.ink, paddingVertical: 0 }}
        />
        {loading ? <ActivityIndicator size="small" color={C.green} /> : null}
      </View>
    </View>
  );
}

/**
 * Single-select bottom sheet with a search box — the mobile stand-in for a
 * `<select>` when the option count makes chips unusable (countries, cities, GMT
 * offsets).
 *
 * Pass `onSearch` for a remote source (cities): the parent then owns filtering
 * and `options` arrives pre-filtered.
 */
export function PickerSheet({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  onSearch,
  loading,
  emptyLabel,
  searchPlaceholder,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  value?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Set for a server-side search; leave off to filter `options` locally. */
  onSearch?: (q: string) => void;
  loading?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState('');

  const visibleOptions = useMemo(() => {
    if (onSearch) return options; // already filtered upstream
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => (o.label ?? o.value).toLowerCase().includes(term));
  }, [options, q, onSearch]);

  const close = () => {
    setQ('');
    onSearch?.('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title={title} scroll={false}>
      <SearchBox
        value={q}
        onChange={(next) => {
          setQ(next);
          onSearch?.(next);
        }}
        placeholder={searchPlaceholder}
        loading={loading}
      />
      <FlatList
        data={visibleOptions}
        keyExtractor={(o) => o.value}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? null : (
            <Txt variant="small" color={C.inkMuted} style={{ padding: space.lg }}>
              {emptyLabel ?? '—'}
            </Txt>
          )
        }
        renderItem={({ item }) => {
          const selected = item.value === value;
          return (
            <Pressable
              onPress={() => {
                onSelect(item.value);
                close();
              }}
              style={s.row}
            >
              <Text style={[s.rowLabel, selected && s.rowLabelOn]} numberOfLines={1}>
                {item.label ?? item.value}
              </Text>
              {selected ? <Ionicons name="checkmark" size={18} color={C.green} /> : null}
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

/**
 * Multi-select twin of `PickerSheet`. Selections are edited as a draft and only
 * handed back on DONE, so a long list of taps costs the caller one state update
 * instead of one per tap.
 */
export function MultiPickerSheet({
  visible,
  title,
  options,
  values,
  onDone,
  onClose,
  emptyLabel,
  searchPlaceholder,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  values: string[];
  onDone: (next: string[]) => void;
  onClose: () => void;
  emptyLabel?: string;
  searchPlaceholder?: string;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState<string[]>(values);

  // Re-seed each time the sheet opens so an abandoned edit doesn't persist.
  const [seenVisible, setSeenVisible] = useState(visible);
  if (visible !== seenVisible) {
    setSeenVisible(visible);
    if (visible) {
      setDraft(values);
      setQ('');
    }
  }

  const visibleOptions = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => (o.label ?? o.value).toLowerCase().includes(term));
  }, [options, q]);

  const toggle = (v: string) =>
    setDraft((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      scroll={false}
      footer={
        <>
          <View style={{ flex: 1 }}>
            <Button full title={t('pubX.filter.clearAll')} variant="outline" onPress={() => setDraft([])} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              full
              title={draft.length ? t('pubX.filter.applyN', { count: draft.length }) : t('pubX.filter.apply')}
              onPress={() => {
                onDone(draft);
                onClose();
              }}
            />
          </View>
        </>
      }
    >
      <SearchBox value={q} onChange={setQ} placeholder={searchPlaceholder} />
      <FlatList
        data={visibleOptions}
        keyExtractor={(o) => o.value}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Txt variant="small" color={C.inkMuted} style={{ padding: space.lg }}>
            {emptyLabel ?? '—'}
          </Txt>
        }
        renderItem={({ item }) => {
          const on = draft.includes(item.value);
          return (
            <Pressable onPress={() => toggle(item.value)} style={s.row}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={19} color={on ? C.green : C.inkSoft} />
              <Text style={[s.rowLabel, { flex: 1 }, on && s.rowLabelOn]} numberOfLines={1}>
                {item.label ?? item.value}
              </Text>
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}

/**
 * Tappable field that opens a `PickerSheet` — the mobile equivalent of a labelled
 * `<select>`. Keeps the sheet's open state so callers just bind value/onChange.
 */
export function PickerField({
  label,
  placeholder,
  value,
  displayValue,
  options,
  onChange,
  onSearch,
  loading,
  disabled,
  title,
  emptyLabel,
  searchPlaceholder,
}: {
  label: string;
  placeholder?: string;
  value: string;
  /** Shown instead of `value` when the stored value is not the display text. */
  displayValue?: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  onSearch?: (q: string) => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <Pressable onPress={() => !disabled && setOpen(true)} style={[s.field, disabled && { opacity: 0.55 }]}>
        <Text style={[s.fieldText, { color: value ? C.ink : C.inkMuted }]} numberOfLines={1}>
          {(value && (displayValue ?? value)) || placeholder || ''}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.inkSoft} />
      </Pressable>
      <PickerSheet
        visible={open}
        title={title ?? label}
        options={options}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
        onSearch={onSearch}
        loading={loading}
        emptyLabel={emptyLabel}
        searchPlaceholder={searchPlaceholder}
      />
    </View>
  );
}

/**
 * Multi-select field: a trigger showing how many are picked, the picked ones as
 * removable chips, and a `MultiPickerSheet` behind it. Replaces dumping every
 * option on the page as a chip grid.
 */
export function MultiPickerField({
  label,
  hint,
  placeholder,
  values,
  options,
  onChange,
  title,
  searchPlaceholder,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  values: string[];
  options: PickerOption[];
  onChange: (next: string[]) => void;
  title?: string;
  searchPlaceholder?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      {hint ? <Txt variant="muted">{hint}</Txt> : null}
      <Pressable onPress={() => setOpen(true)} style={s.field}>
        <Text style={[s.fieldText, { color: values.length ? C.ink : C.inkMuted }]} numberOfLines={1}>
          {values.length ? t('pubX.filter.applyN', { count: values.length }) : placeholder || ''}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.inkSoft} />
      </Pressable>

      {/* Only the chosen options appear inline — the full list lives in the sheet. */}
      {values.length > 0 ? (
        <View style={s.chips}>
          {values.map((v) => (
            <Pressable key={v} onPress={() => onChange(values.filter((x) => x !== v))} style={s.chip}>
              <Text numberOfLines={1} style={s.chipText}>{labelFor(v)}</Text>
              <Ionicons name="close" size={12} color={C.dark} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <MultiPickerSheet
        visible={open}
        title={title ?? label}
        options={options}
        values={values}
        onDone={onChange}
        onClose={() => setOpen(false)}
        searchPlaceholder={searchPlaceholder}
      />
    </View>
  );
}

const s = StyleSheet.create({
  searchWrap: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    height: 42,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  rowLabel: { ...type.body, color: C.ink, flexShrink: 1 },
  rowLabelOn: { ...type.title },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: C.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    height: 46,
  },
  fieldText: { ...type.body, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.surface,
    borderRadius: 3,
    paddingHorizontal: 9,
    paddingVertical: 6,
    maxWidth: 190,
  },
  chipText: { ...type.caption, color: C.dark, flexShrink: 1 },
});
