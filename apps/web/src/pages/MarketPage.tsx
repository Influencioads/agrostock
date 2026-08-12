import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Badge, Button, Icon, Reveal } from '@agrotraders/ui';
import type { ApiCategory, ApiMarket, ApiSubcategory, ProductQuery } from '@agrotraders/api-client';
import { filterFields, optionLabel, type AttrField } from '@agrotraders/types';
import { ALL_COUNTRIES, countryLabel } from '@agrotraders/geo';
import { ProductCard } from '../components/site/ProductCard';
import {
  ActiveFilterChips,
  FilterCheckbox,
  FilterGroup,
  FilterOptionList,
  FilterPanel,
  type FilterChip,
  type FilterOption,
} from '../components/site/FilterPanel';
import { ErrorState } from '../components/ErrorState';
import { api, toCardProduct } from '../lib/api';
import { useFilterParams } from '../lib/filterParams';
import { browseAttrFields, buildSubcategoryTree, findSubcategoryPath, flattenSubcategoryTree, type SubcategoryNode } from '@agrotraders/api-client';
import { CityTagInput } from '../components/GeoInputs';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';

// The 5 grade chips map to the free-text `grade` values products actually carry.
const gradeOptions: { key: string; value: string }[] = [
  { key: 'premium', value: 'Premium' },
  { key: 'gradeA', value: 'Grade A' },
  { key: 'organic', value: 'Organic' },
  { key: 'feed', value: 'Feed' },
  { key: 'milling', value: 'Milling' },
];

/**
 * Deal type / price type / listing type are three checkbox groups whose boxes
 * are two sides of the same coin. Ticking BOTH boxes in a group has to be
 * expressible and has to mean "either" — which a tri-state `?safe=true|false`
 * could not say, so those groups carry their own multi-value param and are
 * translated to the API's booleans at query time.
 */
const DEAL_SAFE = 'safe';
const DEAL_DIRECT = 'direct';
const PRICING_NEGOTIABLE = 'negotiable';
const PRICING_FIXED = 'fixed';
const LISTING_OFFER = 'offer';
const LISTING_AUCTION = 'auction';

/**
 * A group of exactly two opposite boxes → the API's tri-state boolean.
 * Neither ticked and both ticked are the same query (no constraint); they are
 * different *states* only in the panel, which is the whole point.
 */
function eitherOr(values: string[], truthy: string, falsy: string): boolean | undefined {
  const yes = values.includes(truthy);
  const no = values.includes(falsy);
  if (yes === no) return undefined;
  return yes;
}

const PAGE_SIZE = 24;

/**
 * Deep links the site emitted before the panel became multi-select
 * (`?offer=true`, `?safe=false`, the header's auction shortcut) still arrive.
 * Fold them into the checkbox-group params once, on mount, so the panel has a
 * single source of truth per group instead of two that can disagree.
 */
function migrateLegacyParams(params: URLSearchParams): URLSearchParams | null {
  const legacy: [string, string, string][] = [
    ['safe', 'deal', DEAL_SAFE],
    ['negotiable', 'pricing', PRICING_NEGOTIABLE],
    ['offer', 'listing', LISTING_OFFER],
    ['auction', 'listing', LISTING_AUCTION],
  ];
  const opposite: Record<string, string> = { safe: DEAL_DIRECT, negotiable: PRICING_FIXED };
  const next = new URLSearchParams(params);
  let changed = false;
  for (const [oldKey, group, onValue] of legacy) {
    const raw = params.get(oldKey);
    if (raw !== 'true' && raw !== 'false') continue;
    // `?offer=false` was never meaningful — only the tri-states have an "off" side.
    const value = raw === 'true' ? onValue : opposite[oldKey];
    if (value) {
      const current = new Set((next.get(group) ?? '').split(',').filter(Boolean));
      current.add(value);
      next.set(group, [...current].join(','));
    }
    next.delete(oldKey);
    changed = true;
  }
  return changed ? next : null;
}

