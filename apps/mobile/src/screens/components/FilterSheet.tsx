import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SYMBOLS, type ApiCategory } from '@agrotraders/api-client';
import { countryLabel } from '@agrotraders/geo';
import { filterFields, optionLabel, type AttrField } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useCurrency } from '../../currency/CurrencyContext';
import { C, radius, space, type } from '../../theme/tokens';
import { microLabel } from '../../theme/casing';
import { Button, Input, Sheet } from '../../ui';
import { useI18n } from '../../i18n';
import { CategorySheet } from './CategorySheet';
import type { CategorySelection } from './categorySelection';
import {
  ATTR_PREFIX,
  EMPTY_FILTERS,
  FLAG_GROUPS,
  clearGroup,
  countActive,
  toQuery,
  toggleAttr,
  toggleValue,
  type FlagGroup,
  type Filters,
  type ListGroup,
} from './filterState';

interface Group {
  id: string;
  label: string;
  /** Selected count, shown under the group name in the rail. */
  count: number;
}

/** One tickable row. `count` is listings with every OTHER group applied; absent until counted. */
interface Opt {
  value: string;
  label: string;
  count?: number;
}

/** Value lists in rail order: quality first, then where it is, then where it goes. */
const LIST_ORDER: ListGroup[] = ['grade', 'country', 'city', 'market', 'supplyCountry'];

/** Settle time before a draft edit refetches the counts — typing a price is several edits. */
const COUNT_DEBOUNCE_MS = 250;

/**
 * The first attribute question the buyer has not answered yet, as a rail id —
 * so picking "Almond" lands on "Processing: raw / roasted" rather than back on
 * the category they just chose.
 */
const nextQuestion = (f: Filters) => {
  const field = filterFields(f.selection.attrFields).find((a) => !f.attrs[a.key]?.length);
  return field ? ATTR_PREFIX + field.key : 'category';
};

/**
 * Keeps a ticked value visible after the other filters counted it out, so it
 * can still be unticked.
 */
const withSelected = (opts: Opt[], selected: string[], label: (v: string) => string = (v) => v): Opt[] => [
  ...opts,
  ...selected.filter((v) => !opts.some((o) => o.value === v)).map((v) => ({ value: v, label: label(v), count: 0 })),
];

/**
 * Full-screen, two-pane filter sheet: groups on the left, that group's options
 * on the right, CLEAR ALL / SHOW N RESULTS pinned at the bottom.
 *
 * Everything is edited as a DRAFT and handed back only on APPLY. The previous
 * inline filter stack re-ran the products query on every single tap; with a
 * draft, a user can set six facets and pay for one fetch.
 *
 * Every option and every count comes from `/products/facets` for the draft —
 * the same query the grid will run — so what is offered is what the catalog
 * holds, and "Show N results" is the number the grid will show.
 *
 * The two panes are laid out with `flexDirection: 'row'`, which React Native
 * mirrors automatically under RTL — so the rail correctly becomes the right
 * pane in Arabic and Persian with no extra work.
 */
