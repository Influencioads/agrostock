import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { countryLabel, type ApiCategory } from '@agrotraders/api-client';
import { Badge, Button, Card, Icon, Modal, Reveal, Stagger, StaggerItem } from '@agrotraders/ui';
import { useI18n } from '../../i18n';
// WEB-01: `community`, `insights`, `intl` and `officesPreview` were fabricated
// datasets rendered as real marketplace content; those sections are gone and
// offices now come from the API. `safeSteps` is static explanatory copy, not
// invented data, so it stays.
import { safeSteps } from '../../mock/data';
import { ProductCard } from './ProductCard';
import { api, assetUrl, toCardProduct } from '../../lib/api';
import { buildSubcategoryTree, findSubcategoryPath, flattenSubcategoryTree, type SubcategoryNode } from '@agrotraders/api-client';
import { ActiveFilterChips, FilterGroup } from './FilterPanel';
import { MarketFilterFields, SortSelect, useMarketFilters, type MarketFilters } from './MarketFilterFields';
import { useDebouncedParam, useLocalFilterParams } from '../../lib/filterParams';

/* ── helpers ───────────────────────────────────────────────────── */

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Reveal as="div" className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <h2 className="min-w-0 font-display text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>
      {action && (
        <button onClick={onAction} className="group flex shrink-0 items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark">
          {action}{' '}
          <Icon name="chevronRight" size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      )}
    </Reveal>
  );
}

function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  // scroll-mt keeps the sticky header from covering the section on anchor jumps.
  return (
    <section id={id} className={`mx-auto max-w-7xl scroll-mt-28 px-4 py-10 lg:px-6 ${className}`}>
      {children}
    </section>
  );
}

/* ── Hero ──────────────────────────────────────────────────────── */

// three.js (~600KB gz) stays out of the initial bundle: the 3D globe loads
// lazily and the SVG globe below doubles as its loading/reduced-motion state.
const Globe3D = lazy(() => import('./Globe3D'));

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Rotating wireframe globe with pulsing nodes + connection lines (pure SVG/CSS). */
function GlobeArt() {
  const meridians = [26, 58, 96, 130];
  const latitudes = [
    { dy: -96, rx: 128, ry: 20 },
    { dy: -50, rx: 152, ry: 30 },
    { dy: 0, rx: 160, ry: 36 },
    { dy: 50, rx: 152, ry: 30 },
    { dy: 96, rx: 128, ry: 20 },
  ];
  const nodes = [
    { x: 262, y: 132, c: 'var(--agro-mango,#FFA000)' },
    { x: 190, y: 196, c: '#7ED99A' },
    { x: 248, y: 250, c: '#DFF3E4' },
  ];
  return (
    <svg viewBox="0 0 420 420" className="relative h-full w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
      <defs>
        <radialGradient id="agroSphere" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#2E9D5B" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#0E5233" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0B3D2E" stopOpacity="0.15" />
        </radialGradient>
      </defs>

      {/* dashed connection lines */}
      <g stroke="rgba(223,243,228,0.35)" strokeWidth="1.4" strokeDasharray="3 7" fill="none" className="agro-dash">
        <path d="M210 210 L40 150" />
        <path d="M210 210 L392 250" />
        <path d="M210 210 L120 372" />
      </g>

      <circle cx="210" cy="210" r="160" fill="url(#agroSphere)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />

      {/* latitudes (static) */}
      <g stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none">
        {latitudes.map((l, i) => (
          <ellipse key={i} cx="210" cy={210 + l.dy} rx={l.rx} ry={l.ry} />
        ))}
      </g>

      {/* meridians (rotating group → the globe spin) */}
      <g
        className="animate-[spin_28s_linear_infinite]"
        style={{ transformOrigin: '210px 210px' }}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
        fill="none"
      >
        {meridians.map((rx, i) => (
          <ellipse key={i} cx="210" cy="210" rx={rx} ry="160" />
        ))}
        <line x1="210" y1="50" x2="210" y2="370" />
      </g>

      {/* pulsing nodes */}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="14" fill={n.c} opacity="0.25" className="agro-ping" style={{ transformOrigin: `${n.x}px ${n.y}px`, animationDelay: `${i * 0.6}s` }} />
          <circle cx={n.x} cy={n.y} r="4.5" fill={n.c} />
        </g>
      ))}
    </svg>
  );
}

/** 3D globe with SVG fallback (loading + prefers-reduced-motion). */
function HeroGlobe() {
  const reduced = useReducedMotion();
  if (reduced) return <GlobeArt />;
  return (
    <Suspense fallback={<GlobeArt />}>
      <div className="absolute inset-0 flex items-center justify-center">
        <Globe3D size={500} />
      </div>
    </Suspense>
  );
}

