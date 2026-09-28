import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Icon } from '@agrotraders/ui';
import {
  browseAttrFields,
  buildSubcategoryTree,
  findSubcategoryPath,
  flattenSubcategoryTree,
  resolveAttrFields,
  SYMBOLS,
  type ApiCategory,
  type ApiFacetOption,
  type ApiSubcategory,
  type SubcategoryNode,
} from '@agrotraders/api-client';
import { FilterCheckbox, FilterGroup, FilterOptionList, type FilterChip, type FilterOption } from './FilterPanel';
import { api } from '../../lib/api';
import { splitValues, useDebouncedParam, type FilterParams } from '../../lib/filterParams';
import {
  clearTaxonScopedParams,
  DEAL_DIRECT,
  DEAL_SAFE,
  LISTING_AUCTION,
  LISTING_OFFER,
  PRICING_FIXED,
  PRICING_NEGOTIABLE,
  parsePrice,
  productQueryFromParams,
} from '../../lib/marketQuery';
import { useCurrency } from '../../currency/CurrencyContext';
import { useI18n } from '../../i18n';

/**
 * The marketplace filter, shared by /market (bound to the URL) and the home
 * hero (bound to a local draft that becomes the /market URL on apply). One
 * component and one query builder, so the hero can never offer a filter the
 * market page does not honour, or count an option differently.
 *
 * EVERY option in this panel comes from `GET /products/facets`, counted against
 * the live catalog. Nothing is hardcoded and nothing is capped.
 *
 * It used to be the opposite. Grade was five literals, so a seller who typed
 * "Sortex Clean" had a listing no filter could reach. Country and "ships to"
 * were the 250-entry static geo dataset, so a country the catalog spells
 * differently was equally unreachable — while 240 countries with nothing behind
 * them padded the list. City had no options at all, only a type-ahead over a
 * reference dataset that knows nothing about what is listed.
 */

// Straight through — the API already ordered these by count and localized the
// labels. No slicing, no client-side option invention.
const toOptions = (rows: ApiFacetOption[] | undefined): FilterOption[] =>
  (rows ?? []).map((o) => ({ value: o.value, label: o.label, emoji: o.emoji, hint: o.hint, count: o.count }));

/**
 * A selection the current facet response has not caught up with yet still
 * renders, so a ticked box never vanishes mid-request.
 */
const withSelected = (options: FilterOption[], selected: string[]): FilterOption[] => {
  const known = new Set(options.map((o) => o.value));
  const missing = selected.filter((v) => !known.has(v)).map((value) => ({ value, label: value, count: 0 }));
  return missing.length ? [...options, ...missing] : options;
};

const labelOf = (options: FilterOption[], value: string) => options.find((o) => o.value === value)?.label ?? value;

export type MarketFilters = ReturnType<typeof useMarketFilters>;

/**
 * Everything the panel, the chips and the results need from one filter state:
 * the API query, its facets, the taxonomy drill-down and the chip row.
 */