export function FilterSheet({
  visible, onClose, applied, onApply, categories, categoriesError, onRetryCategories, search = '', pickCategory = false,
}: {
  visible: boolean;
  /** Handed the draft, so a caller that composes a query (the home hero) can keep it. */
  onClose: (draft: Filters) => void;
  /** The currently committed filters — the draft is seeded from these each open. */
  applied: Filters;
  onApply: (next: Filters) => void;
  categories: ApiCategory[];
  /** Passed straight through to the picker — see `CategorySheet`. */
  categoriesError?: boolean;
  onRetryCategories?: () => void;
  /** The search text the grid runs with, so the counts include it. */
  search?: string;
  /** Open straight onto the category picker (the home hero's category box). */
  pickCategory?: boolean;
}) {
  const { t, lang } = useI18n();
  const { rate, displayCurrency } = useCurrency();
  const [draft, setDraft] = useState<Filters>(applied);
  const [group, setGroup] = useState('category');
  const [catSheet, setCatSheet] = useState(false);
  const [optionSearch, setOptionSearch] = useState('');

  // Re-seed whenever the sheet reopens so an abandoned edit never leaks into
  // the next session.
  useEffect(() => {
    if (visible) {
      setDraft(applied);
      setGroup(nextQuestion(applied));
      setOptionSearch('');
      // Opening is not an edit, so it skips the debounce: otherwise the first
      // 250 ms show the LAST session's counts, and a quick tap applies a query
      // whose result count differs from the label it pressed.
      setCountQuery(toQuery(applied, search, undefined, rate));
    }
    // search/rate only seed the counts; a change to them must not wipe the draft.
  }, [visible, applied]); // eslint-disable-line react-hooks/exhaustive-deps

  const facetQuery = useMemo(() => toQuery(draft, search, undefined, rate), [draft, search, rate]);
  const [countQuery, setCountQuery] = useState(facetQuery);
  useEffect(() => {
    const id = setTimeout(() => setCountQuery(facetQuery), COUNT_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [facetQuery]);
  const { data: facets } = useQuery({
    queryKey: ['product-facets', countQuery],
    queryFn: () => api.products.facets(countQuery),
    enabled: visible,
    placeholderData: keepPreviousData,
    staleTime: 30e3,
  });

  // The attribute questions for the chosen node: the browse facets the picker
  // resolved (path and children rules applied), answered with the options the
  // API counted. A field on only one side is either not filterable here or not
  // one the API filters by, so it is not offered.
  // A boolean field's options come back labelled with the raw "true"/"false".
  const attrLabel = useCallback(
    (field: AttrField, v: string) =>
      field.type === 'boolean' ? t(v === 'true' ? 'common:yes' : 'common:no') : optionLabel(field, v),
    [t],
  );
  const attrGroups = useMemo(
    () =>
      filterFields(draft.selection.attrFields).flatMap((field: AttrField) => {
        const counted = facets?.attributes.find((a) => a.key === field.key);
        if (!counted) return [];
        const options: Opt[] =
          field.type === 'boolean' ? counted.options.map((o) => ({ ...o, label: attrLabel(field, o.value) })) : counted.options;
        return [{ field, options }];
      }),
    [draft.selection.attrFields, facets, attrLabel],
  );

  const countryName = (v: string) => countryLabel(v, lang);
  const lists: Record<ListGroup, Opt[] | undefined> = {
    grade: facets?.grades,
    country: facets?.countries.map((o) => ({ ...o, label: countryName(o.value) })),
    city: facets?.cities,
    market: facets?.markets.map((o) => ({ ...o, label: o.emoji ? `${o.emoji} ${o.label}` : o.label })),
    supplyCountry: facets?.supplyCountries.map((o) => ({ ...o, label: countryName(o.value) })),
  };

  const groups: Group[] = [
    { id: 'category', label: t('pubX.filter.groups.category'), count: draft.selection.categoryId ? 1 : 0 },
    ...attrGroups.map(({ field }) => ({
      id: ATTR_PREFIX + field.key,
      label: field.label,
      count: (draft.attrs[field.key] ?? []).length,
    })),
    // A list the catalog has nothing for is noise — unless something in it is
    // still ticked, which must stay removable.
    ...LIST_ORDER.filter((g) => !facets || (lists[g]?.length ?? 0) > 0 || draft[g].length > 0).map((g) => ({
      id: g,
      label: t('pubX.filter.groups.' + g),
      count: draft[g].length,
    })),
    { id: 'price', label: t('pubX.filter.groups.price'), count: draft.minPrice || draft.maxPrice ? 1 : 0 },
    ...(Object.keys(FLAG_GROUPS) as FlagGroup[]).map((g) => ({
      id: g,
      label: t('pubX.filter.groups.' + g),
      count: FLAG_GROUPS[g].filter((id) => draft.flags[id]).length,
    })),
  ];

  // A category change can retire the facet group currently in view, and the
  // attribute groups only exist once their counts arrive.
  const activeGroup = groups.some((g) => g.id === group) ? group : 'category';

  const setSelection = (next: CategorySelection) => {
    // Attribute picks belong to the old category; they can't survive a change.
    const nextDraft = { ...draft, selection: next, attrs: {} };
    setDraft(nextDraft);
    setGroup(nextQuestion(nextDraft));
    setCatSheet(false);
  };

  /** A multi-select option list backed by checkboxes, with its listing counts. */
  const renderChecks = (options: Opt[], selected: string[], onToggle: (v: string) => void) => {
    const needle = optionSearch.trim().toLowerCase();
    const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
    return (
      <>
        {options.length > 8 ? (
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
        {options.length === 0 ? (
          <Text style={s.remoteHint}>{facets ? t('pubX.filter.noOptions') : t('common:loading')}</Text>
        ) : null}
        {shown.map((o) => {
          const on = selected.includes(o.value);
          return (
            <Pressable
              key={o.value}
              onPress={() => onToggle(o.value)}
              // Zero stays tickable, as on web — it is only zero under the OTHER filters.
              style={[s.option, o.count === 0 && !on && s.optionDim]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={19} color={on ? C.green : C.inkSoft} />
              <Text numberOfLines={2} style={[s.optionLabel, on && s.optionLabelOn]}>{o.label}</Text>
              {o.count != null ? <Text style={s.optionCount}>{o.count}</Text> : null}
            </Pressable>
          );
        })}
      </>
    );
  };

  function renderPane() {
    if (activeGroup === 'category') {
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
    }

    if (activeGroup === 'price') {
      // Typed in the currency the cards are priced in; `toQuery` converts.
      const unit = SYMBOLS[displayCurrency] ?? displayCurrency;
      return (
        <View style={{ padding: space.lg, gap: space.md }}>
          <Input
            label={`${t('pubX.browse.minPrice')}, ${unit}`}
            value={draft.minPrice}
            onChangeText={(v) => setDraft((d) => ({ ...d, minPrice: v }))}
            keyboardType="numeric"
            placeholder="0"
          />
          <Input
            label={`${t('pubX.browse.maxPrice')}, ${unit}`}
            value={draft.maxPrice}
            onChangeText={(v) => setDraft((d) => ({ ...d, maxPrice: v }))}
            keyboardType="numeric"
            placeholder="—"
          />
        </View>
      );
    }

    if (activeGroup in FLAG_GROUPS) {
      const ids = FLAG_GROUPS[activeGroup as FlagGroup];
      return renderChecks(
        ids.map((id) => ({ value: id, label: t('pubX.browse.filter.' + id), count: facets?.flags[id] })),
        ids.filter((id) => draft.flags[id]),
        (v) => setDraft((d) => ({ ...d, flags: { ...d.flags, [v]: !d.flags[v] } })),
      );
    }

    if (activeGroup.startsWith(ATTR_PREFIX)) {
      const entry = attrGroups.find((a) => ATTR_PREFIX + a.field.key === activeGroup);
      if (!entry) return null;
      const { field, options } = entry;
      const selected = draft.attrs[field.key] ?? [];
      // Values stay canonical English — they are what the API filters on.
      return renderChecks(
        withSelected(options, selected, (v) => attrLabel(field, v)),
        selected,
        (v) => setDraft((d) => toggleAttr(d, field.key, v)),
      );
    }

    const g = activeGroup as ListGroup;
    return renderChecks(
      withSelected(lists[g] ?? [], draft[g], g === 'country' || g === 'supplyCountry' ? countryName : undefined),
      draft[g],
      (v) => setDraft((d) => toggleValue(d, g, v)),
    );
  }

  const activeCount = countActive(draft);
  const total = facets?.total;
  const applyLabel =
    total == null
      ? activeCount ? t('pubX.filter.applyN', { count: activeCount }) : t('pubX.filter.apply')
      // Zero is not a dead end: the grid falls back to the closest listings.
      : total > 0 ? t('pubX.filter.showN', { count: total }) : t('pubX.filter.showSimilar');
  const close = () => onClose(draft);

  return (
    <>
      <Sheet
        visible={visible}
        onClose={close}
        onShow={() => pickCategory && setCatSheet(true)}
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
                onPress={() => {
                  setDraft(EMPTY_FILTERS);
                  setGroup('category');
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                full
                title={applyLabel}
                onPress={() => {
                  onApply(draft);
                  close();
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

        {/* The 5-level drill-down is reused wholesale rather than flattened into
            the rail — the taxonomy is far too deep for a single list.

            It has to render INSIDE this sheet, not beside it. An iOS <Modal>
            presents from the nearest UIViewController above it in the view
            hierarchy: as a sibling it resolved to the Browse screen's
            controller, which is already presenting this sheet, so UIKit refused
            the second presentation outright — the picker never opened and every
            tap on the category row looked dead. Nested, it presents from the
            filter sheet's own controller, which is presenting nothing. Android
            stacks dialogs either way, which is why this only ever showed on iOS.
            The modal host view is absolutely positioned, so it costs the
            two-pane row no layout. `pickCategory` opens it from `onShow` for
            the same reason: only once this sheet has finished presenting. */}
        <CategorySheet
          visible={catSheet}
          onClose={() => setCatSheet(false)}
          categories={categories}
          categoriesError={categoriesError}
          onRetryCategories={onRetryCategories}
          selection={draft.selection}
          onSelect={setSelection}
          browse={{ query: facetQuery }}
        />
      </Sheet>
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
  optionDim: { opacity: 0.45 },
  optionCount: { ...type.caption, color: C.inkMuted },

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
  remoteHint: { ...type.caption, color: C.inkMuted, marginHorizontal: space.lg, marginBottom: space.sm },
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
