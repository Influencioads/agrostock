import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Badge, Button, Icon, Reveal } from '@agrotraders/ui';
import type { ProductListResult } from '@agrotraders/api-client';
import { ProductCard } from '../components/site/ProductCard';
import { ActiveFilterChips, FilterPanel } from '../components/site/FilterPanel';
import { MarketFilterFields, SortSelect, useMarketFilters } from '../components/site/MarketFilterFields';
import { ErrorState } from '../components/ErrorState';
import { api, toCardProduct } from '../lib/api';
import { splitValues, useDebouncedParam, useFilterParams } from '../lib/filterParams';
import { DEAL_DIRECT, DEAL_SAFE, LISTING_AUCTION, LISTING_OFFER, PRICING_FIXED, PRICING_NEGOTIABLE } from '../lib/marketQuery';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';

// The panel body, its query builder and every option list live in
// MarketFilterFields, shared with the home hero's filter drawer.

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

/**
 * What the similar-products fallback had to give up, in the buyer's words.
 * "No exact match for your size and grade" tells them which filter to loosen;
 * a bare "similar products" leaves them guessing why their pick came back empty.
 */
function similarHeading(
  data: ProductListResult | undefined,
  t: ReturnType<typeof useI18n>['t'],
  lang: string,
): string {
  const relaxed = data?.relaxed ?? [];
  const from = data?.similarFrom?.name;
  if (relaxed.includes('all')) return t('page.market.similarLatest');
  // `taxonomy` is said by the "in <node>" half, not listed as a dropped filter.
  const dropped = relaxed.filter((s) => s !== 'taxonomy').map((s) => t(`page.market.relaxedStep.${s}`));
  if (dropped.length) {
    const what = new Intl.ListFormat(lang, { type: 'conjunction' }).format(dropped);
    return from ? t('page.market.similarNoExactIn', { what, name: from }) : t('page.market.similarNoExact', { what });
  }
  return from ? t('page.market.similarHeading', { name: from }) : t('page.market.similarGeneric');
}

export function MarketPage() {
  // No option labels are translated here: they arrive localized from
  // `/products/facets`. `lang` only joins the "what was relaxed" list.
  const { t, lang } = useI18n();
  useDocumentTitle(t('page.market.title'));
  const filterState = useFilterParams();
  const { params, value, setValue, patch, replaceAll, clearAll, activeCount } = filterState;
  const filters = useMarketFilters(filterState);
  const { query, catData, drillCategory, selectedSubcategory, parentSubcategory, goUpSubcategory, chips } = filters;
  const [search, setSearch] = useDebouncedParam(filterState, 'search');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const migrated = migrateLegacyParams(params);
    if (migrated) replaceAll(migrated);
  }, [params, replaceAll]);

  // A deep link that names its category (`?category=Nuts`) but carries no id
  // gets the id resolved once, so the box is ticked, the chip shows and the
  // drill-down opens — the same state a click would have produced. Matched on
  // the English name and the slug as well, because links outlive a locale.
  useEffect(() => {
    if (params.get('categoryId') || !params.get('category') || !catData.length) return;
    const wanted = splitValues(params.get('category')).map((n) => n.toLowerCase());
    const ids = catData
      .filter((c) => [c.name, c.nameEn, c.slug].some((n) => n && wanted.includes(n.toLowerCase())))
      .map((c) => c.id);
    if (ids.length) patch((next) => next.set('categoryId', ids.join(',')));
  }, [params, catData, patch]);

  const sort = value('sort') || 'relevance';
  const page = Math.max(1, Number(value('page')) || 1);

  // Products behind a live ad campaign. They rank first on the default view AND
  // carry a visible "Sponsored" label (F30).
  const { data: promoted = [] } = useQuery({
    queryKey: ['ads', 'promoted'],
    queryFn: () => api.ads.promoted(24),
    retry: 1,
  });

  const listQuery = { ...query, page, pageSize: PAGE_SIZE };
  const { data, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: ['products', listQuery],
    queryFn: () => api.products.listPaged(listQuery),
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const items = useMemo(() => (data?.items ?? []).map(toCardProduct), [data]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Only present when page 1 matched nothing: the API loosens the query step
  // by step (attributes, grade, price, place, flags, taxonomy, search) and hands
  // back the closest listings plus which steps it took.
  const similar = useMemo(() => (data?.similar ?? []).map(toCardProduct), [data]);

  // Flag every promoted listing so the card shows a "Sponsored" disclosure, and
  // on the default view (no explicit sort) float those paid placements first.
  const list = useMemo(() => {
    if (!promoted.length) return items;
    const promotedKeys = new Set(promoted.flatMap((p) => [p.id, p.slug]).filter(Boolean));
    const flagged = items.map((p) => (promotedKeys.has(p.id) ? { ...p, sponsored: true } : p));
    if (sort !== 'relevance') return flagged;
    return [...flagged].sort((a, b) => Number(!!b.sponsored) - Number(!!a.sponsored));
  }, [items, promoted, sort]);

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
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('page.market.searchPlaceholder')}
              className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-soft"
            />
          </label>

          <MarketFilterFields filters={filters} />
        </FilterPanel>

        {/* results */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <ActiveFilterChips chips={chips} onClearAll={clearAll} />
            <div className="ms-auto flex shrink-0 items-center gap-2">
              <SortSelect state={filterState} className="max-w-[10rem]" />
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
                  {/* "Nothing under X" only when X itself came back empty — the
                      ladder loosens attributes, grade, price, place and flags
                      first, so Almond + "Roasted" can be empty while Almond is
                      not, and the similar grid below would contradict the line. */}
                  {selectedSubcategory && data?.relaxed?.[0] === 'taxonomy'
                    ? t('page.market.notAvailableAt', { name: selectedSubcategory.name })
                    : t('page.market.noMatch')}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {/* One level up, all the way to the whole category — a level-2
                      pick with nothing under it used to offer no way out but Clear. */}
                  {selectedSubcategory && (
                    <Button variant="outline" size="sm" onClick={goUpSubcategory}>
                      {t('hero.allOf')} {parentSubcategory?.name ?? drillCategory?.name}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    {t('page.market.clearFilters')}
                  </Button>
                </div>
              </div>

              {/* Nothing matched exactly, but something close did. Show that
                  rather than a dead end — a seller who listed Almond without a
                  size is still the right answer for a buyer who asked for 23/25,
                  and the heading says which of their filters was loosened. */}
              {similar.length > 0 && (
                // A named region: its cards are not results for the query, and
                // assistive tech (and the e2e suite) can tell them apart.
                <section aria-labelledby="market-similar" className="mt-8">
                  <h2 id="market-similar" className="mb-4 font-display text-lg font-extrabold text-ink">{similarHeading(data, t, lang)}</h2>
                  <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'grid grid-cols-1 gap-4'}>
                    {similar.map((p, i) => (
                      <Reveal key={p.id} delay={(i % 6) * 0.05}>
                        <ProductCard p={p} />
                      </Reveal>
                    ))}
                  </div>
                </section>
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
