import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import { useI18n } from '../../i18n';

export interface PickerOption {
  /** Stored value. */
  value: string;
  /** What the row shows — defaults to `value`. */
  label?: string;
}

/**
 * Single-select bottom sheet with a search box — the mobile stand-in for a
 * `<select>` when the option count makes chips unusable (countries, cities, GMT
 * offsets). Modelled on `CategorySheet`.
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
  const { t } = useI18n();
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={close} />
      <View
        style={{
          backgroundColor: C.bg,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          maxHeight: '86%',
        }}
      >
        <Row style={{ justifyContent: 'space-between', padding: space.lg, paddingBottom: space.sm }}>
          <Txt variant="h3" style={{ flexShrink: 1 }} numberOfLines={1}>
            {title}
          </Txt>
          <Pressable onPress={close} hitSlop={10}>
            <Ionicons name="close" size={22} color={C.inkSoft} />
          </Pressable>
        </Row>

        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: C.white,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: radius.md,
              paddingHorizontal: 12,
              height: 42,
            }}
          >
            <Ionicons name="search" size={17} color={C.inkSoft} />
            <TextInput
              value={q}
              onChangeText={(next) => {
                setQ(next);
                onSearch?.(next);
              }}
              placeholder={searchPlaceholder ?? t('pubX.browse.searchInList')}
              placeholderTextColor={C.inkSoft}
              style={{ flex: 1, fontSize: 14, color: C.ink, paddingVertical: 0 }}
            />
            {loading && <ActivityIndicator size="small" color={C.green} />}
          </View>
        </View>

        <FlatList
          data={visibleOptions}
          keyExtractor={(o) => o.value}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? null : (
              <Txt variant="small" color={C.inkSoft} style={{ padding: space.lg }}>
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
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingVertical: 13,
                  paddingHorizontal: space.lg,
                  borderBottomWidth: 1,
                  borderBottomColor: C.border,
                }}
              >
                <Txt style={{ flexShrink: 1, fontWeight: selected ? '700' : '400' }} numberOfLines={1}>
                  {item.label ?? item.value}
                </Txt>
                {selected && <Ionicons name="checkmark" size={18} color={C.green} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
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
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          height: 46,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <Txt style={{ flexShrink: 1, color: value ? C.ink : C.inkSoft }} numberOfLines={1}>
          {(value && (displayValue ?? value)) || placeholder || ''}
        </Txt>
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
      />
    </View>
  );
}
