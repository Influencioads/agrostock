import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ApiCategory, ApiSubcategory } from '@agrotraders/api-client';
import { Badge, Button, Card, Icon, Reveal, Stagger, StaggerItem } from '@agrotraders/ui';
import { ATTRIBUTE_SCHEMA, getFilterFields } from '@agrotraders/types';
import { attrKey } from '@agrotraders/i18n';
import { useI18n } from '../../i18n';
import {
  categories,
  community,
  insights,
  intl,
  officesPreview,
  products as mockProducts,
  safeSteps,
} from '../../mock/data';
import { Sparkline } from './Sparkline';
import { ProductCard } from './ProductCard';
import { api, assetUrl, toCardProduct } from '../../lib/api';
import { buildSubcategoryTree, flattenSubcategoryTree, type SubcategoryNode } from '@agrotraders/api-client';

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
 * A cascading, three-column category picker. It is fully CLICK-DRIVEN —
 * columns only change on an explicit click, never on hover — so moving
 * the pointer diagonally toward a deeper column can never reset the one
 * you were aiming at. Column 1 lists every category; clicking one shows
 * its subcategories (column 2); clicking a subcategory shows its lead
 * attribute options as a third "sub-subcategory" column. Every leaf
 * deep-links into /market with the matching filters applied.
 */