/* ── Categories mega-menu (hero search) ─────────────────────────────
 * A cascading, two-column category picker. It is fully CLICK-DRIVEN —
 * columns only change on an explicit click, never on hover — so moving
 * the pointer diagonally toward the deeper column can never reset the one
 * you were aiming at. Column 1 lists every category; column 2 drills its
 * subtree to any depth (all five levels).
 *
 * Picking a node does not navigate: it SETS the hero's draft and opens the
 * Filters drawer, because a category is where the questions start, not where
 * they end — "Nuts › Almond" still has to ask raw or roasted, which size,
 * which variety. The old third column offered one attribute of a leaf and
 * then dropped the buyer on /market; everything after the category went
 * unasked.
 */
function CategoryMegaMenu({ filters, onPicked }: { filters: MarketFilters; onPicked: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [catId, setCatId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Anchor + sizing for the portaled panel (fixed-positioned on document.body).
  const [pos, setPos] = useState<{ left?: number; right?: number; height: number; top?: number; bottom?: number } | null>(null);

  // The panel is rendered through a portal on document.body so it escapes the
  // hero section's `overflow-hidden` (which was clipping the lower categories)
  // and can overlay the sections beneath it. It anchors under the trigger, but
  // flips above it when there's more room there, and its height is capped to the
  // available space so the last categories are always reachable (never cut off
  // by the viewport edge). Recomputed on open, scroll and resize.
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const vh = window.innerHeight;
      const gap = 8;
      const margin = 12;
      const maxH = 460;
      const mobile = window.innerWidth < 640;

      // On a phone there is never enough room beside or below the trigger for a
      // two-column picker, and the flip-up/flip-down maths just produced a
      // ~200px-tall sliver. Pin it to the bottom edge as a sheet instead, so it
      // always gets 72vh regardless of where the trigger sits on the page.
      if (mobile) {
        setPos({ left: 0, right: 0, bottom: 0, height: Math.min(maxH, Math.round(vh * 0.72)) });
        return;
      }

      const panelWidth = Math.min(480, window.innerWidth - margin * 2);
      // Clamp the anchor into the viewport first. On a short viewport (landscape
      // phone) an off-screen trigger yielded a negative offset and pushed the
      // panel below the fold, where `position: fixed` makes it unreachable.
      const anchorTop = Math.min(Math.max(r.top, margin), vh - margin);
      const anchorBottom = Math.min(Math.max(r.bottom, margin), vh - margin);
      const spaceBelow = vh - anchorBottom - margin;
      const spaceAbove = anchorTop - margin;
      const left = Math.min(Math.max(margin, r.left), window.innerWidth - panelWidth - margin);
      const inline = { left, right: window.innerWidth - left - panelWidth };
      // Prefer opening downward; flip up only when it gives meaningfully more room.
      if (spaceBelow >= 320 || spaceBelow >= spaceAbove) {
        setPos({ ...inline, top: anchorBottom + gap, height: Math.max(160, Math.min(maxH, spaceBelow)) });
      } else {
        setPos({ ...inline, bottom: vh - anchorTop + gap, height: Math.max(160, Math.min(maxH, spaceAbove)) });
      }
    };
    place();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // Categories come from the live catalogue (same source as the marketplace
  // filter and admin), so anything an admin adds/edits shows up here too.
  const menuCategories = filters.catData;
  const activeCat = menuCategories.find((c) => c.id === catId) ?? null;
  const { data: deepSubs } = useQuery({
    queryKey: ['category-subtree', activeCat?.id],
    queryFn: () => api.categories.subtree(activeCat!.id, { depth: 'all' }),
    enabled: Boolean(open && activeCat?.id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const subTree = useMemo(
    () => buildSubcategoryTree(deepSubs ?? activeCat?.subcategories ?? []),
    [activeCat?.subcategories, deepSubs],
  );
  const selectedSub = useMemo(
    () => flattenSubcategoryTree(subTree).find(({ node }) => node.id === subId)?.node ?? null,
    [subTree, subId],
  );
  const selectedSubPath = useMemo(
    () => (selectedSub ? findSubcategoryPath(subTree, selectedSub.id) : ([] as SubcategoryNode[])),
    [selectedSub, subTree],
  );
  const visibleSubs = selectedSub ? selectedSub.children : subTree;
  const parentSub = selectedSubPath.length > 1 ? selectedSubPath[selectedSubPath.length - 2] : null;

  // Counts for what a click HERE would select: the draft's other filters, with
  // its taxonomy swapped for the category being browsed. Picking a node drops
  // the old node's attributes, so they must not narrow these counts either.
  const menuQuery = useMemo(() => {
    const { categoryId: _c, category: _cn, subcategoryId: _s, subcategory: _sn, attrs: _a, sort: _o, ...rest } = filters.query;
    return activeCat ? { ...rest, categoryId: activeCat.id } : rest;
  }, [filters.query, activeCat]);
  const { data: menuFacets, isPlaceholderData } = useQuery({
    queryKey: ['product-facets', menuQuery],
    queryFn: () => api.products.facets(menuQuery),
    enabled: open,
    placeholderData: keepPreviousData,
    retry: 1,
  });
  // Unknown until this query's own counts land — never dim on a stale guess.
  const counted = menuFacets && !isPlaceholderData ? menuFacets : null;
  const nodeCounts = useMemo(() => new Map((counted?.subcategories ?? []).map((s) => [s.value, s.count])), [counted]);
  const catCount = (id: string) => (counted ? counted.categories.find((c) => c.value === id)?.count ?? 0 : undefined);
  const nodeCount = (id: string) => (counted ? nodeCounts.get(id) ?? 0 : undefined);

  const toggle = () => {
    // Each open starts at the draft's own category, so a buyer refining a pick
    // is not sent back to the top of 24 categories.
    setOpen((o) => {
      if (!o) { setCatId(filters.drillCategory?.id ?? null); setSubId(null); }
      return !o;
    });
  };
  const select = (category: ApiCategory | null, node: SubcategoryNode | null = null) => {
    filters.selectTaxon(category, node);
    // The focused menu item unmounts in this same commit; parked on the
    // trigger first, it is where the drawer opened next restores focus to,
    // instead of <body>.
    btnRef.current?.focus();
    setOpen(false);
    if (category) onPicked();
  };
  const pickCategory = (id: string) => {
    setCatId(id);
    setSubId(null);
  };
  // A node with children drills; a leaf is the pick.
  const pickSub = (node: SubcategoryNode) => (node.children.length > 0 ? setSubId(node.id) : select(activeCat, node));
  const goBackSub = () => setSubId(parentSub?.id ?? null);

  // The button names the draft's pick as a trail, so the choice made two
  // levels down is still readable after the menu closes.
  const picked = filters.drillCategory
    ? [filters.drillCategory, ...filters.selectedSubcategoryPath].map((n) => n.name).join(' › ')
    : filters.selectedCategories.map((c) => c.name).join(', ');

  const colBtn =
    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm transition';
  const colHead =
    'sticky top-0 z-10 border-b border-surface-border bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft';
  const placeholder = 'flex min-h-0 flex-1 items-center justify-center p-4 text-center text-xs text-ink-soft';
  // Empty branches stay pickable (the results page answers them with similar
  // listings) but read as empty before the click.
  const dim = (count: number | undefined) => (count === 0 ? ' opacity-55' : '');
  const countTag = (count: number | undefined) =>
    count == null ? null : <span className="shrink-0 text-xs font-normal text-ink-soft">{count}</span>;

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        title={picked || undefined}
        className={
          // A full-width, labelled field. It used to hide its label below `sm`,
          // leaving a bare grid icon that nobody read as "Categories" — the
          // single most-reported homepage complaint.
          'flex h-10 w-full items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition ' +
          (open || picked
            ? 'border-brand-leaf bg-brand-surface text-brand-dark'
            : 'border-surface-border text-ink-soft hover:border-brand-leaf hover:text-brand-dark')
        }
      >
        <Icon name="grid" size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-start">{picked || t('hero.categories')}</span>
        <Icon name="chevronDown" size={14} className={'shrink-0 ' + (open ? 'rotate-180 transition' : 'transition')} />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right, zIndex: 60 }}
          className="overflow-hidden rounded-t-2xl border border-surface-border bg-white text-ink shadow-[0_-12px_60px_rgba(11,61,46,0.28)] sm:rounded-xl sm:shadow-[0_24px_60px_rgba(11,61,46,0.22)] sm:w-[min(92vw,480px)]"
        >
          {/* Fixed 2-column grid, height-capped so the last rows stay reachable. */}
          <div className="grid grid-cols-1 overflow-y-auto sm:grid-cols-2 sm:overflow-hidden" style={{ height: pos.height }}>
            {/* Column 1 — categories */}
            <div className="flex min-h-0 flex-col border-b border-surface-border sm:border-b-0 sm:border-e">
              <div className={colHead}>{t('hero.colCategory')}</div>
              <div className="flex-1 overflow-y-auto p-1.5">
                {/* "Any" leads every level, the specific choices sit under it. */}
                <button
                  type="button"
                  onClick={() => select(null)}
                  className={colBtn + ' mb-1 font-semibold text-brand-dark hover:bg-brand-surface/60'}
                >
                  <Icon name="check" size={14} />
                  <span className="flex-1 truncate">{t('page.market.allCategories')}</span>
                </button>
                {menuCategories.map((c) => {
                  const active = c.id === catId;
                  const count = catCount(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCategory(c.id)}
                      aria-current={active}
                      className={colBtn + (active ? ' bg-brand-surface font-bold text-brand-dark' : ' text-ink hover:bg-brand-surface/60') + dim(count)}
                    >
                      <span className="text-base">{c.emoji ?? '📦'}</span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {countTag(count)}
                      <Icon name="chevronRight" size={14} className={active ? 'text-brand-dark' : 'text-ink-soft/50'} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2 — subcategories, any depth.
                Stacked (not side-by-side) below `sm`, so an empty placeholder
                column would just be dead scroll: hide it until it has content. */}
            <div className={'min-h-0 flex-col sm:flex ' + (activeCat ? 'flex' : 'hidden')}>
              <div className={colHead + ' flex items-center justify-between gap-2'}>
                <span className="min-w-0 truncate">{selectedSub ? selectedSub.name : activeCat ? activeCat.name : t('hero.colSubcategory')}</span>
                {selectedSub && (
                  <button type="button" onClick={goBackSub} className="shrink-0 text-[11px] font-bold text-brand-dark">
                    {t('page.market.back')}
                  </button>
                )}
              </div>
              {!activeCat ? (
                <p className={placeholder}>{t('hero.pickCategory')}</p>
              ) : (
                <div className="flex-1 overflow-y-auto p-1.5">
                  <button
                    type="button"
                    onClick={() => select(activeCat, selectedSub)}
                    className={colBtn + ' mb-1 font-semibold text-brand-dark hover:bg-brand-surface/60'}
                  >
                    <Icon name="check" size={14} />
                    <span className="min-w-0 flex-1 truncate">{t('hero.allOf')} {selectedSub ? selectedSub.name : activeCat.name}</span>
                    {countTag(selectedSub ? nodeCount(selectedSub.id) : catCount(activeCat.id))}
                  </button>
                  {visibleSubs.length === 0 ? (
                    // A leaf has nothing below it — saying "pick a category" here
                    // was answering a question the buyer had already answered twice.
                    <p className={placeholder}>{t('page.market.noChildCategories')}</p>
                  ) : visibleSubs.map((node) => {
                    const count = nodeCount(node.id);
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => pickSub(node)}
                        className={colBtn + ' text-ink hover:bg-brand-surface/60' + dim(count)}
                      >
                        <span className="min-w-0 flex-1 truncate">{node.emoji ? `${node.emoji} ` : ''}{node.name}</span>
                        {countTag(count)}
                        {node.children.length > 0 && <Icon name="chevronRight" size={14} className="text-ink-soft/50" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function Hero() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  // The whole search card is ONE draft of the /market query string — search
  // term, taxonomy path, attributes and every facet — applied in one go. It
  // used to be three controls that each navigated on their own, so whichever
  // was used last silently dropped the others (search OR category, never both).
  const draft = useLocalFilterParams();
  const filters = useMarketFilters(draft);
  const [q, setQ] = useDebouncedParam(draft, 'search');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { categoryIds, countries, verified } = filters.selections;

  // The typed term is taken as-is rather than after the debounce, so Enter
  // straight after typing still carries it.
  const go = () => {
    const next = new URLSearchParams(draft.params);
    if (q.trim()) next.set('search', q.trim());
    else next.delete('search');
    const qs = next.toString();
    navigate(qs ? `/market?${qs}` : '/market');
  };

  // Quick picks are real filters on the draft, not search text: "Grains" as a
  // search term matched nothing (search never looks at category names) and
  // "Россия" never matched the English country column.
  const grain = filters.catData.find((c) => c.slug === 'grain');
  const quickPicks = [
    ...(grain ? [{ key: 'grain', label: grain.name, active: categoryIds.includes(grain.id), onToggle: () => filters.toggleCategory(grain.id) }] : []),
    { key: 'russia', label: countryLabel('Russia', lang), active: countries.includes('Russia'), onToggle: () => draft.toggle('country', 'Russia') },
    { key: 'verified', label: t('page.market.chipVerified'), active: verified, onToggle: () => draft.setValue('verified', verified ? null : 'true') },
  ];
  // The search box has its own field; the badge counts what is behind the button.
  const filterCount = filters.chips.filter((c) => c.key !== 'search').length;
  // No number while the previous draft's facets are still on screen — they
  // counted another selection, and "Show 5" for a draft that returns 0 lies.
  const total = filters.facetsStale ? undefined : filters.facets?.total;
  // The drawer's Clear all: it neither shows nor counts the search term, so it
  // must not wipe it. (The chips row, which does show it, clears everything.)
  const clearFilters = () =>
    draft.patch((next) => {
      for (const k of [...next.keys()]) if (!['search', 'sort', 'view'].includes(k)) next.delete(k);
    });
  const showLabel =
    total == null ? t('page.market.showResults') : total === 0 ? t('hero.showSimilar') : t('hero.showResults', { count: total });

  const trust = [
    { icon: 'shield' as const, label: t('hero.trust.verifiedSellers') },
    { icon: 'shield' as const, label: t('hero.trust.safeDeal') },
    { icon: 'truck' as const, label: t('hero.trust.logistics') },
    { icon: 'globe' as const, label: t('hero.trust.support') },
  ];

  return (
    <section className="relative overflow-hidden bg-brand-dock text-white">
      {/* animation keyframes + ambient glow */}
      <style>{`
        @keyframes agroFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes agroPing { 0% { transform: scale(1); opacity:.35 } 70%,100% { transform: scale(2.6); opacity:0 } }
        @keyframes agroDash { to { stroke-dashoffset: -40 } }
        .agro-float { animation: agroFloat 6s ease-in-out infinite; }
        .agro-float-slow { animation: agroFloat 8s ease-in-out infinite; }
        .agro-ping { animation: agroPing 2.4s ease-out infinite; }
        .agro-dash path { animation: agroDash 3s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .agro-float, .agro-float-slow, .agro-ping, .agro-dash path, .animate-\\[spin_28s_linear_infinite\\] { animation: none !important; }
        }
      `}</style>
      <div className="pointer-events-none absolute -end-20 top-10 h-96 w-96 rounded-full bg-brand-leaf/20 blur-3xl" />
      <div className="pointer-events-none absolute -end-10 bottom-0 h-80 w-80 rounded-full bg-mango/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:px-6 lg:py-20">
        {/* ── left ── */}
        <Stagger onView={false} className="min-w-0">
          <StaggerItem>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 text-xs font-semibold text-mint">
              {t('hero.trustedBy')}
            </span>
            {/* The platform is wholesale-only; the hero must always say so. */}
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-mango/15 px-3 py-1 text-xs font-bold text-mango">
              <Icon name="box" size={13} /> {t('hero.wholesaleOnly')}
            </span>
          </div>
          </StaggerItem>
          <StaggerItem>
          <h1 className="mt-5 max-w-full break-words font-display text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">
            {t('hero.title1')}{' '}
            <span className="bg-mango-gradient bg-clip-text text-transparent">{t('hero.title2')}</span>
          </h1>
          </StaggerItem>
          <StaggerItem>
          <p className="mt-5 max-w-lg text-base text-mint/80 sm:text-lg">{t('hero.subtitle')}</p>
          </StaggerItem>

          {/* buy / sell search card */}
          <StaggerItem>
          <div className="mt-7 w-full max-w-xl rounded-xl bg-white p-4 text-ink shadow-card">
            {/* Buy is where this card already is; Sell is a different journey. */}
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-brand-surface p-1">
              <button type="button" aria-pressed="true" className="rounded-md bg-brand-gradient py-2 text-sm font-bold text-white shadow-cta">
                {t('hero.buy')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="rounded-md py-2 text-sm font-bold text-ink-soft transition hover:text-ink"
              >
                {t('hero.sell')}
              </button>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <label className="flex min-w-0 items-center gap-2 rounded-md border border-surface-border px-3">
                <Icon name="search" size={18} className="shrink-0 text-ink-soft" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && go()}
                  placeholder={t('hero.searchPlaceholder')}
                  className="h-10 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-soft"
                />
              </label>
              <Button onClick={go}>{t('common:search')}</Button>
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <CategoryMegaMenu filters={filters} onPicked={() => setFiltersOpen(true)} />
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                aria-haspopup="dialog"
                className={
                  'flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition ' +
                  (filterCount > 0
                    ? 'border-brand-leaf bg-brand-surface text-brand-dark'
                    : 'border-surface-border text-ink-soft hover:border-brand-leaf hover:text-brand-dark')
                }
              >
                <Icon name="filter" size={16} className="shrink-0" />
                {t('page.market.filters')}
                {filterCount > 0 && (
                  <span className="rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{filterCount}</span>
                )}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickPicks.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.onToggle}
                  aria-pressed={c.active}
                  className={
                    'rounded-pill px-3 py-1 text-xs font-semibold transition ' +
                    (c.active
                      ? 'bg-brand text-white'
                      : 'bg-brand-surface text-ink-soft hover:bg-brand-surface/70 hover:text-brand-dark')
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
            {/* What the draft holds, each one click to undo — a size picked
                three groups down the drawer is still visible here. */}
            {filters.chips.length > 0 && (
              <div className="mt-3 border-t border-surface-border pt-3">
                <ActiveFilterChips chips={filters.chips} onClearAll={draft.clearAll} />
              </div>
            )}
          </div>
          </StaggerItem>

          <StaggerItem>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
            <Button size="lg" variant="outline" className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 sm:w-auto" onClick={() => navigate('/market')} leftIcon={<Icon name="bag" size={18} />}>
              {t('hero.explore')}
            </Button>
            <Button size="lg" variant="accent" className="w-full sm:w-auto" leftIcon={<Icon name="store" size={18} />} onClick={() => navigate('/login')}>
              {t('hero.list')}
            </Button>
          </div>
          </StaggerItem>
        </Stagger>

        {/* ── right: animated globe + floating cards ── */}
        <div className="relative mx-auto hidden aspect-square w-full max-w-lg lg:block">
          <div className="absolute inset-6 rounded-full bg-brand-leaf/10 blur-2xl" />
          <HeroGlobe />

          {/* SafeDeal escrow badge — hero-grade, not a sticker */}
          <div className="agro-float-slow absolute -end-2 top-2 z-10 w-64 rounded-xl border border-white/40 bg-white/95 p-4 text-ink shadow-[0_18px_50px_rgba(11,61,46,0.35)] backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-cta">
                <Icon name="shield" size={24} />
                <span className="agro-ping absolute inset-0 rounded-xl bg-brand-leaf/50" />
              </span>
              <div className="leading-tight">
                <div className="font-display text-base font-extrabold">{t('hero.safeDealTitle')}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-status-success">{t('hero.safeDealProtected')}</div>
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
              {t('hero.safeDealBody')}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-brand-dark">
              <Icon name="check" size={12} /> {t('hero.safeDealStat')}
            </div>
          </div>

          {/* WEB-01: a hardcoded "live trade" ticker ($268, +2.4%, RU→AE) used to
              sit here with a pulsing "live" dot. It was never backed by data —
              fabricated market activity presented as real — so it is gone. */}
        </div>
      </div>

      {/* Portaled: the Stagger wrappers animate `transform`, which would pin a
          `fixed` dialog to them instead of the viewport. Right-hand panel on
          desktop, full-screen sheet on phones — the panel is several screens
          tall and a centred card clipped it at both ends. */}
      {createPortal(
        <Modal
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('page.market.filters')}
          closeLabel={t('common:close')}
          className="max-sm:h-[100dvh] max-sm:max-h-none max-sm:rounded-none sm:ms-auto sm:max-h-none sm:max-w-md sm:self-stretch"
          footer={
            <>
              {filterCount > 0 && (
                <Button variant="outline" onClick={clearFilters}>{t('page.market.clearAll')}</Button>
              )}
              {/* Zero is not a dead end: /market answers it with the closest
                  listings, and the label says so before the click. */}
              <Button onClick={go}>{showLabel}</Button>
            </>
          }
        >
          <MarketFilterFields filters={filters} />
          <FilterGroup title={t('page.market.sortBy')}>
            <SortSelect state={draft} className="w-full" />
          </FilterGroup>
        </Modal>,
        document.body,
      )}

      {/* trust strip */}
      <div className="relative border-t border-white/10 bg-black/10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4 py-4 text-xs font-semibold text-mint sm:grid-cols-2 sm:text-sm lg:grid-cols-4 lg:px-6">
          {trust.map((tr) => (
            <div key={tr.label} className="flex min-w-0 items-center justify-center gap-2 lg:justify-start">
              <Icon name={tr.icon} size={17} className="text-brand-leaf" />
              <span className="min-w-0 break-words">{tr.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Highlighted products (ad slot) ──────────────────────────────── */

/**
 * Promoted listings shown directly below the hero. These are seller ad
 * placements, so each promoted card carries a visible "Sponsored" label (F30);
 * organic filler listings do not.
 */
export function Highlighted() {
  const { t } = useI18n();
  const navigate = useNavigate();
  // The paid slots: products behind an approved, unpaused ad campaign. Each is
  // flagged `sponsored` so the card renders a disclosure label.
  const { data: promoted = [] } = useQuery({
    queryKey: ['ads', 'promoted'],
    queryFn: async () => (await api.ads.promoted(8)).map((x) => ({ ...toCardProduct(x), sponsored: true })),
    retry: 1,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'highlighted'],
    queryFn: async () => (await api.products.list()).map(toCardProduct),
    retry: 1,
  });

  // Promoted listings lead; verified listings top the rail up to 8. Dedup by id
  // so a promoted product can never appear twice.
  const seen = new Set(promoted.map((p) => p.id));
  const filler = [...products]
    .filter((p) => !seen.has(p.id))
    .sort((a, b) => Number(b.verified) - Number(a.verified));
  const rail = [...promoted, ...filler].slice(0, 8);
  if (rail.length === 0) return null;

  return (
    <Section>
      <SectionHeader title={t('section.highlighted')} action={t('common:viewAll')} onAction={() => navigate('/market')} />
      <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {rail.map((p) => (
          <StaggerItem key={p.id}>
            <ProductCard p={p} />
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

/* ── Categories ────────────────────────────────────────────────── */

/** 'Animal Feed' → 'animalFeed' — the key shape used by the `categoryName` catalog. */
function categoryKey(name: string) {
  return name
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

export function Categories() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
    staleTime: 3600e3,
    retry: 1,
  });
  // `/categories` reports `_count.products` over EVERY row, whatever its status,
  // so a tile promised six and the grid behind it delivered four. The facet
  // counts are computed from the same browse predicate the grid runs, so the
  // number on the tile is the number of cards you land on.
  const { data: facets } = useQuery({
    queryKey: ['product-facets', {}],
    queryFn: () => api.products.facets({}),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const liveCount = (id: string) => facets?.categories.find((c) => c.value === id)?.count;
  return (
    <Section>
      <SectionHeader title={t('section.categories')} action={t('common:viewAll')} onAction={() => navigate('/market')} />
      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {categories.map((c) => (
          <StaggerItem key={c.name}>
            <button
              // WEB-02: actually filter by the tile that was clicked — these were
              // decorative, every one of them landing on an unfiltered /market.
              onClick={() => navigate(`/market?categoryId=${encodeURIComponent(c.id)}`)}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-surface-border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-leaf hover:shadow-[0_10px_30px_rgba(11,61,46,0.10)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-surface text-2xl" style={c.tint ? { background: c.tint } : undefined}>
                {c.emoji ?? '🌱'}
              </span>
              <span className="max-w-full break-words text-center text-sm font-bold text-ink">
                {/* Look up the API label in the localized category catalog and fall
                    back to the live English label when a locale has no matching key. */}
                {t(`categoryName.${categoryKey(c.name)}`, { defaultValue: c.name })}
              </span>
              {/* Blank until the counts land — a flashed "0" on a category that
                  has stock reads as "nothing here" and costs the click. */}
              <span className="text-xs text-ink-soft">{liveCount(c.id) ?? ''}</span>
            </button>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

/* ── Offers of the day ─────────────────────────────────────────── */

export function Offers() {
  const { t } = useI18n();
  const navigate = useNavigate();
  // Real products flagged as offers — each renders with its image and links to
  // the product page (the `offer` badge is shown by ProductCard).
  const { data: list = [] } = useQuery({
    queryKey: ['products', 'offers'],
    queryFn: async () => (await api.products.list({ offer: true })).map(toCardProduct),
    retry: 1,
  });
  if (list.length === 0) return null;
  return (
    <Section className="bg-white">
      <SectionHeader title={t('section.offers')} action={t('common:viewAll')} onAction={() => navigate('/market')} />
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.slice(0, 8).map((p) => (
          <StaggerItem key={p.id}>
            <ProductCard p={p} />
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

/* ── Live auctions (real data + polling) ───────────────────────── */

interface LiveAuction {
  id: string;
  slug: string;
  name: string;
  emoji?: string | null;
  imageUrl?: string | null;
  flag?: string | null;
  seller?: { name: string } | null;
  highestCents: number | null;
  startBidCents: number | null;
  bidCount: number;
  auctionEndsAt: string | null;
}

const cents = (c: number | null | undefined) => (c == null ? '—' : '$' + (c / 100).toLocaleString());

function endsIn(end: string | null) {
  if (!end) return '—';
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export function Auctions() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: list = [] } = useQuery<LiveAuction[]>({
    queryKey: ['home-auctions'],
    queryFn: () => api.auctions.list() as Promise<LiveAuction[]>,
    refetchInterval: 5000,
  });

  return (
    <Section>
      <SectionHeader title={t('section.auctions')} action={t('common:viewAll')} onAction={() => navigate('/market')} />
      {list.length === 0 ? (
        <Card className="py-10 text-center text-ink-soft">{t('auction.noLive')}</Card>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <StaggerItem key={a.id}>
            <Card interactive>
              <Link to={`/product/${a.slug}`} className="relative -mx-5 -mt-5 mb-3 flex h-36 items-center justify-center overflow-hidden rounded-t-lg bg-brand-surface text-5xl">
                {assetUrl(a.imageUrl) ? (
                  <img
                    src={assetUrl(a.imageUrl)}
                    alt={a.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 hover:scale-105"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = 'none';
                      el.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={assetUrl(a.imageUrl) ? 'hidden' : ''}>{a.emoji ?? '🌾'}</span>
                <Badge tone="error" className="absolute start-2 top-2" icon={<span className="h-1.5 w-1.5 rounded-full bg-status-error" />}>{t('page.auctions.live')}</Badge>
                <span className="absolute end-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs text-ink-soft">{a.bidCount} {t('auction.bidders')}</span>
              </Link>
              <div className="text-xs text-ink-soft">{a.flag} {a.seller?.name}</div>
              <Link to={`/product/${a.slug}`} className="mt-1 block font-display text-[15px] font-bold leading-snug text-ink hover:text-brand">{a.name}</Link>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-xs text-ink-soft">{t('auction.currentBid')}</div>
                  <span className="font-display text-xl font-extrabold text-ink">{cents(a.highestCents ?? a.startBidCents)}</span>
                </div>
                <div className="text-end">
                  <div className="text-xs text-ink-soft">{t('auction.ends')}</div>
                  <span className="font-numeric font-bold text-orange">{endsIn(a.auctionEndsAt)}</span>
                </div>
              </div>
              <Link to={`/product/${a.slug}`}>
                <Button variant="accent" fullWidth className="mt-4" leftIcon={<Icon name="gavel" size={16} />}>{t('auction.bid')}</Button>
              </Link>
            </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Section>
  );
}

/* ── International products ─────────────────────────────────────── */


/* ── Services ──────────────────────────────────────────────────── */

export function Services() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const svc = [
    { icon: 'truck' as const, key: 'transport', tone: 'green' as const, to: '/transporters' },
    { icon: 'worker' as const, key: 'loaders', tone: 'mango' as const, to: '/loaders' },
    { icon: 'shield' as const, key: 'safeDeal', tone: 'green' as const, to: '/safe-deal' },
    { icon: 'globe' as const, key: 'offices', tone: 'green' as const, to: '/offices' },
  ];
  return (
    <Section id="services">
      <SectionHeader title={t('section.services')} />
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {svc.map((s) => (
          <StaggerItem key={s.key}>
            <Card interactive className="group h-full cursor-pointer" onClick={() => navigate(s.to)}>
              <span
                className={
                  'flex h-11 w-11 items-center justify-center rounded-lg ' +
                  (s.tone === 'mango' ? 'bg-mango-soft text-orange' : 'bg-brand-surface text-brand-dark')
                }
              >
                <Icon name={s.icon} size={22} />
              </span>
              <div className="mt-3 flex items-center gap-1.5 font-display text-base font-bold text-ink">
                {t(`serviceCards.${s.key}.title`)}
                <Icon name="arrowRight" size={15} className="text-ink-soft transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
              </div>
              <p className="mt-1 text-sm text-ink-soft">{t(`serviceCards.${s.key}.desc`)}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

/* ── Safe Deal ─────────────────────────────────────────────────── */

export function SafeDeal() {
  const { t } = useI18n();
  return (
    <section className="bg-brand-evergreen text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6">
        <div className="text-center">
          <Badge tone="mango" className="mx-auto">
            {t('section.safeDeal')}
          </Badge>
          <h2 className="mt-3 font-display text-3xl font-extrabold">{t('section.safeDeal')}</h2>
          <p className="mt-2 text-mint/80">{t('section.safeDealSub')}</p>
        </div>
        <Stagger className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {safeSteps.map((s) => (
            <StaggerItem key={s.n}>
              <div className="h-full rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-white/25 hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mango-gradient text-brand-evergreen">
                    <Icon name={s.icon} size={20} />
                  </span>
                  <span className="font-display text-2xl font-extrabold text-white/30">{s.n}</span>
                </div>
                <div className="mt-3 font-display font-bold text-white">{s.title}</div>
                <p className="mt-1 text-sm text-mint/70">{s.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ── Global offices preview ────────────────────────────────────── */

/**
 * WEB-01: real offices from the API. This previously rendered the hardcoded
 * `officesPreview` array from mock/data.ts — invented cities with named
 * managers — presented as real company locations. Renders nothing when there is
 * no data rather than showing placeholders.
 */
export function OfficesPreview() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: offices = [] } = useQuery({
    queryKey: ['offices', 'preview'],
    queryFn: () => api.offices.list(),
    staleTime: 3600e3,
    retry: 1,
  });
  const preview = offices.slice(0, 4);
  if (preview.length === 0) return null;
  return (
    <Section className="bg-white">
      <SectionHeader title={t('section.offices')} action={t('common:viewAll')} onAction={() => navigate('/offices')} />
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {preview.map((o) => (
          <StaggerItem key={o.id}>
            <Card interactive className="h-full">
              <div className="text-3xl">{o.flag}</div>
              <div className="mt-2 font-display text-lg font-bold text-ink">{o.city}</div>
              <Badge tone="green" className="mt-1">
                {o.type}
              </Badge>
              {o.mgr && (
                <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                  <Icon name="user" size={14} /> {o.mgr}
                </div>
              )}
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="mt-6 flex justify-center">
        <Link to="/offices">
          <Button variant="outline" rightIcon={<Icon name="arrowRight" size={16} />}>
            {t('section.offices')}
          </Button>
        </Link>
      </div>
    </Section>
  );
}