export function MarketPage() {
  const { t, lang } = useI18n();
  useDocumentTitle(t('page.market.title'));
  const { params, values, value, has, toggle, setValues, setValue, patch, replaceAll, clearAll, activeCount } =
    useFilterParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const migrated = migrateLegacyParams(params);
    if (migrated) replaceAll(migrated);
  }, [params, replaceAll]);

  // ── selections ────────────────────────────────────────────────────
  const categoryIds = values('categoryId');
  const marketSlugs = values('market');
  const countries = values('country');
  const cities = values('city');
  const supplyCountries = values('supplyCountry');
  const grades = values('grade');
  const deal = values('deal');
  const pricing = values('pricing');
  const listing = values('listing');
  const verified = has('verified', 'true');
  const subcategoryId = value('subcategoryId');
  const subcategory = value('subcategory');
  const search = value('search');
  const minPrice = value('minPrice');
  const maxPrice = value('maxPrice');
  const sort = value('sort') || 'relevance';
  const page = Math.max(1, Number(value('page')) || 1);

  // Attribute facets come from the English schema; only the display is localized
  // — the value sent to the API stays canonical English.
  const attrSelections = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [k, v] of params.entries()) {
      if (k.startsWith('attr_') && v) out[k.slice(5)] = v.split(',').filter(Boolean);
    }
    return out;
  }, [params]);

  // ── data ──────────────────────────────────────────────────────────
  const { data: catData = [] } = useQuery<ApiCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
    staleTime: 3600e3,
    retry: 1,
  });
  const { data: markets = [] } = useQuery<ApiMarket[]>({
    queryKey: ['markets'],
    queryFn: () => api.markets.list(),
    staleTime: 3600e3,
    retry: 1,
  });
  // Products behind a live ad campaign. They rank first on the default view AND
  // carry a visible "Sponsored" label (F30).
  const { data: promoted = [] } = useQuery({
    queryKey: ['ads', 'promoted'],
    queryFn: () => api.ads.promoted(24),
    retry: 1,
  });

  const query: ProductQuery = {
    categoryId: categoryIds.length ? categoryIds : undefined,
    subcategoryId: subcategoryId || undefined,
    subcategory: subcategory || undefined,
    market: marketSlugs.length ? marketSlugs : undefined,
    city: cities.length ? cities : undefined,
    country: countries.length ? countries : undefined,
    supplyCountry: supplyCountries.length ? supplyCountries : undefined,
    grade: grades.length ? grades : undefined,
    search: search.trim() || undefined,
    // The inputs are in whole dollars; the API filters on integer cents.
    minPrice: minPrice ? Math.round(Number(minPrice) * 100) : undefined,
    maxPrice: maxPrice ? Math.round(Number(maxPrice) * 100) : undefined,
    verified: verified || undefined,
    safe: eitherOr(deal, DEAL_SAFE, DEAL_DIRECT),
    negotiable: eitherOr(pricing, PRICING_NEGOTIABLE, PRICING_FIXED),
    // Ticking both ORs them server-side — "show me offers and auctions".
    offer: listing.includes(LISTING_OFFER) || undefined,
    auction: listing.includes(LISTING_AUCTION) || undefined,
    sort: sort === 'relevance' ? undefined : sort,
    attrs: Object.keys(attrSelections).length ? attrSelections : undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: ['products', query],
    queryFn: () => api.products.listPaged(query),
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const items = useMemo(() => (data?.items ?? []).map(toCardProduct), [data]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Only present when the taxonomy drill-down matched nothing — the API relaxes
  // one level at a time and hands back the nearest ancestor that has listings.
  const similar = useMemo(() => (data?.similar ?? []).map(toCardProduct), [data]);
  const similarFrom = data?.similarFrom;

  // Flag every promoted listing so the card shows a "Sponsored" disclosure, and
  // on the default view (no explicit sort) float those paid placements first.
  const list = useMemo(() => {
    if (!promoted.length) return items;
    const promotedKeys = new Set(promoted.flatMap((p) => [p.id, p.slug]).filter(Boolean));
    const flagged = items.map((p) => (promotedKeys.has(p.id) ? { ...p, sponsored: true } : p));
    if (sort !== 'relevance') return flagged;
    return [...flagged].sort((a, b) => Number(!!b.sponsored) - Number(!!a.sponsored));
  }, [items, promoted, sort]);

  // ── taxonomy ──────────────────────────────────────────────────────
  const selectedCategories = useMemo(
    () => catData.filter((c) => categoryIds.includes(c.id)),
    [catData, categoryIds],
  );
  /**
   * The subcategory drill-down needs ONE category to drill into — a tree with
   * two roots is not a drill-down. So it appears only while exactly one category
   * is ticked, and any change to the category selection drops the picks made
   * under the old one.
   */
  const drillCategory = selectedCategories.length === 1 ? selectedCategories[0] : null;

  // Attribute picks belong to a specific subcategory — drop them when it changes.
  const clearTaxonScopedParams = (next: URLSearchParams) => {
    next.delete('subcategoryId');
    next.delete('subcategory');
    for (const k of Array.from(next.keys())) if (k.startsWith('attr_')) next.delete(k);
  };
  const toggleCategory = (category: ApiCategory) => {
    patch((next) => {
      const nextIds = categoryIds.includes(category.id)
        ? categoryIds.filter((id) => id !== category.id)
        : [...categoryIds, category.id];
      if (nextIds.length) next.set('categoryId', nextIds.join(','));
      else next.delete('categoryId');
      // The `category` name twin only makes sense for a single pick (the API
      // prefers ids anyway); with several selected the ids alone are canonical.
      const names = catData.filter((c) => nextIds.includes(c.id)).map((c) => c.name);
      if (names.length) next.set('category', names.join(','));
      else next.delete('category');
      clearTaxonScopedParams(next);
      next.delete('page');
    });
  };
  const setSubcategory = (id: string | null) => {
    patch((next) => {
      const node = flatSubOptions.find((entry) => entry.node.id === id)?.node ?? null;
      clearTaxonScopedParams(next);
      if (node) {
        next.set('subcategoryId', node.id);
        next.set('subcategory', node.name);
      }
      next.delete('page');
    });
  };
  const toggleAttr = (key: string, attrValue: string) => toggle(`attr_${key}`, attrValue);

  // Type-ahead over the whole subtree. With five levels of taxonomy, drilling one
  // level at a time is fine when you know where you are going and painful when
  // you don't — this lets a buyer jump straight to "1121 Steam".
  const [subQuery, setSubQuery] = useState('');
  // `/categories` only ships one level down. Once a category is chosen, pull its
  // whole subtree so drill-down and the type-ahead can reach every level —
  // scoped to the one category the buyer is in, never all 24 at once.
  const { data: deepSubs } = useQuery<ApiSubcategory[]>({
    queryKey: ['category-subtree', drillCategory?.id],
    queryFn: () => api.categories.subtree(drillCategory!.id, { depth: 'all' }),
    enabled: Boolean(drillCategory?.id),
    staleTime: 5 * 60 * 1000,
  });
  const subOptions = useMemo(
    () => buildSubcategoryTree(deepSubs ?? drillCategory?.subcategories ?? []),
    [deepSubs, drillCategory?.subcategories],
  );
  const flatSubOptions = useMemo(() => flattenSubcategoryTree(subOptions), [subOptions]);
  const selectedSubcategory = useMemo(
    () => flatSubOptions.find(({ node }) => (subcategoryId ? node.id === subcategoryId : node.name === subcategory))?.node ?? null,
    [flatSubOptions, subcategoryId, subcategory],
  );
  const selectedSubcategoryPath = useMemo(() => {
    if (!selectedSubcategory) return [] as SubcategoryNode[];
    return findSubcategoryPath(subOptions, selectedSubcategory.id);
  }, [subOptions, selectedSubcategory]);
  const visibleSubOptions = selectedSubcategory ? selectedSubcategory.children : subOptions;
  const currentSubParent = selectedSubcategory ?? null;
  const parentSubcategory = selectedSubcategoryPath.length > 1 ? selectedSubcategoryPath[selectedSubcategoryPath.length - 2] : null;
  const goUpSubcategory = () => setSubcategory(parentSubcategory?.id ?? null);

  // Attribute facets for the current selection. Fields are attached to whichever
  // node owns them and inherited downward, so a deep pick resolves along its
  // path — otherwise drilling past the owning level would wipe the facet list.
  // Anything the path (or the drill-down list right above) already asks is left
  // out, so the same choice never appears as both a node and a checkbox.
  // Labels arrive localized from the API; option VALUES stay English because
  // they are what the `attr_*` query params carry and what products store.
  const attrFields = useMemo(
    () => filterFields(browseAttrFields(selectedSubcategoryPath, visibleSubOptions)),
    [selectedSubcategoryPath, visibleSubOptions],
  );

  const subMatches = useMemo(() => {
    const needle = subQuery.trim().toLowerCase();
    if (!needle) return [];
    return flatSubOptions
      .filter(({ node }) => node.name.toLowerCase().includes(needle))
      .slice(0, 40)
      .map(({ node }) => ({
        node,
        trail: findSubcategoryPath(subOptions, node.id).map((n) => n.name).join(' › '),
      }));
  }, [subQuery, flatSubOptions, subOptions]);

  // ── option lists ──────────────────────────────────────────────────
  const categoryOptions: FilterOption[] = useMemo(
    () => catData.map((c) => ({ value: c.id, label: c.name, emoji: c.emoji ?? undefined, count: c._count?.products ?? 0 })),
    [catData],
  );
  const marketOptions: FilterOption[] = useMemo(
    () => markets.map((m) => ({ value: m.slug, label: m.name, emoji: m.flag ?? undefined, hint: m.city ?? undefined })),
    [markets],
  );
  // Every country, not only the ones the current page happens to cover — an
  // empty result set used to leave the filter with nothing left to pick.
  const countryOptions: FilterOption[] = useMemo(
    () => ALL_COUNTRIES.map((c) => ({ value: c.name, label: countryLabel(c.name, lang), emoji: c.flag })),
    [lang],
  );
  const gradeOptionList: FilterOption[] = useMemo(
    () => gradeOptions.map((g) => ({ value: g.value, label: t(`page.market.grades.${g.key}`) })),
    [t],
  );

  const marketName = (slug: string) => markets.find((m) => m.slug === slug)?.name ?? slug;

  // ── chips ─────────────────────────────────────────────────────────
  const chips: FilterChip[] = useMemo(() => {
    const out: FilterChip[] = [];
    const pushAll = (
      key: string,
      selected: string[],
      tone: FilterChip['tone'],
      label: (v: string) => string,
    ) => {
      for (const v of selected) {
        out.push({ key: `${key}:${v}`, label: label(v), tone, onRemove: () => toggle(key, v) });
      }
    };
    if (search.trim()) {
      out.push({ key: 'search', label: `“${search.trim()}”`, tone: 'slate', onRemove: () => setValue('search', null) });
    }
    pushAll('categoryId', categoryIds, 'green', (id) => catData.find((c) => c.id === id)?.name ?? id);
    if (selectedSubcategory) {
      out.push({
        key: `subcategory:${selectedSubcategory.id}`,
        label: selectedSubcategory.name,
        tone: 'green',
        onRemove: () => setSubcategory(null),
      });
    }
    for (const f of attrFields) {
      for (const val of attrSelections[f.key] ?? []) {
        out.push({
          key: `attr_${f.key}:${val}`,
          label: f.type === 'boolean' ? f.label : optionLabel(f, val),
          tone: 'mango',
          onRemove: () => toggleAttr(f.key, val),
        });
      }
    }
    pushAll('market', marketSlugs, 'mango', marketName);
    pushAll('country', countries, 'mango', (c) => countryLabel(c, lang));
    pushAll('city', cities, 'mango', (c) => c);
    pushAll('supplyCountry', supplyCountries, 'mango', (c) => t('page.market.chipShipsTo', { country: countryLabel(c, lang) }));
    pushAll('grade', grades, 'slate', (g) => gradeOptionList.find((o) => o.value === g)?.label ?? g);
    if (minPrice || maxPrice) {
      out.push({
        key: 'price',
        label: `$${minPrice || '0'}–${maxPrice || '∞'}`,
        tone: 'slate',
        onRemove: () => patch((next) => { next.delete('minPrice'); next.delete('maxPrice'); next.delete('page'); }),
      });
    }
    pushAll('deal', deal, 'green', (v) => (v === DEAL_SAFE ? t('site.safeDeal') : t('site.directDeal')));
    pushAll('pricing', pricing, 'mango', (v) => (v === PRICING_NEGOTIABLE ? t('site.negotiable') : t('site.fixedPrice')));
    pushAll('listing', listing, 'mango', (v) =>
      v === LISTING_OFFER ? t('page.market.chipOffers') : t('page.market.chipAuctions'),
    );
    if (verified) {
      out.push({ key: 'verified', label: t('page.market.chipVerified'), tone: 'green', onRemove: () => setValue('verified', null) });
    }
    return out;
    // `toggleAttr`/`setSubcategory`/`marketName` are stable-enough closures over
    // the same params this already depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search, categoryIds, catData, selectedSubcategory, attrFields, attrSelections, marketSlugs, markets,
    countries, cities, supplyCountries, grades, minPrice, maxPrice, deal, pricing, listing, verified,
    gradeOptionList, lang, t, toggle, setValue, patch,
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:px-6">
      <div className="mb-5 sm:mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.market.title')}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
          {t('page.market.summary', { count: total })}
          <Badge tone={isError ? 'warn' : 'green'}>{isError ? t('page.market.offline') : t('page.market.live')}</Badge>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <FilterPanel id="market-filters" activeCount={activeCount} onClearAll={clearAll}>
          {/* search — not a group: it is the one field you type into, and
              hiding it behind a disclosure costs a click on every visit. */}
          <label className="mb-3 flex items-center gap-2 rounded-md border border-surface-border px-2.5">
            <Icon name="search" size={15} className="shrink-0 text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setValue('search', e.target.value || null)}
              placeholder={t('page.market.searchPlaceholder')}
              className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-soft"
            />
          </label>

          <FilterGroup title={t('page.market.category')} selectedCount={categoryIds.length}>
            <FilterOptionList
              options={categoryOptions}
              selected={categoryIds}
              onToggle={(id) => {
                const category = catData.find((c) => c.id === id);
                if (category) toggleCategory(category);
              }}
              searchable={categoryOptions.length > 12}
              searchPlaceholder={t('page.market.searchCategories')}
              initialLimit={10}
            />
          </FilterGroup>

          {/* subcategory — a drill-down, not a checkbox list: five levels of
              taxonomy do not flatten into boxes. Needs exactly one category. */}
          {drillCategory && flatSubOptions.length > 0 && (
            <FilterGroup title={t('page.market.subcategory')} selectedCount={selectedSubcategory ? 1 : 0}>
              <div className="flex items-center justify-end">
                {currentSubParent && (
                  <button
                    type="button"
                    onClick={goUpSubcategory}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-dark hover:text-brand"
                  >
                    <Icon name="chevronLeft" size={13} />
                    {t('page.market.back')}
                  </button>
                )}
              </div>
              {selectedSubcategoryPath.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1 text-xs text-ink-soft">
                  <button type="button" onClick={() => setSubcategory(null)} className="font-bold text-brand-dark hover:text-brand">
                    {drillCategory.name}
                  </button>
                  {selectedSubcategoryPath.map((node, index) => (
                    <span key={node.id} className="inline-flex items-center gap-1">
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() => setSubcategory(node.id)}
                        className={index === selectedSubcategoryPath.length - 1 ? 'font-bold text-ink' : 'font-bold text-brand-dark hover:text-brand'}
                      >
                        {node.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="search"
                value={subQuery}
                onChange={(e) => setSubQuery(e.target.value)}
                placeholder={t('page.market.searchSubcategories')}
                className="mb-2 h-9 w-full rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink placeholder:text-ink-soft"
              />
              <div className="overflow-hidden rounded-md border border-surface-border bg-white">
                {subQuery.trim() ? (
                  subMatches.length === 0 ? (
                    <div className="px-2.5 py-3 text-xs text-ink-soft">{t('page.market.noSubcategoryMatch')}</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto p-1.5">
                      {subMatches.map(({ node, trail }) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => {
                            setSubcategory(node.id);
                            setSubQuery('');
                          }}
                          className="flex min-h-9 w-full flex-col items-start rounded-md px-2.5 py-2 text-start transition hover:bg-brand-surface/60"
                        >
                          <span className="w-full truncate text-sm text-ink">{node.name}</span>
                          <span className="w-full truncate text-[11px] text-ink-soft">{trail}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSubcategory(currentSubParent?.id ?? null)}
                      className="flex min-h-9 w-full items-center gap-2 border-b border-surface-border px-2.5 py-2 text-start text-sm font-bold text-brand-dark hover:bg-brand-surface/60"
                    >
                      <Icon name="check" size={14} />
                      <span className="min-w-0 flex-1 truncate">
                        {currentSubParent
                          ? `${t('hero.allOf')} ${currentSubParent.name}`
                          : `${t('hero.allOf')} ${drillCategory.name}`}
                      </span>
                    </button>
                    {visibleSubOptions.length === 0 ? (
                      <div className="px-2.5 py-3 text-xs text-ink-soft">{t('page.market.noChildCategories')}</div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto p-1.5">
                        {visibleSubOptions.map((node) => {
                          const active = selectedSubcategory?.id === node.id;
                          return (
                            <button
                              key={node.id}
                              type="button"
                              onClick={() => setSubcategory(node.id)}
                              aria-current={active}
                              className={
                                'flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm transition ' +
                                (active ? 'bg-brand-surface font-bold text-brand-dark' : 'text-ink hover:bg-brand-surface/60')
                              }
                            >
                              <span className="min-w-0 flex-1 truncate">{node.emoji ? `${node.emoji} ` : ''}{node.name}</span>
                              {node.children.length > 0 && <Icon name="chevronRight" size={14} className="text-ink-soft/60" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </FilterGroup>
          )}

          {/* Category/subcategory-specific attribute facets — moisture, packing,
              origin, whatever the taxonomy node defines. */}
          {attrFields.map((f: AttrField) => {
            const selected = attrSelections[f.key] ?? [];
            // Boolean facet: a single on/off box keyed to "true".
            if (f.type === 'boolean') {
              return (
                <FilterGroup key={f.key} title={f.label} selectedCount={selected.length}>
                  <FilterCheckbox
                    checked={selected.includes('true')}
                    onChange={() => toggleAttr(f.key, 'true')}
                    label={f.label}
                  />
                </FilterGroup>
              );
            }
            return (
              <FilterGroup key={f.key} title={f.label} selectedCount={selected.length}>
                <FilterOptionList
                  options={(f.options ?? []).map((opt) => ({ value: opt, label: optionLabel(f, opt) }))}
                  selected={selected}
                  onToggle={(opt) => toggleAttr(f.key, opt)}
                  searchable={(f.options ?? []).length > 12}
                />
              </FilterGroup>
            );
          })}

          <FilterGroup title={t('page.market.market')} selectedCount={marketSlugs.length} defaultOpen={false}>
            <FilterOptionList
              options={marketOptions}
              selected={marketSlugs}
              onToggle={(slug) => toggle('market', slug)}
              searchable={marketOptions.length > 8}
              searchPlaceholder={t('page.market.searchMarkets')}
            />
          </FilterGroup>

          <FilterGroup title={t('page.market.country')} selectedCount={countries.length} defaultOpen={false}>
            <FilterOptionList
              options={countryOptions}
              selected={countries}
              onToggle={(name) => toggle('country', name)}
              searchable
              searchPlaceholder={t('page.market.searchCountries')}
            />
          </FilterGroup>

          <FilterGroup title={t('page.market.city')} selectedCount={cities.length} defaultOpen={false}>
            {/* The one facet with no closed option set: the geo dataset runs to
                tens of thousands of places and listings carry free text besides.
                So cities are ADDED by type-ahead and removed by their own chip,
                and — like every other facet — they surface above the results. */}
            <CityTagInput
              value={cities}
              onChange={(next) => setValues('city', next)}
              // Scoped to the selected country when there is exactly one;
              // unscoped the search spans every country, so it still works alone.
              country={countries.length === 1 ? countries[0] : null}
              placeholder={t('page.market.addCity')}
            />
          </FilterGroup>

          <FilterGroup title={t('page.market.shipsTo')} selectedCount={supplyCountries.length} defaultOpen={false}>
            <FilterOptionList
              options={countryOptions}
              selected={supplyCountries}
              onToggle={(name) => toggle('supplyCountry', name)}
              searchable
              searchPlaceholder={t('page.market.searchCountries')}
            />
          </FilterGroup>

          <FilterGroup title={t('page.market.priceRange')} selectedCount={minPrice || maxPrice ? 1 : 0}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={minPrice}
                onChange={(e) => setValue('minPrice', e.target.value || null)}
                placeholder={t('page.market.min')}
                aria-label={t('page.market.min')}
                className="h-9 w-full min-w-0 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
              />
              <span className="text-ink-soft">–</span>
              <input
                type="text"
                inputMode="decimal"
                value={maxPrice}
                onChange={(e) => setValue('maxPrice', e.target.value || null)}
                placeholder={t('page.market.max')}
                aria-label={t('page.market.max')}
                className="h-9 w-full min-w-0 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
              />
            </div>
          </FilterGroup>

          <FilterGroup title={t('page.market.grade')} selectedCount={grades.length}>
            <FilterOptionList options={gradeOptionList} selected={grades} onToggle={(g) => toggle('grade', g)} />
          </FilterGroup>

          <FilterGroup title={t('page.market.dealType')} selectedCount={deal.length}>
            <FilterCheckbox checked={deal.includes(DEAL_SAFE)} onChange={() => toggle('deal', DEAL_SAFE)} label={t('site.safeDeal')} />
            <FilterCheckbox checked={deal.includes(DEAL_DIRECT)} onChange={() => toggle('deal', DEAL_DIRECT)} label={t('site.directDeal')} />
          </FilterGroup>

          <FilterGroup title={t('page.market.priceType')} selectedCount={pricing.length}>
            <FilterCheckbox checked={pricing.includes(PRICING_NEGOTIABLE)} onChange={() => toggle('pricing', PRICING_NEGOTIABLE)} label={t('site.negotiable')} />
            <FilterCheckbox checked={pricing.includes(PRICING_FIXED)} onChange={() => toggle('pricing', PRICING_FIXED)} label={t('site.fixedPrice')} />
          </FilterGroup>

          <FilterGroup title={t('page.market.listingType')} selectedCount={listing.length}>
            <FilterCheckbox checked={listing.includes(LISTING_OFFER)} onChange={() => toggle('listing', LISTING_OFFER)} label={t('page.market.toggles.offers')} />
            <FilterCheckbox checked={listing.includes(LISTING_AUCTION)} onChange={() => toggle('listing', LISTING_AUCTION)} label={t('page.market.toggles.auctions')} />
          </FilterGroup>

          <FilterGroup title={t('page.market.seller')} selectedCount={verified ? 1 : 0}>
            <FilterCheckbox
              checked={verified}
              onChange={() => setValue('verified', verified ? null : 'true')}
              label={t('page.market.toggles.verified')}
            />
          </FilterGroup>
        </FilterPanel>

        {/* results */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <ActiveFilterChips chips={chips} onClearAll={clearAll} />
            <div className="ms-auto flex shrink-0 items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setValue('sort', e.target.value === 'relevance' ? null : e.target.value)}
                aria-label={t('page.market.sortRelevance')}
                className="h-9 max-w-[10rem] rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
              >
                <option value="relevance">{t('page.market.sortRelevance')}</option>
                <option value="price_asc">{t('page.market.priceAsc')}</option>
                <option value="price_desc">{t('page.market.priceDesc')}</option>
                <option value="rating">{t('page.market.rating')}</option>
              </select>
              <div className="flex rounded-md border border-surface-border">
                <button
                  onClick={() => setView('grid')}
                  aria-label={t('page.market.gridView')}
                  aria-pressed={view === 'grid'}
                  className={'flex h-9 w-9 items-center justify-center ' + (view === 'grid' ? 'text-brand' : 'text-ink-soft')}
                >
                  <Icon name="grid" size={16} />
                </button>
                <button
                  onClick={() => setView('list')}
                  aria-label={t('page.market.listView')}
                  aria-pressed={view === 'list'}
                  className={'flex h-9 w-9 items-center justify-center ' + (view === 'list' ? 'text-brand' : 'text-ink-soft')}
                >
                  <Icon name="menu" size={16} />
                </button>
              </div>
            </div>
          </div>

          {isError && list.length === 0 ? (
            // F28: a failed fetch is an error with retry, not "no matches".
            <ErrorState onRetry={() => refetch()} />
          ) : isPending ? (
            // WEB-03: on first load `data` is undefined, so the empty branch below
            // used to flash "Nothing matches — clear filters" before any response
            // arrived. Show skeleton cards while the first page is in flight.
            <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-4'}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-lg border border-surface-border bg-surface-muted" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <>
              <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-ink-soft sm:p-12">
                <p className="font-semibold text-ink">{t('page.market.notAvailable')}</p>
                <p className="mt-1 text-sm">
                  {similarFrom ? t('page.market.notAvailableAt', { name: selectedSubcategory?.name ?? '' }) : t('page.market.noMatch')}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {parentSubcategory && (
                    <Button variant="outline" size="sm" onClick={goUpSubcategory}>
                      {t('hero.allOf')} {parentSubcategory.name}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    {t('page.market.clearFilters')}
                  </Button>
                </div>
              </div>

              {/* The drill-down found nothing, but the branch above it did. Show
                  that rather than a dead end — a seller who listed at "Almond"
                  is still the right answer for a buyer who drilled to a count. */}
              {similar.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-4 font-display text-lg font-extrabold text-ink">
                    {t('page.market.similarHeading', { name: similarFrom?.name ?? '' })}
                  </h2>
                  <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-4'}>
                    {similar.map((p, i) => (
                      <Reveal key={p.id} delay={(i % 6) * 0.05}>
                        <ProductCard p={p} />
                      </Reveal>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-4'}>
                {list.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 6) * 0.05}>
                    <ProductCard p={p} />
                  </Reveal>
                ))}
              </div>

              {pageCount > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setValue('page', String(page - 1))}
                  >
                    {t('page.market.prev')}
                  </Button>
                  <span className="text-sm text-ink-soft">{t('page.market.pageOf', { page, total: pageCount })}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount || isFetching}
                    onClick={() => setValue('page', String(page + 1))}
                  >
                    {t('page.market.next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