function CategoryMegaMenu() {
  const { t } = useI18n();
  const navigate = useNavigate();
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
      // three-column picker, and the flip-up/flip-down maths just produced a
      // ~200px-tall sliver. Pin it to the bottom edge as a sheet instead, so it
      // always gets 72vh regardless of where the trigger sits on the page.
      if (mobile) {
        setPos({ left: 0, right: 0, bottom: 0, height: Math.min(maxH, Math.round(vh * 0.72)) });
        return;
      }

      const panelWidth = Math.min(660, window.innerWidth - margin * 2);
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
  // filter and admin), so anything an admin adds/edits shows up here too. The
  // static ATTRIBUTE_SCHEMA is only a fallback for when the API is unreachable.
  const { data: liveCats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
    staleTime: 3600e3,
    retry: 1,
  });
  const fallbackCategories = useMemo<ApiCategory[]>(
    () =>
      ATTRIBUTE_SCHEMA.map((c, catIndex) => {
        const categoryId = `fallback-cat-${catIndex}`;
        return {
          id: categoryId,
          name: c.name,
          slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          emoji: c.emoji,
          tint: null,
          subcategories: c.subcategories.map((s, subIndex): ApiSubcategory => ({
            id: `fallback-sub-${catIndex}-${subIndex}`,
            name: s.name,
            slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            emoji: null,
            sort: subIndex,
            categoryId,
            parentId: null,
          })),
        };
      }),
    [],
  );
  const menuCategories = liveCats.length ? liveCats : fallbackCategories;
  const activeCat = menuCategories.find((c) => c.id === catId) ?? null;
  const subTree = useMemo(() => buildSubcategoryTree(activeCat?.subcategories ?? []), [activeCat?.subcategories]);
  const flatSubs = useMemo(() => flattenSubcategoryTree(subTree), [subTree]);
  const selectedSub = flatSubs.find(({ node }) => node.id === subId)?.node ?? null;
  const selectedSubPath = useMemo(() => {
    if (!selectedSub) return [] as SubcategoryNode[];
    const walk = (nodes: SubcategoryNode[], path: SubcategoryNode[] = []): SubcategoryNode[] | null => {
      for (const node of nodes) {
        const next = [...path, node];
        if (node.id === selectedSub.id) return next;
        const found = walk(node.children, next);
        if (found) return found;
      }
      return null;
    };
    return walk(subTree) ?? [];
  }, [selectedSub, subTree]);
  const visibleSubs = selectedSub ? selectedSub.children : subTree;
  const parentSub = selectedSubPath.length > 1 ? selectedSubPath[selectedSubPath.length - 2] : null;
  // The options column still shows attribute facets for the currently selected
  // subcategory; child category navigation remains in the middle column.
  const leadField = activeCat && selectedSub ? getFilterFields(activeCat.name, selectedSub.name)[0] : undefined;
  const aLabel = (s: string) => t(`attrs:label.${attrKey(s)}`, { defaultValue: s });
  const aOpt = (s: string) => t(`attrs:option.${attrKey(s)}`, { defaultValue: s });
  const isFallbackId = (id?: string) => !id || id.startsWith('fallback-');

  const toggle = () => {
    // Reset the drill-down each time the panel is (re)opened.
    setOpen((o) => {
      if (!o) { setCatId(null); setSubId(null); }
      return !o;
    });
  };
  const go = (category: ApiCategory, subcategory?: SubcategoryNode, extra: Record<string, string> = {}) => {
    const q: Record<string, string> = {
      category: category.name,
      ...(!isFallbackId(category.id) ? { categoryId: category.id } : {}),
      ...(subcategory ? { subcategory: subcategory.name } : {}),
      ...(subcategory && !isFallbackId(subcategory.id) ? { subcategoryId: subcategory.id } : {}),
      ...extra,
    };
    setOpen(false);
    navigate(`/market?${new URLSearchParams(q).toString()}`);
  };
  const pickCategory = (id: string) => {
    setCatId(id);
    setSubId(null);
  };
  const pickSub = (node: SubcategoryNode) => {
    // Drill into the third column when the subcategory has attribute options;
    // otherwise the subcategory itself is the leaf — jump straight to results.
    if (node.children.length > 0 || (activeCat && getFilterFields(activeCat.name, node.name).length > 0)) setSubId(node.id);
    else if (activeCat) go(activeCat, node);
  };
  const goBackSub = () => setSubId(parentSub?.id ?? null);

  const colBtn =
    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm transition';
  const colHead =
    'sticky top-0 z-10 border-b border-surface-border bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft';
  const placeholder = 'flex min-h-0 flex-1 items-center justify-center p-4 text-center text-xs text-ink-soft';

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        className={
          // Full-width, labelled field on phones. It used to hide its label
          // below `sm`, leaving a bare grid icon that nobody read as
          // "Categories" — the single most-reported homepage complaint.
          'flex h-10 w-full items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition sm:w-auto ' +
          (open
            ? 'border-brand-leaf bg-brand-surface text-brand-dark'
            : 'border-surface-border text-ink-soft hover:border-brand-leaf hover:text-brand-dark')
        }
      >
        <Icon name="grid" size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-start sm:flex-none">
          {t('hero.categories', { defaultValue: 'Categories' })}
        </span>
        <Icon name="chevronDown" size={14} className={'shrink-0 ' + (open ? 'rotate-180 transition' : 'transition')} />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right, zIndex: 60 }}
          className="overflow-hidden rounded-t-2xl border border-surface-border bg-white text-ink shadow-[0_-12px_60px_rgba(11,61,46,0.28)] sm:rounded-xl sm:shadow-[0_24px_60px_rgba(11,61,46,0.22)] sm:w-[min(92vw,660px)]"
        >
          {/* Fixed 3-column grid, height-capped so the last rows stay reachable. */}
          <div className="grid grid-cols-1 overflow-y-auto sm:grid-cols-3 sm:overflow-hidden" style={{ height: pos.height }}>
            {/* Column 1 — categories */}
            <div className="flex min-h-0 flex-col border-b border-surface-border sm:border-b-0 sm:border-e">
              <div className={colHead}>{t('hero.colCategory', { defaultValue: 'Categories' })}</div>
              <div className="flex-1 overflow-y-auto p-1.5">
                {menuCategories.map((c) => {
                  const active = c.id === catId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCategory(c.id)}
                      aria-current={active}
                      className={colBtn + (active ? ' bg-brand-surface font-bold text-brand-dark' : ' text-ink hover:bg-brand-surface/60')}
                    >
                      <span className="text-base">{c.emoji ?? '📦'}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <Icon name="chevronRight" size={14} className={active ? 'text-brand-dark' : 'text-ink-soft/50'} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2 — subcategories.
                Stacked (not side-by-side) below `sm`, so an empty placeholder
                column would just be dead scroll: hide it until it has content. */}
            <div
              className={
                'min-h-0 flex-col border-b border-surface-border sm:flex sm:border-b-0 sm:border-e ' +
                (activeCat ? 'flex' : 'hidden')
              }
            >
              <div className={colHead + ' flex items-center justify-between gap-2'}>
                <span className="min-w-0 truncate">{selectedSub ? selectedSub.name : activeCat ? activeCat.name : t('hero.colSubcategory', { defaultValue: 'Subcategory' })}</span>
                {selectedSub && (
                  <button type="button" onClick={goBackSub} className="shrink-0 text-[11px] font-bold text-brand-dark">
                    Back
                  </button>
                )}
              </div>
              {!activeCat ? (
                <p className={placeholder}>{t('hero.pickCategory', { defaultValue: 'Pick a category to see its subcategories' })}</p>
              ) : (
                <div className="flex-1 overflow-y-auto p-1.5">
                  <button
                    type="button"
                    onClick={() => selectedSub ? go(activeCat, selectedSub) : go(activeCat)}
                    className={colBtn + ' mb-1 font-semibold text-brand-dark hover:bg-brand-surface/60'}
                  >
                    <Icon name="check" size={14} />
                    <span className="flex-1 truncate">{t('hero.allOf', { defaultValue: 'All' })} {selectedSub ? selectedSub.name : activeCat.name}</span>
                  </button>
                  {visibleSubs.length === 0 ? (
                    <p className={placeholder}>{t('hero.pickCategory', { defaultValue: 'Pick a category to see its subcategories' })}</p>
                  ) : visibleSubs.map((node) => {
                    const active = node.id === subId;
                    const hasOptions = getFilterFields(activeCat.name, node.name).length > 0;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => pickSub(node)}
                        aria-current={active}
                        className={colBtn + (active ? ' bg-brand-surface font-bold text-brand-dark' : ' text-ink hover:bg-brand-surface/60')}
                      >
                        <span className="min-w-0 flex-1 truncate">{node.emoji ? `${node.emoji} ` : ''}{node.name}</span>
                        {(node.children.length > 0 || hasOptions) ? (
                          <Icon name="chevronRight" size={14} className={active ? 'text-brand-dark' : 'text-ink-soft/50'} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 3 — sub-subcategory (lead attribute options) */}
            <div
              className={
                'min-h-0 flex-col sm:flex ' + (activeCat && selectedSub && leadField ? 'flex' : 'hidden')
              }
            >
              <div className={colHead}>
                {selectedSub && leadField ? aLabel(leadField.label) : t('hero.colOptions', { defaultValue: 'Options' })}
              </div>
              {activeCat && selectedSub && leadField ? (
                <div className="flex-1 overflow-y-auto p-1.5">
                  <button
                    type="button"
                    onClick={() => go(activeCat, selectedSub)}
                    className={colBtn + ' font-semibold text-brand-dark hover:bg-brand-surface/60'}
                  >
                    <Icon name="check" size={14} />
                    <span className="flex-1 truncate">{t('hero.allOf', { defaultValue: 'All' })} {selectedSub.name}</span>
                  </button>
                  {(leadField.options ?? []).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => go(activeCat, selectedSub, { [`attr_${leadField.key}`]: opt })}
                      className={colBtn + ' text-ink hover:bg-brand-surface/60'}
                    >
                      <span className="flex-1 truncate">{aOpt(opt)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={placeholder}>{t('hero.pickSubcategory', { defaultValue: 'Pick a subcategory to refine' })}</p>
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
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [q, setQ] = useState('');

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
          <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 text-xs font-semibold text-mint">
            {t('hero.trustedBy')}
          </span>
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
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-brand-surface p-1">
              {(['buy', 'sell'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => (m === 'sell' ? navigate('/register?role=seller') : setMode(m))}
                  className={
                    'rounded-md py-2 text-sm font-bold transition ' +
                    (mode === m ? 'bg-brand-gradient text-white shadow-cta' : 'text-ink-soft hover:text-ink')
                  }
                >
                  {m === 'buy' ? t('hero.buy') : t('hero.sell')}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <label className="flex min-w-0 items-center gap-2 rounded-md border border-surface-border px-3">
                <Icon name="search" size={18} className="text-ink-soft" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/market')}
                  placeholder={t('hero.searchPlaceholder')}
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft"
                />
              </label>
              {/* Stacked full-width on phones (side-by-side leaves each ~150px,
                  too narrow for a translated label); `sm:contents` hands both
                  children back to the parent grid on wider screens. */}
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:contents">
                <CategoryMegaMenu />
                <Button className="w-full sm:w-auto" onClick={() => navigate('/market')}>{t('common:search')}</Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(t('hero.chips', { returnObjects: true }) as string[]).map((c) => (
                <button
                  key={c}
                  onClick={() => navigate('/market')}
                  className="rounded-pill bg-brand-surface px-3 py-1 text-xs font-semibold text-ink-soft transition hover:bg-brand-surface/70 hover:text-brand-dark"
                >
                  {c}
                </button>
              ))}
            </div>
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

          {/* Live trade card */}
          <div className="agro-float absolute -start-2 bottom-8 w-60 rounded-xl bg-white p-4 text-ink shadow-card">
            <div className="flex items-center gap-2 text-xs font-bold text-status-success">
              <span className="h-2 w-2 animate-pulse rounded-full bg-status-success" /> {t('hero.liveTrade')}
            </div>
            <div className="mt-2 flex items-center gap-2 font-numeric text-sm font-semibold text-ink-soft">
              🇷🇺 RU <Icon name="arrowRight" size={14} /> 🇦🇪 AE · {t('hero.liveTradeCommodity')}
            </div>
            <div className="mt-1 flex items-end justify-between">
              <div>
                <span className="font-display text-2xl font-extrabold text-ink">$268</span>
                <span className="text-sm text-ink-soft">{t('hero.perMt')}</span>
              </div>
              <span className="font-bold text-status-success">+2.4% ↑</span>
            </div>
          </div>
        </div>
      </div>

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

/* ── Highlighted products (ad slot, presented as featured) ───────── */

/**
 * Promoted listings shown directly below the hero. These are seller ad
 * placements, but by design they render as ordinary "highlighted products" —
 * NO "Sponsored"/"Ad" label is shown to the buyer.
 */
export function Highlighted() {
  const { t } = useI18n();
  const navigate = useNavigate();
  // The paid slots: products behind an approved, unpaused ad campaign.
  const { data: promoted = [] } = useQuery({
    queryKey: ['ads', 'promoted'],
    queryFn: async () => (await api.ads.promoted(8)).map(toCardProduct),
    retry: 1,
  });
  const { data: products = mockProducts } = useQuery({
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
  return (
    <Section>
      <SectionHeader title={t('section.categories')} action={t('common:viewAll')} onAction={() => navigate('/market')} />
      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {categories.map((c) => (
          <StaggerItem key={c.name}>
            <button
              onClick={() => navigate('/market')}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-surface-border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-leaf hover:shadow-[0_10px_30px_rgba(11,61,46,0.10)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl" style={{ background: c.tint }}>
                {c.emoji}
              </span>
              <span className="max-w-full break-words text-center text-sm font-bold text-ink">
                {/* Category names live in the mock list in English — look each one up in
                    the `categoryName` catalog (key = camelCased name) and fall back to
                    the English label if a locale is missing the key. */}
                {t(`categoryName.${categoryKey(c.name)}`, { defaultValue: c.name })}
              </span>
              <span className="text-xs text-ink-soft">{c.count}</span>
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

export function International() {
  const { t } = useI18n();
  return (
    <Section className="bg-white">
      <SectionHeader title={t('section.international')} action={t('common:viewAll')} />
      {/* The outer `overflow-hidden` (for the rounded corners) was silently
          CLIPPING this 5-column table at ~360px — the last two columns were
          simply unreachable. The inner scroller gives them back. */}
      <div className="overflow-hidden rounded-lg border border-surface-border">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-brand-surface text-start text-xs font-bold uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-3">{t('site.intl.product')}</th>
              <th className="px-4 py-3">{t('site.intl.port')}</th>
              <th className="px-4 py-3">{t('product.moq')}</th>
              <th className="px-4 py-3">{t('site.intl.grade')}</th>
              <th className="px-4 py-3 text-end">{t('site.intl.price')}</th>
            </tr>
          </thead>
          <tbody>
            {intl.map((p) => (
              <tr key={p.name} className="border-t border-surface-border hover:bg-brand-surface/40">
                <td className="px-4 py-3 font-semibold text-ink">
                  {p.flag} {p.name}
                </td>
                <td className="px-4 py-3 text-ink-soft">{p.port}</td>
                <td className="px-4 py-3 text-ink-soft">{p.moq}</td>
                <td className="px-4 py-3">
                  <Badge tone="slate">{p.grade}</Badge>
                </td>
                <td className="px-4 py-3 text-end font-numeric font-bold text-ink">{p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </Section>
  );
}

/* ── Transport & loader services ───────────────────────────────── */

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

/* ── Market insights ───────────────────────────────────────────── */

export function Insights() {
  const { t } = useI18n();
  return (
    <Section className="bg-white">
      <SectionHeader title={t('section.insights')} action={t('common:viewAll')} />
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {insights.map((i) => (
          <StaggerItem key={i.name}>
            <Card interactive className="h-full">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-ink">{i.name}</span>
                <span className={'text-xs font-bold ' + (i.up ? 'text-status-success' : 'text-status-error')}>{i.chg}</span>
              </div>
              <div className="mt-1 font-display text-2xl font-extrabold text-ink">{i.price}</div>
              <div className="mt-2">
                <Sparkline data={i.data} color={i.up ? '#249653' : '#C94343'} width={200} animate />
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

/* ── Community ─────────────────────────────────────────────────── */

export function Community() {
  const { t } = useI18n();
  return (
    <Section id="community">
      <SectionHeader title={t('section.community')} action={t('common:viewAll')} />
      <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {community.map((c) => (
          <StaggerItem key={c.q}>
            <Card interactive className="h-full">
              <Badge tone="mango">{c.tag}</Badge>
              <p className="mt-3 font-display text-base font-bold leading-snug text-ink">{c.q}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-ink-soft">
                <span>
                  {c.by} · <span className="text-brand">{c.badge}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="chart" size={13} /> {c.replies}
                </span>
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}

/* ── Safe Deal flow ────────────────────────────────────────────── */

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

export function OfficesPreview() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <Section className="bg-white">
      <SectionHeader title={t('section.offices')} action={t('common:viewAll')} onAction={() => navigate('/offices')} />
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {officesPreview.map((o) => (
          <StaggerItem key={o.city}>
            <Card interactive className="h-full">
              <div className="text-3xl">{o.flag}</div>
              <div className="mt-2 font-display text-lg font-bold text-ink">{o.city}</div>
              <Badge tone="green" className="mt-1">
                {o.type}
              </Badge>
              <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <Icon name="user" size={14} /> {o.mgr}
              </div>
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
