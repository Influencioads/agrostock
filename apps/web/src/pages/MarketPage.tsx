import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Badge, Button, Icon, Reveal } from '@agrotraders/ui';
import type { ApiCategory, ApiMarket, ApiSubcategory, ProductQuery } from '@agrotraders/api-client';
import { filterFields, optionLabel, type AttrField } from '@agrotraders/types';
import { ProductCard } from '../components/site/ProductCard';
import { ErrorState } from '../components/ErrorState';
import { api, toCardProduct } from '../lib/api';
import { browseAttrFields, buildSubcategoryTree, findSubcategoryPath, flattenSubcategoryTree, type SubcategoryNode } from '@agrotraders/api-client';
import { CountrySelect } from '@agrotraders/ui/ProductForm';
import { CityInput } from '../components/GeoInputs';
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
// `safe` moved out of the on/off toggles: "direct deal only" is a real buyer
// intent, and an unchecked box could never express it.
const toggleKeys = ['verified', 'offers', 'auctions'] as const;
// URL param name per toggle (the header deep-links use ?offer=/?auction=).
const toggleParam: Record<(typeof toggleKeys)[number], string> = {
  verified: 'verified',
  offers: 'offer',
  auctions: 'auction',
};
const PAGE_SIZE = 24;

export function MarketPage() {
  const { t } = useI18n();
  useDocumentTitle(t('page.market.title'));
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  // Below `lg` the filter panel is collapsed by default. Rendered inline it is
  // several screens tall, which pushed the actual products off the bottom of a
  // phone — the page looked empty until you scrolled past every facet.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Every filter lives in the URL so views are deep-linkable and shareable.
  const categoryId = params.get('categoryId') ?? '';
  const category = params.get('category') ?? '';
  const subcategoryId = params.get('subcategoryId') ?? '';
  const subcategory = params.get('subcategory') ?? '';
  const market = params.get('market') ?? '';
  const city = params.get('city') ?? '';
  const country = params.get('country') ?? '';
  const grade = params.get('grade') ?? '';
  const search = params.get('search') ?? '';
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const sort = params.get('sort') ?? 'relevance';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const flag = (name: string) => params.get(name) === 'true';
  // Tri-state: '' = any, 'true'/'false' = one side only.
  const safe = params.get('safe') ?? '';
  const negotiable = params.get('negotiable') ?? '';
  const triState = (v: string) => (v === '' ? undefined : v === 'true');

  // Writing any filter resets to page 1; changing the page itself does not.
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  // Badge on the collapsed mobile "Filters" button, so an active filter is never
  // hidden behind a closed panel. `sort`/`page` are not filters; the paired
  // `*Id` params are counted once alongside their human-readable twin.
  const activeFilterCount = useMemo(() => {
    let n = 0;
    for (const [k, v] of params.entries()) {
      if (!v || k === 'sort' || k === 'page' || k === 'categoryId' || k === 'subcategoryId') continue;
      n += k.startsWith('attr_') ? v.split(',').filter(Boolean).length : 1;
    }
    return n;
  }, [params]);

  // Filter facets come from the English schema; only the display is localized —
  // the value sent to the API stays canonical English.
  const attrSelections = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [k, v] of params.entries()) {
      if (k.startsWith('attr_') && v) out[k.slice(5)] = v.split(',').filter(Boolean);
    }
    return out;
  }, [params]);

  // Attribute picks belong to a specific subcategory — drop them when it changes.
  const clearAttrParams = (next: URLSearchParams) => {
    for (const k of Array.from(next.keys())) if (k.startsWith('attr_')) next.delete(k);
  };
  const setCategory = (nextCategory: ApiCategory | null) => {
    const next = new URLSearchParams(params);
    if (nextCategory) {
      next.set('categoryId', nextCategory.id);
      next.set('category', nextCategory.name);
    } else {
      next.delete('categoryId');
      next.delete('category');
    }
    next.delete('subcategoryId');
    next.delete('subcategory');
    clearAttrParams(next);
    next.delete('page');
    setParams(next, { replace: true });
  };
  const setSubcategory = (id: string | null) => {
    const next = new URLSearchParams(params);
    const node = flatSubOptions.find((entry) => entry.node.id === id)?.node ?? null;
    if (node) {
      next.set('subcategoryId', node.id);
      next.set('subcategory', node.name);
    } else {
      next.delete('subcategoryId');
      next.delete('subcategory');
    }
    clearAttrParams(next);
    next.delete('page');
    setParams(next, { replace: true });
  };
  const toggleAttr = (key: string, value: string) => {
    const cur = attrSelections[key] ?? [];
    const nextVals = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    setParam(`attr_${key}`, nextVals.length ? nextVals.join(',') : null);
  };

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
    categoryId: categoryId || undefined,
    category: category || undefined,
    subcategoryId: subcategoryId || undefined,
    subcategory: subcategory || undefined,
    market: market || undefined,
    city: city || undefined,
    country: country || undefined,
    grade: grade || undefined,
    search: search.trim() || undefined,
    // The inputs are in whole dollars; the API filters on integer cents.
    minPrice: minPrice ? Math.round(Number(minPrice) * 100) : undefined,
    maxPrice: maxPrice ? Math.round(Number(maxPrice) * 100) : undefined,
    verified: flag('verified') || undefined,
    safe: triState(safe),
    negotiable: triState(negotiable),
    offer: flag('offer') || undefined,
    auction: flag('auction') || undefined,
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

  // Type-ahead over the whole subtree. With five levels of taxonomy, drilling one
  // level at a time is fine when you know where you are going and painful when
  // you don't — this lets a buyer jump straight to "1121 Steam".
  const [subQuery, setSubQuery] = useState('');
  const selectedCategory = useMemo(
    () => catData.find((c) => (categoryId ? c.id === categoryId : c.name === category)) ?? null,
    [catData, categoryId, category],
  );
  // `/categories` only ships one level down. Once a category is chosen, pull its
  // whole subtree so drill-down and the type-ahead can reach every level —
  // scoped to the one category the buyer is in, never all 24 at once.
  const { data: deepSubs } = useQuery<ApiSubcategory[]>({
    queryKey: ['category-subtree', selectedCategory?.id],
    queryFn: () => api.categories.subtree(selectedCategory!.id, { depth: 'all' }),
    enabled: Boolean(selectedCategory?.id),
    staleTime: 5 * 60 * 1000,
  });
  const subOptions = useMemo(
    () => buildSubcategoryTree(deepSubs ?? selectedCategory?.subcategories ?? []),
    [deepSubs, selectedCategory?.subcategories],
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
  // out, so the same choice never appears as both a node and a chip.
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
  const marketName = (slug: string) => markets.find((m) => m.slug === slug)?.name ?? slug;
  const inputCls = 'mt-2 h-9 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:px-6">
      <div className="mb-5 sm:mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{t('page.market.title')}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
          {t('page.market.summary', { count: total })}
          <Badge tone={isError ? 'warn' : 'green'}>{isError ? t('page.market.offline') : t('page.market.live')}</Badge>
        </p>
      </div>

      {/* Mobile-only disclosure for the filter panel. */}
      <Button
        variant="outline"
        fullWidth
        className="mb-4 justify-between lg:hidden"
        aria-expanded={filtersOpen}
        aria-controls="market-filters"
        onClick={() => setFiltersOpen((v) => !v)}
        leftIcon={<Icon name="filter" size={16} />}
        rightIcon={<Icon name="chevronDown" size={16} className={filtersOpen ? 'rotate-180 transition' : 'transition'} />}
      >
        {t('page.market.filters')}
        {activeFilterCount > 0 && (
          <span className="rounded-pill bg-brand px-2 py-0.5 text-xs font-bold text-white">{activeFilterCount}</span>
        )}
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]">
        {/* filters */}
        <aside
          id="market-filters"
          className={
            'h-fit rounded-lg border border-surface-border bg-white p-4 shadow-card sm:p-5 lg:block ' +
            (filtersOpen ? 'block' : 'hidden')
          }
        >
          <div className="flex items-center gap-2 font-display font-bold text-ink">
            <Icon name="filter" size={18} /> {t('page.market.filters')}
          </div>

          {/* search */}
          <label className="mt-4 flex items-center gap-2 rounded-md border border-surface-border px-2.5">
            <Icon name="search" size={15} className="text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setParam('search', e.target.value || null)}
              placeholder={t('page.market.searchPlaceholder')}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft"
            />
          </label>

          {/* category (single-select) */}
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('page.market.category')}</p>
            <div className="mt-2 space-y-1.5">
              {/* "Any" leads every level of the drill-down, category included —
                  the specific choices sit under it. */}
              <button
                type="button"
                onClick={() => setCategory(null)}
                aria-current={!selectedCategory}
                className={
                  'flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm transition ' +
                  (!selectedCategory ? 'bg-brand-surface font-bold text-brand-dark' : 'text-ink hover:bg-brand-surface/60')
                }
              >
                <Icon name="check" size={14} className={selectedCategory ? 'opacity-0' : ''} />
                <span className="min-w-0 flex-1 truncate">{t('page.market.allCategories')}</span>
              </button>
              {catData.map((c) => {
                const active = selectedCategory?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(active ? null : c)}
                    aria-current={active}
                    className={
                      'flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm transition ' +
                      (active ? 'bg-brand-surface font-bold text-brand-dark' : 'text-ink hover:bg-brand-surface/60')
                    }
                  >
                    <span className="min-w-0 flex-1 truncate">{c.emoji} {c.name}</span>
                    <span className="text-xs text-ink-soft">{c._count?.products ?? 0}</span>
                    {active && <Icon name="chevronRight" size={14} className="text-brand-dark" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* subcategory — only once a category with children is chosen */}
          {selectedCategory && flatSubOptions.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('page.market.subcategory')}</p>
                {currentSubParent && (
                  <button
                    type="button"
                    onClick={goUpSubcategory}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-dark hover:text-brand"
                  >
                    <Icon name="chevronLeft" size={13} />
                    Back
                  </button>
                )}
              </div>
              {selectedSubcategoryPath.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 text-xs text-ink-soft">
                  <button type="button" onClick={() => setSubcategory(null)} className="font-bold text-brand-dark hover:text-brand">
                    {selectedCategory.name}
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
                className="mt-2 h-9 w-full rounded-md border border-surface-border bg-white px-2.5 text-sm text-ink placeholder:text-ink-soft"
              />
              <div className="mt-2 overflow-hidden rounded-md border border-surface-border bg-white">
                {subQuery.trim() ? (
                  subMatches.length === 0 ? (
                    <div className="px-2.5 py-3 text-xs text-ink-soft">
                      {t('page.market.noSubcategoryMatch')}
                    </div>
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
                      : `${t('hero.allOf')} ${selectedCategory.name}`}
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
            </div>
          )}

          {/* category/subcategory-specific attribute facets */}
          {attrFields.length > 0 && (
            <div className="mt-5 space-y-4 border-t border-surface-border pt-4">
              {attrFields.map((f: AttrField) => {
                const selected = attrSelections[f.key] ?? [];
                // Boolean facet: a single on/off checkbox keyed to "true".
                if (f.type === 'boolean') {
                  return (
                    <label key={f.key} className="flex cursor-pointer items-center justify-between text-sm text-ink">
                      {f.label}
                      <input
                        type="checkbox"
                        checked={selected.includes('true')}
                        onChange={() => toggleAttr(f.key, 'true')}
                        className="accent-[#249653]"
                      />
                    </label>
                  );
                }
                // select / multiselect: pick any number of option chips (OR-ed).
                return (
                  <div key={f.key}>
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{f.label}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(f.options ?? []).map((opt) => {
                        const active = selected.includes(opt);
                        return (
                          <button key={opt} type="button" onClick={() => toggleAttr(f.key, opt)}>
                            <Badge tone={active ? 'green' : 'slate'}>{optionLabel(f, opt)}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* market */}
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('page.market.market')}</p>
            <select value={market} onChange={(e) => setParam('market', e.target.value || null)} className={inputCls}>
              <option value="">{t('page.market.allMarkets')}</option>
              {markets.map((m) => (
                // Name FIRST: a native select jumps to the option starting with
                // the letter you type, and a leading flag emoji made that
                // impossible — "f" never reached "Food City". City disambiguates
                // the many markets sharing a name.
                <option key={m.id} value={m.slug}>{m.name}{m.city ? ` · ${m.city}` : ''} {m.flag}</option>
              ))}
            </select>
          </div>

          {/* Country first, then city inside it — both TYPEABLE, not just
              dropdowns. The plain selects only jumped to the letter you pressed,
              which is unusable at 200 countries, and the city list was limited to
              the cities the loaded markets happened to cover. */}
          <div className="mt-5">
            <CountrySelect
              label={t('page.market.country')}
              value={country}
              placeholder={t('page.market.allCountries')}
              // A city belongs to its country, so changing it invalidates the pick.
              onChange={(next) => { setParam('country', next || null); setParam('city', null); }}
            />
          </div>

          <div className="mt-5">
            <CityInput
              label={t('page.market.city')}
              value={city}
              country={country || null}
              // Debounced through the URL like every other filter; typing a place
              // that isn't in the dataset still searches for it verbatim.
              onChange={(next) => setParam('city', next || null)}
            />
          </div>

          {/* price range (whole dollars) */}
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('page.market.priceRange')}</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                min={0}
                value={minPrice}
                onChange={(e) => setParam('minPrice', e.target.value || null)}
                placeholder={t('page.market.min')}
                className="h-9 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
              />
              <span className="text-ink-soft">–</span>
              <input
                type="text"
                inputMode="decimal"
                min={0}
                value={maxPrice}
                onChange={(e) => setParam('maxPrice', e.target.value || null)}
                placeholder={t('page.market.max')}
                className="h-9 w-full rounded-md border border-surface-border bg-white px-2 text-sm text-ink"
              />
            </div>
          </div>

          {/* grade (single-select) */}
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('page.market.grade')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {gradeOptions.map((g) => {
                const active = grade === g.value;
                return (
                  <button key={g.key} onClick={() => setParam('grade', active ? null : g.value)}>
                    <Badge tone={active ? 'green' : 'slate'}>{t(`page.market.grades.${g.key}`)}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* deal type + price type — both directions are selectable, so a buyer
              can ask for direct/fixed listings and not just their opposites */}
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('page.market.dealType')}</p>
            <select value={safe} onChange={(e) => setParam('safe', e.target.value || null)} className={inputCls}>
              <option value="">{t('page.market.anyDeal')}</option>
              <option value="true">{t('site.safeDeal')}</option>
              <option value="false">{t('site.directDeal')}</option>
            </select>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t('page.market.priceType')}</p>
            <select value={negotiable} onChange={(e) => setParam('negotiable', e.target.value || null)} className={inputCls}>
              <option value="">{t('page.market.anyPrice')}</option>
              <option value="true">{t('site.negotiable')}</option>
              <option value="false">{t('site.fixedPrice')}</option>
            </select>
          </div>

          {/* deal toggles */}
          <div className="mt-5 space-y-2">
            {toggleKeys.map((tg) => {
              const name = toggleParam[tg];
              return (
                <label key={tg} className="flex cursor-pointer items-center justify-between text-sm text-ink">
                  {t(`page.market.toggles.${tg}`)}
                  <input
                    type="checkbox"
                    checked={flag(name)}
                    onChange={(e) => setParam(name, e.target.checked ? 'true' : null)}
                    className="accent-[#249653]"
                  />
                </label>
              );
            })}
          </div>
        </aside>

        {/* results */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {selectedCategory && <FilterChip label={selectedCategory.name} tone="green" onRemove={() => setCategory(null)} />}
              {selectedSubcategory && <FilterChip label={selectedSubcategory.name} tone="green" onRemove={() => setSubcategory(null)} />}
              {market && <FilterChip label={marketName(market)} tone="mango" onRemove={() => setParam('market', null)} />}
              {city && <FilterChip label={city} tone="mango" onRemove={() => setParam('city', null)} />}
              {country && <FilterChip label={country} tone="mango" onRemove={() => setParam('country', null)} />}
              {grade && <FilterChip label={grade} tone="slate" onRemove={() => setParam('grade', null)} />}
              {(minPrice || maxPrice) && (
                <FilterChip
                  label={`$${minPrice || '0'}–${maxPrice || '∞'}`}
                  tone="slate"
                  onRemove={() => { setParam('minPrice', null); setParam('maxPrice', null); }}
                />
              )}
              {attrFields.flatMap((f: AttrField) =>
                (attrSelections[f.key] ?? []).map((val) => (
                  <FilterChip
                    key={`${f.key}:${val}`}
                    label={f.type === 'boolean' ? f.label : optionLabel(f, val)}
                    tone="mango"
                    onRemove={() => toggleAttr(f.key, val)}
                  />
                )),
              )}
              {flag('verified') && <FilterChip label={t('page.market.chipVerified')} tone="green" onRemove={() => setParam('verified', null)} />}
              {safe && (
                <FilterChip
                  label={safe === 'true' ? t('site.safeDeal') : t('site.directDeal')}
                  tone="green"
                  onRemove={() => setParam('safe', null)}
                />
              )}
              {negotiable && (
                <FilterChip
                  label={negotiable === 'true' ? t('site.negotiable') : t('site.fixedPrice')}
                  tone="mango"
                  onRemove={() => setParam('negotiable', null)}
                />
              )}
              {flag('offer') && <FilterChip label={t('page.market.chipOffers')} tone="mango" onRemove={() => setParam('offer', null)} />}
              {flag('auction') && <FilterChip label={t('page.market.chipAuctions')} tone="mango" onRemove={() => setParam('auction', null)} />}
            </div>
            <div className="ms-auto flex shrink-0 items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setParam('sort', e.target.value === 'relevance' ? null : e.target.value)}
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
                  className={'flex h-9 w-9 items-center justify-center ' + (view === 'grid' ? 'text-brand' : 'text-ink-soft')}
                >
                  <Icon name="grid" size={16} />
                </button>
                <button
                  onClick={() => setView('list')}
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
                    onClick={() => setParam('page', String(page - 1))}
                  >
                    {t('page.market.prev')}
                  </Button>
                  <span className="text-sm text-ink-soft">{t('page.market.pageOf', { page, total: pageCount })}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount || isFetching}
                    onClick={() => setParam('page', String(page + 1))}
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

function FilterChip({ label, tone, onRemove }: { label: string; tone: 'green' | 'mango' | 'slate'; onRemove: () => void }) {
  return (
    <button onClick={onRemove} className="focus:outline-none">
      <Badge tone={tone}>{label} ✕</Badge>
    </button>
  );
}