export function useMarketFilters(state: FilterParams) {
  const { t } = useI18n();
  const { rate, currency } = useCurrency();
  const { params, values, value, has, toggle, setValue, patch } = state;

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

  const attrSelections = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [k, v] of params.entries()) {
      if (k.startsWith('attr_') && v) out[k.slice(5)] = splitValues(v);
    }
    return out;
  }, [params]);

  // ── data ──────────────────────────────────────────────────────────
  const query = useMemo(() => productQueryFromParams(params, rate), [params, rate]);
  // The panel's entire option set, counted against the same query the grid
  // runs. `sort` is stripped: ordering cannot change which options exist, and
  // including it would refetch every facet on a re-sort.
  const facetQuery = useMemo(() => ({ ...query, sort: undefined }), [query]);
  const { data: facets, isPlaceholderData: facetsStale } = useQuery({
    queryKey: ['product-facets', facetQuery],
    queryFn: () => api.products.facets(facetQuery),
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const { data: catData = [] } = useQuery<ApiCategory[]>({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
    staleTime: 3600e3,
    retry: 1,
  });

  // ── taxonomy ──────────────────────────────────────────────────────
  const selectedCategories = catData.filter((c) => categoryIds.includes(c.id));
  /**
   * The subcategory drill-down needs ONE category to drill into — a tree with
   * two roots is not a drill-down. So it appears only while exactly one category
   * is ticked, and any change to the category selection drops the picks made
   * under the old one.
   */
  const drillCategory = selectedCategories.length === 1 ? selectedCategories[0] : null;
  // `/categories` only ships one level down. Once a category is chosen, pull its
  // whole subtree so drill-down and the type-ahead can reach every level —
  // scoped to the one category the buyer is in, never all 24 at once.
  const { data: deepSubs } = useQuery<ApiSubcategory[]>({
    queryKey: ['category-subtree', drillCategory?.id],
    queryFn: () => api.categories.subtree(drillCategory!.id, { depth: 'all' }),
    enabled: Boolean(drillCategory?.id),
    staleTime: 5 * 60 * 1000,
  });
  const subTree = useMemo(
    () => buildSubcategoryTree(deepSubs ?? drillCategory?.subcategories ?? []),
    [deepSubs, drillCategory?.subcategories],
  );
  const flatSubOptions = useMemo(() => flattenSubcategoryTree(subTree), [subTree]);
  const selectedSubcategory = useMemo(
    () => flatSubOptions.find(({ node }) => (subcategoryId ? node.id === subcategoryId : node.name === subcategory))?.node ?? null,
    [flatSubOptions, subcategoryId, subcategory],
  );
  const selectedSubcategoryPath = useMemo(
    () => (selectedSubcategory ? findSubcategoryPath(subTree, selectedSubcategory.id) : ([] as SubcategoryNode[])),
    [subTree, selectedSubcategory],
  );
  const parentSubcategory =
    selectedSubcategoryPath.length > 1 ? selectedSubcategoryPath[selectedSubcategoryPath.length - 2] : null;

  // Branch-inclusive: a node's count is exactly what selecting it returns, and
  // a node absent from the facet has nothing anywhere below it. Unknown (not 0)
  // until THIS query's facets land — the previous query's, kept on screen while
  // loading, were counted under another selection and would dim on a guess.
  const branchCounts = useMemo(
    () => new Map((facets?.subcategories ?? []).map((s) => [s.value, s.count])),
    [facets],
  );
  const branchCount = (id: string) => (facets && !facetsStale ? branchCounts.get(id) ?? 0 : undefined);

  /**
   * Attribute facets for the current selection, resolved and counted
   * server-side; each option carries how many listings hold it, and values the
   * schema has since retired come back too. Labels arrive localized; option
   * VALUES stay canonical English because they are what `attr_*` carries.
   *
   * Minus whatever the node's children already ask (`browseAttrFields`): at
   * "Nonpareil kernels" the children ARE the counts, and a count facet beside
   * them is the same question twice. Only when the client holds the node's
   * field schema — without it there is nothing to compare, and hiding the
   * server's list would hide every filter. A field with a pick always shows,
   * so a filter in force is never invisible.
   */
  const browseKeys = useMemo(() => {
    if (!selectedSubcategory || !resolveAttrFields(selectedSubcategoryPath).length) return null;
    return new Set(browseAttrFields(selectedSubcategoryPath, selectedSubcategory.children).map((f) => f.key));
  }, [selectedSubcategory, selectedSubcategoryPath]);
  const attrFields = (facets?.attributes ?? []).filter(
    (f) => !browseKeys || browseKeys.has(f.key) || (attrSelections[f.key]?.length ?? 0) > 0,
  );

  // ── writes ────────────────────────────────────────────────────────
  const writeCategories = (next: URLSearchParams, ids: string[]) => {
    if (ids.length) next.set('categoryId', ids.join(','));
    else next.delete('categoryId');
    // The `category` name twin only makes sense for a single pick (the API
    // prefers ids anyway); with several selected the ids alone are canonical.
    const names = catData.filter((c) => ids.includes(c.id)).map((c) => c.name);
    if (names.length) next.set('category', names.join(','));
    else next.delete('category');
    clearTaxonScopedParams(next);
    next.delete('page');
  };
  const toggleCategory = (id: string) =>
    patch((next) => writeCategories(next, categoryIds.includes(id) ? categoryIds.filter((c) => c !== id) : [...categoryIds, id]));
  /** Pick one node anywhere in the taxonomy, replacing the whole taxonomy selection. */
  const selectTaxon = (category: ApiCategory | null, node: SubcategoryNode | null = null) =>
    patch((next) => {
      writeCategories(next, category ? [category.id] : []);
      if (node) {
        next.set('subcategoryId', node.id);
        next.set('subcategory', node.name);
      }
    });
  const setSubcategory = (id: string | null) =>
    patch((next) => {
      const node = flatSubOptions.find((entry) => entry.node.id === id)?.node ?? null;
      clearTaxonScopedParams(next);
      if (node) {
        next.set('subcategoryId', node.id);
        next.set('subcategory', node.name);
      }
      next.delete('page');
    });
  const goUpSubcategory = () => setSubcategory(parentSubcategory?.id ?? null);
  const toggleAttr = (key: string, attrValue: string) => toggle(`attr_${key}`, attrValue);

  // ── option lists ──────────────────────────────────────────────────
  const options = {
    categories: withSelected(toOptions(facets?.categories), categoryIds),
    markets: withSelected(toOptions(facets?.markets), marketSlugs),
    countries: withSelected(toOptions(facets?.countries), countries),
    cities: withSelected(toOptions(facets?.cities), cities),
    supplyCountries: withSelected(toOptions(facets?.supplyCountries), supplyCountries),
    grades: withSelected(toOptions(facets?.grades), grades),
  };

  // ── chips ─────────────────────────────────────────────────────────
  const chips: FilterChip[] = [];
  const pushAll = (key: string, selected: string[], tone: FilterChip['tone'], label: (v: string) => string) => {
    for (const v of selected) chips.push({ key: `${key}:${v}`, label: label(v), tone, onRemove: () => toggle(key, v) });
  };
  if (search.trim()) {
    chips.push({ key: 'search', label: `“${search.trim()}”`, tone: 'slate', onRemove: () => setValue('search', null) });
  }
  // Removing a category goes through the same path as unticking it, so its
  // name twin, the subcategory under it and that node's attributes go too —
  // the generic toggle left all three filtering a grid with no box ticked.
  for (const id of categoryIds) {
    chips.push({ key: `categoryId:${id}`, label: labelOf(options.categories, id), tone: 'green', onRemove: () => toggleCategory(id) });
  }
  if (selectedSubcategory) {
    chips.push({
      key: `subcategory:${selectedSubcategory.id}`,
      label: selectedSubcategory.name,
      tone: 'green',
      onRemove: () => setSubcategory(null),
    });
  }
  for (const [key, picked] of Object.entries(attrSelections)) {
    const field = attrFields.find((f) => f.key === key);
    for (const val of picked) {
      chips.push({
        key: `attr_${key}:${val}`,
        label: !field ? val : field.type === 'boolean' ? field.label : labelOf(toOptions(field.options), val),
        tone: 'mango',
        onRemove: () => toggleAttr(key, val),
      });
    }
  }
  pushAll('market', marketSlugs, 'mango', (s) => labelOf(options.markets, s));
  pushAll('country', countries, 'mango', (c) => labelOf(options.countries, c));
  pushAll('city', cities, 'mango', (c) => labelOf(options.cities, c));
  pushAll('supplyCountry', supplyCountries, 'mango', (c) =>
    t('page.market.chipShipsTo', { country: labelOf(options.supplyCountries, c) }),
  );
  pushAll('grade', grades, 'slate', (g) => labelOf(options.grades, g));
  // Only the bounds the query actually applies — a junk "abc" is dropped from
  // the query, so a chip for it would claim a filter that is not filtering.
  // A valid bound is echoed as typed ("1,000"), in the buyer's own notation.
  const minShown = parsePrice(minPrice) === undefined ? '' : minPrice.trim();
  const maxShown = parsePrice(maxPrice) === undefined ? '' : maxPrice.trim();
  if (minShown || maxShown) {
    const sym = SYMBOLS[currency] ?? `${currency} `;
    chips.push({
      key: 'price',
      // Both bounds carry the symbol; "$268–2140" reads like a bare number.
      label: `${sym}${minShown || '0'}–${maxShown ? sym + maxShown : '∞'}`,
      tone: 'slate',
      onRemove: () => patch((next) => { next.delete('minPrice'); next.delete('maxPrice'); next.delete('page'); }),
    });
  }
  pushAll('deal', deal, 'green', (v) => (v === DEAL_SAFE ? t('site.safeDeal') : t('site.directDeal')));
  pushAll('pricing', pricing, 'mango', (v) => (v === PRICING_NEGOTIABLE ? t('site.negotiable') : t('site.fixedPrice')));
  pushAll('listing', listing, 'mango', (v) => (v === LISTING_OFFER ? t('page.market.chipOffers') : t('page.market.chipAuctions')));
  if (verified) {
    chips.push({ key: 'verified', label: t('page.market.chipVerified'), tone: 'green', onRemove: () => setValue('verified', null) });
  }

  return {
    state,
    query,
    facets,
    // True while `facets` is still the previous selection's response.
    facetsStale,
    catData,
    selections: { categoryIds, marketSlugs, countries, cities, supplyCountries, grades, deal, pricing, listing, verified },
    attrSelections,
    attrFields,
    options,
    selectedCategories,
    drillCategory,
    subTree,
    flatSubOptions,
    selectedSubcategory,
    selectedSubcategoryPath,
    parentSubcategory,
    branchCount,
    toggleCategory,
    selectTaxon,
    setSubcategory,
    goUpSubcategory,
    toggleAttr,
    chips,
  };
}

/** Relevance / price / rating — shared by the results header and the hero drawer. */
export function SortSelect({ state, className = '' }: { state: FilterParams; className?: string }) {
  const { t } = useI18n();
  const sort = state.value('sort') || 'relevance';
  return (
    <select
      value={sort}
      onChange={(e) => state.setValue('sort', e.target.value === 'relevance' ? null : e.target.value)}
      aria-label={t('page.market.sortBy')}
      className={'h-9 rounded-md border border-surface-border bg-white px-2 text-sm text-ink ' + className}
    >
      <option value="relevance">{t('page.market.sortRelevance')}</option>
      <option value="price_asc">{t('page.market.priceAsc')}</option>
      <option value="price_desc">{t('page.market.priceDesc')}</option>
      <option value="rating">{t('page.market.rating')}</option>
    </select>
  );
}

/** A taxonomy row's listing count, dimmed at zero like the checkbox lists. */
function BranchCount({ count }: { count: number | undefined }) {
  return count == null ? null : <span className="shrink-0 text-xs font-normal text-ink-soft">{count}</span>;
}

/** The complete panel body, minus the free-text search (each host places that itself). */
export function MarketFilterFields({ filters }: { filters: MarketFilters }) {
  const { t } = useI18n();
  const { currency } = useCurrency();
  const {
    state, facets, selections, attrSelections, attrFields, options, drillCategory, subTree, flatSubOptions,
    selectedSubcategory, selectedSubcategoryPath, branchCount, toggleCategory, setSubcategory, goUpSubcategory, toggleAttr,
  } = filters;
  const { toggle, setValue } = state;
  const { categoryIds, marketSlugs, countries, cities, supplyCountries, grades, deal, pricing, listing, verified } = selections;
  const [minPrice, setMinPrice, flushMinPrice] = useDebouncedParam(state, 'minPrice');
  const [maxPrice, setMaxPrice, flushMaxPrice] = useDebouncedParam(state, 'maxPrice');

  // Type-ahead over the whole subtree. With five levels of taxonomy, drilling one
  // level at a time is fine when you know where you are going and painful when
  // you don't — this lets a buyer jump straight to "1121 Steam".
  const [subQuery, setSubQuery] = useState('');
  // Every match, not the first 40 — the cap silently hid the tail of a search on
  // a 13k-node taxonomy, which reads as "that subcategory doesn't exist".
  const subMatches = useMemo(() => {
    const needle = subQuery.trim().toLowerCase();
    if (!needle) return [];
    return flatSubOptions
      .filter(({ node }) => node.name.toLowerCase().includes(needle))
      .map(({ node }) => ({ node, trail: findSubcategoryPath(subTree, node.id).map((n) => n.name).join(' › ') }));
  }, [subQuery, flatSubOptions, subTree]);
  const visibleSubOptions = selectedSubcategory ? selectedSubcategory.children : subTree;
  // Empty branches stay pickable — the results page answers them with similar
  // listings — but read as empty before the click, not after.
  const dim = (count: number | undefined) => (count === 0 ? ' opacity-55' : '');

  return (
    <>
      <FilterGroup title={t('page.market.category')} selectedCount={categoryIds.length}>
        <FilterOptionList
          options={options.categories}
          selected={categoryIds}
          onToggle={toggleCategory}
          searchable={options.categories.length > 12}
          searchPlaceholder={t('page.market.searchCategories')}
          initialLimit={12}
        />
      </FilterGroup>

      {/* subcategory — a drill-down, not a checkbox list: five levels of
          taxonomy do not flatten into boxes. Needs exactly one category. */}
      {drillCategory && flatSubOptions.length > 0 && (
        <FilterGroup title={t('page.market.subcategory')} selectedCount={selectedSubcategory ? 1 : 0}>
          <div className="flex items-center justify-end">
            {selectedSubcategory && (
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
                      className={'flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-start transition hover:bg-brand-surface/60' + dim(branchCount(node.id))}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{node.name}</span>
                        <span className="block truncate text-[11px] text-ink-soft">{trail}</span>
                      </span>
                      <BranchCount count={branchCount(node.id)} />
                    </button>
                  ))}
                </div>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSubcategory(selectedSubcategory?.id ?? null)}
                  className="flex min-h-9 w-full items-center gap-2 border-b border-surface-border px-2.5 py-2 text-start text-sm font-bold text-brand-dark hover:bg-brand-surface/60"
                >
                  <Icon name="check" size={14} />
                  <span className="min-w-0 flex-1 truncate">
                    {`${t('hero.allOf')} ${selectedSubcategory ? selectedSubcategory.name : drillCategory.name}`}
                  </span>
                </button>
                {visibleSubOptions.length === 0 ? (
                  <div className="px-2.5 py-3 text-xs text-ink-soft">{t('page.market.noChildCategories')}</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {visibleSubOptions.map((node) => {
                      const active = selectedSubcategory?.id === node.id;
                      const count = branchCount(node.id);
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setSubcategory(node.id)}
                          aria-current={active}
                          className={
                            'flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm transition ' +
                            (active ? 'bg-brand-surface font-bold text-brand-dark' : 'text-ink hover:bg-brand-surface/60') +
                            dim(count)
                          }
                        >
                          <span className="min-w-0 flex-1 truncate">{node.emoji ? `${node.emoji} ` : ''}{node.name}</span>
                          <BranchCount count={count} />
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

      {/* Category/subcategory-specific attribute facets — processing, size,
          variety, whatever the taxonomy node defines. Both the fields and
          their options come from the API, counted. */}
      {attrFields.map((f) => {
        const selected = attrSelections[f.key] ?? [];
        // Boolean facet: two boxes, so "no" is as askable as "yes". One
        // hardcoded "true" box could only ever express half the question.
        const fieldOptions =
          f.type === 'boolean'
            ? f.options.map((o) => ({ value: o.value, label: o.value === 'true' ? t('vehicle.yes') : t('page.market.no'), count: o.count }))
            : toOptions(f.options);
        return (
          <FilterGroup key={f.key} title={f.label} selectedCount={selected.length}>
            <FilterOptionList
              options={fieldOptions}
              selected={selected}
              onToggle={(opt) => toggleAttr(f.key, opt)}
              searchable={f.options.length > 12}
            />
          </FilterGroup>
        );
      })}

      <FilterGroup title={t('page.market.market')} selectedCount={marketSlugs.length} defaultOpen={false}>
        <FilterOptionList
          options={options.markets}
          selected={marketSlugs}
          onToggle={(slug) => toggle('market', slug)}
          searchable={options.markets.length > 8}
          searchPlaceholder={t('page.market.searchMarkets')}
        />
      </FilterGroup>

      <FilterGroup title={t('page.market.country')} selectedCount={countries.length} defaultOpen={false}>
        <FilterOptionList
          options={options.countries}
          selected={countries}
          onToggle={(name) => toggle('country', name)}
          searchable
          searchPlaceholder={t('page.market.searchCountries')}
        />
      </FilterGroup>

      {/* Cities the catalog actually lists in — not the geo reference set.
          The type-ahead over /geo/cities offered places nothing was listed
          in, while a city a seller typed that the dataset spells differently
          could never be ticked at all. */}
      <FilterGroup title={t('page.market.city')} selectedCount={cities.length} defaultOpen={false}>
        <FilterOptionList
          options={options.cities}
          selected={cities}
          onToggle={(name) => toggle('city', name)}
          searchable
          searchPlaceholder={t('page.market.searchCities')}
        />
      </FilterGroup>

      <FilterGroup title={t('page.market.shipsTo')} selectedCount={supplyCountries.length} defaultOpen={false}>
        <FilterOptionList
          options={options.supplyCountries}
          selected={supplyCountries}
          onToggle={(name) => toggle('supplyCountry', name)}
          searchable
          searchPlaceholder={t('page.market.searchCountries')}
        />
      </FilterGroup>

      {/* Counted from the query, not the box: a junk bound is not filtering. */}
      <FilterGroup
        title={t('page.market.priceRange', { currency })}
        selectedCount={filters.query.minPrice !== undefined || filters.query.maxPrice !== undefined ? 1 : 0}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={flushMinPrice}
            placeholder={t('page.market.min')}
            aria-label={t('page.market.min')}
            className="h-9 w-full min-w-0 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
          />
          <span className="text-ink-soft">–</span>
          <input
            type="text"
            inputMode="decimal"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={flushMaxPrice}
            placeholder={t('page.market.max')}
            aria-label={t('page.market.max')}
            className="h-9 w-full min-w-0 rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
          />
        </div>
      </FilterGroup>

      <FilterGroup title={t('page.market.grade')} selectedCount={grades.length}>
        <FilterOptionList options={options.grades} selected={grades} onToggle={(g) => toggle('grade', g)} />
      </FilterGroup>

      {/* The on/off groups carry counts too, each measured without its own
          constraint — so "Safe Deal 412 / Direct deal 38" is visible before
          you commit to the click. */}
      <FilterGroup title={t('page.market.dealType')} selectedCount={deal.length}>
        <FilterCheckbox checked={deal.includes(DEAL_SAFE)} onChange={() => toggle('deal', DEAL_SAFE)} label={t('site.safeDeal')} count={facets?.flags.safe} />
        <FilterCheckbox checked={deal.includes(DEAL_DIRECT)} onChange={() => toggle('deal', DEAL_DIRECT)} label={t('site.directDeal')} count={facets?.flags.direct} />
      </FilterGroup>

      <FilterGroup title={t('page.market.priceType')} selectedCount={pricing.length}>
        <FilterCheckbox checked={pricing.includes(PRICING_NEGOTIABLE)} onChange={() => toggle('pricing', PRICING_NEGOTIABLE)} label={t('site.negotiable')} count={facets?.flags.negotiable} />
        <FilterCheckbox checked={pricing.includes(PRICING_FIXED)} onChange={() => toggle('pricing', PRICING_FIXED)} label={t('site.fixedPrice')} count={facets?.flags.fixed} />
      </FilterGroup>

      <FilterGroup title={t('page.market.listingType')} selectedCount={listing.length}>
        <FilterCheckbox checked={listing.includes(LISTING_OFFER)} onChange={() => toggle('listing', LISTING_OFFER)} label={t('page.market.toggles.offers')} count={facets?.flags.offer} />
        <FilterCheckbox checked={listing.includes(LISTING_AUCTION)} onChange={() => toggle('listing', LISTING_AUCTION)} label={t('page.market.toggles.auctions')} count={facets?.flags.auction} />
      </FilterGroup>

      <FilterGroup title={t('page.market.seller')} selectedCount={verified ? 1 : 0}>
        <FilterCheckbox
          checked={verified}
          onChange={() => setValue('verified', verified ? null : 'true')}
          label={t('page.market.toggles.verified')}
          count={facets?.flags.verified}
        />
      </FilterGroup>
    </>
  );
}
