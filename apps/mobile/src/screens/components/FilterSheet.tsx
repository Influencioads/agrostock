import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { ApiCategory, ApiMarket } from '@agrotraders/api-client';
import { getFilterFields } from '@agrotraders/types';
import { attrKey } from '@agrotraders/i18n';
import { api } from '../../lib/api';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { Button, Input, Sheet } from '../../ui';
import { useI18n } from '../../i18n';
import { CategorySheet } from './CategorySheet';
import type { CategorySelection } from './categorySelection';
import {
  EMPTY_FILTERS,
  FLAG_IDS,
  clearGroup,
  countActive,
  toggleAttr,
  type Filters,
} from './filterState';

/** The grade chips map to the free-text `grade` values products carry. */
const GRADES = ['premium', 'gradeA', 'organic', 'feed', 'milling'] as const;
const GRADE_VALUE: Record<(typeof GRADES)[number], string> = {
  premium: 'Premium',
  gradeA: 'Grade A',
  organic: 'Organic',
  feed: 'Feed',
  milling: 'Milling',
};

interface Group {
  id: string;
  label: string;
  /** Selected count, shown under the group name in the rail. */
  count: number;
}

/**
 * Full-screen, two-pane filter sheet: groups on the left, that group's options
 * on the right, CLEAR ALL / APPLY pinned at the bottom.
 *
 * Everything is edited as a DRAFT and handed back only on APPLY. The previous
 * inline filter stack re-ran the products query on every single tap; with a
 * draft, a user can set six facets and pay for one fetch.
 *
 * The two panes are laid out with `flexDirection: 'row'`, which React Native
 * mirrors automatically under RTL — so the rail correctly becomes the right
 * pane in Arabic and Persian with no extra work.
 */
export function FilterSheet({ visible, onClose, applied, onApply, categories }: {
  visible: boolean;
  onClose: () => void;
  /** The currently committed filters — the draft is seeded from these each open. */
  applied: Filters;
  onApply: (next: Filters) => void;
  categories: ApiCategory[];
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Filters>(applied);
  const [group, setGroup] = useState('category');
  const [catSheet, setCatSheet] = useState(false);
  const [optionSearch, setOptionSearch] = useState('');

  // Re-seed whenever the sheet reopens so an abandoned edit never leaks into
  // the next session.
  useEffect(() => {
    if (visible) {
      setDraft(applied);
      setOptionSearch('');
    }
  }, [visible, applied]);

  const { data: markets = [] } = useQuery<ApiMarket[]>({
    queryKey: ['markets'],
    queryFn: () => api.markets.list(),
    staleTime: 3600e3,
  });

  // Attribute facets for the chosen (sub)category. A deep pick resolves to its
  // nearest schema-bearing ancestor, so facets keep showing past level 2.
  const attrFields = useMemo(
    () => getFilterFields(draft.selection.categoryName, draft.selection.attrSource),
    [draft.selection.categoryName, draft.selection.attrSource],
  );

  const cityOptions = useMemo(
    () => Array.from(new Set(markets.map((m) => m.city).filter(Boolean))) as string[],
    [markets],
  );
  const countryOptions = useMemo(
    () => Array.from(new Set(markets.map((m) => m.country).filter(Boolean))) as string[],
    [markets],
  );

  // Facet labels come from the English schema; only the display is localized —
  // the value sent to the API stays canonical English.
  const aLabel = (s: string) => t(`attrs:label.${attrKey(s)}`, { defaultValue: s });
  const aOpt = (s: string) => t(`attrs:option.${attrKey(s)}`, { defaultValue: s });

  const groups: Group[] = [
    { id: 'category', label: t('pubX.filter.groups.category'), count: draft.selection.categoryId ? 1 : 0 },
    { id: 'dealType', label: t('pubX.filter.groups.dealType'), count: FLAG_IDS.filter((f) => draft.flags[f]).length },
    { id: 'price', label: t('pubX.filter.groups.price'), count: draft.minPrice || draft.maxPrice ? 1 : 0 },
    ...(countryOptions.length ? [{ id: 'country', label: t('pubX.filter.groups.country'), count: draft.country ? 1 : 0 }] : []),
    ...(cityOptions.length ? [{ id: 'city', label: t('pubX.filter.groups.city'), count: draft.city ? 1 : 0 }] : []),
    { id: 'grade', label: t('pubX.filter.groups.grade'), count: draft.grade ? 1 : 0 },
    ...(markets.length ? [{ id: 'market', label: t('pubX.filter.groups.market'), count: draft.market ? 1 : 0 }] : []),
    ...attrFields.map((f) => ({ id: f.key, label: aLabel(f.label), count: (draft.attrs[f.key] ?? []).length })),
  ];

  // A category change can retire the facet group currently in view.
  const activeGroup = groups.some((g) => g.id === group) ? group : 'category';

  const setSelection = (next: CategorySelection) => {
    // Attribute picks belong to the old category; they can't survive a change.
    setDraft((d) => ({ ...d, selection: next, attrs: {} }));
    setCatSheet(false);
  };

  const filterOptions = (opts: string[]) => {
    const needle = optionSearch.trim().toLowerCase();
    return needle ? opts.filter((o) => o.toLowerCase().includes(needle)) : opts;
  };

  /** A single-choice option list — picking the active value clears it. */
  const renderRadio = (options: { value: string; label: string }[], current: string, onPick: (v: string) => void, searchable = false) => (
    <>
      {searchable && options.length > 8 ? (
        <View style={s.optionSearch}>
          <Ionicons name="search" size={15} color={C.inkSoft} />
          <TextInput
            value={optionSearch}
            onChangeText={setOptionSearch}
            placeholder={t('pubX.filter.searchOptions')}
            placeholderTextColor={C.inkMuted}
            style={{ flex: 1, ...type.body, color: C.ink, paddingVertical: 0 }}
          />
        </View>
      ) : null}
      {options.map((o) => {
        const on = current === o.value;
        return (
          <Pressable key={o.value} onPress={() => onPick(on ? '' : o.value)} style={s.option}>
            <Ionicons
              name={on ? 'radio-button-on' : 'radio-button-off'}
              size={19}
              color={on ? C.green : C.inkSoft}
            />
            <Text numberOfLines={2} style={[s.optionLabel, on && s.optionLabelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </>
  );

  /** A multi-select option list backed by checkboxes. */
  const renderChecks = (options: { value: string; label: string }[], selected: string[], onToggle: (v: string) => void) =>
    options.map((o) => {
      const on = selected.includes(o.value);
      return (
        <Pressable key={o.value} onPress={() => onToggle(o.value)} style={s.option}>
          <Ionicons name={on ? 'checkbox' : 'square-outline'} size={19} color={on ? C.green : C.inkSoft} />
          <Text numberOfLines={2} style={[s.optionLabel, on && s.optionLabelOn]}>{o.label}</Text>
        </Pressable>
      );
    });

  function renderPane() {
    switch (activeGroup) {
      case 'category':
        return (
          <View style={{ padding: space.lg, gap: space.md }}>
            <Pressable onPress={() => setCatSheet(true)} style={s.catTrigger}>
              <Ionicons name="grid-outline" size={18} color={draft.selection.categoryId ? C.green : C.inkSoft} />
              <Text numberOfLines={2} style={{ ...type.title, flex: 1, color: draft.selection.categoryId ? C.ink : C.inkMuted }}>
                {draft.selection.categoryId
                  ? draft.selection.trail.join('  ›  ')
                  : t('pubX.browse.allCategories')}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={C.inkSoft} />
            </Pressable>
            <Text style={{ ...type.caption, color: C.inkMuted }}>{t('pubX.filter.categoryHint')}</Text>
          </View>
        );

      case 'dealType':
        return renderChecks(
          FLAG_IDS.map((f) => ({ value: f, label: t('pubX.browse.filter.' + f) })),
          FLAG_IDS.filter((f) => draft.flags[f]),
          (v) => setDraft((d) => ({ ...d, flags: { ...d.flags, [v]: !d.flags[v] } })),
        );

      case 'price':
        return (
          <View style={{ padding: space.lg, gap: space.md }}>
            <Input
              label={t('pubX.browse.minPrice')}
              value={draft.minPrice}
              onChangeText={(v) => setDraft((d) => ({ ...d, minPrice: v }))}
              keyboardType="numeric"
              placeholder="0"
            />
            <Input
              label={t('pubX.browse.maxPrice')}
              value={draft.maxPrice}
              onChangeText={(v) => setDraft((d) => ({ ...d, maxPrice: v }))}
              keyboardType="numeric"
              placeholder="—"
            />
          </View>
        );

      case 'country':
        return renderRadio(
          filterOptions(countryOptions).map((c) => ({ value: c, label: c })),
          draft.country,
          (v) => setDraft((d) => ({ ...d, country: v })),
          true,
        );

      case 'city':
        return renderRadio(
          filterOptions(cityOptions).map((c) => ({ value: c, label: c })),
          draft.city,
          (v) => setDraft((d) => ({ ...d, city: v })),
          true,
        );

      case 'grade':
        return renderRadio(
          GRADES.map((g) => ({ value: GRADE_VALUE[g], label: t(`pubX.browse.grades.${g}`) })),
          draft.grade,
          (v) => setDraft((d) => ({ ...d, grade: v })),
        );

      case 'market':
        return renderRadio(
          markets.map((m) => ({ value: m.slug, label: `${m.flag ?? ''} ${m.name}`.trim() })),
          draft.market,
          (v) => setDraft((d) => ({ ...d, market: v })),
          true,
        );

      default: {
        const field = attrFields.find((f) => f.key === activeGroup);
        if (!field) return null;
        const selected = draft.attrs[field.key] ?? [];
        // Booleans are a single "yes" checkbox rather than a two-value list.
        const options =
          field.type === 'boolean'
            ? [{ value: 'true', label: t('common:yes') }]
            : filterOptions(field.options ?? []).map((o) => ({ value: o, label: aOpt(o) }));
        return renderChecks(options, selected, (v) => setDraft((d) => toggleAttr(d, field.key, v)));
      }
    }
  }

  const activeCount = countActive(draft);

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        fullScreen
        scroll={false}
        title={t('pubX.filter.title')}
        footer={
          <>
            <View style={{ flex: 1 }}>
              <Button
                full
                title={t('pubX.filter.clearAll')}
                variant="outline"
                onPress={() => setDraft(EMPTY_FILTERS)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                full
                title={activeCount ? t('pubX.filter.applyN', { count: activeCount }) : t('pubX.filter.apply')}
                onPress={() => {
                  onApply(draft);
                  onClose();
                }}
              />
            </View>
          </>
        }
      >
        <View style={s.panes}>
          {/* Group rail. The fixed width lives on a wrapper View: a ScrollView
              inside a row flex container ignores its own `width` and grows. */}
          <View style={s.railWrap}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space.xl }}>
            {groups.map((g) => {
              const on = g.id === activeGroup;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => {
                    setGroup(g.id);
                    setOptionSearch('');
                  }}
                  style={[s.railItem, on && s.railItemOn]}
                >
                  <Text numberOfLines={2} style={[s.railLabel, on && s.railLabelOn]}>{g.label}</Text>
                  {g.count ? <View style={s.railDot}><Text style={s.railDotText}>{g.count}</Text></View> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          </View>

          {/* options for the selected group */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
            <View style={s.paneHead}>
              <Text style={[s.paneTitle, microLabel()]}>
                {groups.find((g) => g.id === activeGroup)?.label}
              </Text>
              <Pressable onPress={() => setDraft((d) => clearGroup(d, activeGroup))} hitSlop={8}>
                <Text style={[s.paneClear, microLabel()]}>{t('pubX.filter.clear')}</Text>
              </Pressable>
            </View>
            {renderPane()}
          </ScrollView>
        </View>
      </Sheet>

      {/* The 5-level drill-down is reused wholesale rather than flattened into
          the rail — the taxonomy is far too deep for a single list. */}
      <CategorySheet
        visible={catSheet}
        onClose={() => setCatSheet(false)}
        categories={categories}
        selection={draft.selection}
        onSelect={setSelection}
      />
    </>
  );
}

/** Compact single-choice sheet for the SORT half of the filter bar. */
export function SortSheet({ visible, onClose, options, value, onChange }: {
  visible: boolean;
  onClose: () => void;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('pubX.filter.sortBy')}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              onChange(o.id);
              onClose();
            }}
            style={s.option}
          >
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={19} color={on ? C.green : C.inkSoft} />
            <Text style={[s.optionLabel, on && s.optionLabelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const s = StyleSheet.create({
  panes: { flex: 1, flexDirection: 'row' },
  railWrap: {
    width: 138,
    backgroundColor: C.page,
    borderEndWidth: StyleSheet.hairlineWidth,
    borderEndColor: C.hairline,
  },
  railItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 15, paddingHorizontal: space.md },
  railItemOn: { backgroundColor: C.white },
  railLabel: { ...type.caption, color: C.inkMuted, flex: 1 },
  railLabelOn: { ...type.title, fontSize: 12.5, color: C.ink },
  railDot: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  railDotText: { color: C.white, ...type.micro, fontSize: 9, lineHeight: 11 },

  paneHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  paneTitle: { ...type.micro, color: C.inkMuted },
  paneClear: { ...type.micro, color: C.error, fontSize: 10.5 },

  option: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: space.lg },
  optionLabel: { ...type.body, color: C.ink, flex: 1 },
  optionLabelOn: { ...type.title },

  optionSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: radius.card,
    paddingHorizontal: 10,
    height: 38,
  },
  catTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    borderRadius: radius.card,
    padding: space.md,
  },
});
