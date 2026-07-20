import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@agrotraders/ui';
import { useI18n } from '../../i18n';
import { NAV, isNavActive } from './nav';

const GAP = 16; // matches the flex `gap-4` on the nav row

/**
 * Desktop primary nav with a "priority+" overflow menu.
 *
 * The seven labels need ~450px (Chinese) to ~790px (Spanish/Portuguese) — a 45%
 * spread — against a container that varies with the viewport. No fixed breakpoint
 * works: one that fits Spanish strips the nav from Chinese users who had room; one
 * that fits Chinese overflows for four locales. So we measure and show as many as
 * fit, folding the rest into «More».
 *
 * Widths come from an always-rendered, invisible "ghost" row rather than from the
 * visible items. That decouples measurement from what's currently shown, which is
 * what a naive version gets wrong: resetting `shown` to all-7 and measuring in the
 * same pass races React's render, so it intermittently concludes everything fits
 * and the last items overlap the auth cluster. The ghost is always all-7 and never
 * changes, so its per-item widths are always correct and stable.
 */
export function PrimaryNav() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const wrapRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const moreWrapRef = useRef<HTMLDivElement>(null);

  const [shown, setShown] = useState(NAV.length);
  const [openMore, setOpenMore] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const ghost = ghostRef.current;
    if (!wrap || !ghost) return;

    const compute = () => {
      // `clientWidth` of the flex-1 wrapper is the true space available to the
      // nav — the flex siblings (logo, auth cluster) have already claimed theirs,
      // and the visible items can't inflate it because the wrapper is `min-w-0`.
      const avail = wrap.clientWidth;

      // Ghost children: [item0..item6, moreTrigger]. Absolute + invisible, so
      // these are intrinsic widths unaffected by the current `shown`.
      const row = ghost.firstElementChild as HTMLElement | null;
      const nodes = row ? (Array.from(row.children) as HTMLElement[]) : [];
      if (nodes.length < NAV.length) return;
      const itemW = nodes.slice(0, NAV.length).map((n) => n.getBoundingClientRect().width);
      const moreW = nodes[NAV.length]?.getBoundingClientRect().width ?? 80;

      const totalAll = itemW.reduce((a, b) => a + b, 0) + GAP * (NAV.length - 1);
      if (totalAll <= avail) {
        setShown(NAV.length);
        return;
      }
      // Doesn't all fit — reserve room for «More» and take as many as possible.
      let used = 0;
      let fit = 0;
      for (let i = 0; i < NAV.length; i++) {
        const add = (i ? GAP : 0) + itemW[i];
        if (used + add + GAP + moreW > avail) break;
        used += add;
        fit++;
      }
      setShown(fit);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(wrap);
    // Fonts loading after first paint change label widths; recompute when ready.
    document.fonts?.ready.then(compute).catch(() => {});
    return () => ro.disconnect();
  }, [lang]);

  useEffect(() => setOpenMore(false), [location.pathname]);

  useEffect(() => {
    if (!openMore) return;
    const onDown = (e: MouseEvent) => {
      if (!moreWrapRef.current?.contains(e.target as Node)) setOpenMore(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenMore(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMore]);

  const visible = NAV.slice(0, shown);
  const overflow = NAV.slice(shown);

  const itemClass = (active: boolean) =>
    'group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold transition-colors hover:text-brand ' +
    (active ? 'text-brand' : 'text-ink-soft');

  return (
    <div ref={wrapRef} className="relative hidden min-w-0 flex-1 items-center justify-center gap-4 lg:flex">
      {/* Measurement ghost: all items + a More trigger at natural width, the single
          source of truth for widths. Wrapped in a 0×0 `overflow-hidden` clip so it
          never extends the document (an unclipped absolute row this wide added ~40px
          of horizontal scroll at narrow widths). `getBoundingClientRect` still
          returns true widths through the clip; the inner row is itself absolute so a
          zero-width parent can't squeeze it. */}
      <div ref={ghostRef} aria-hidden="true" className="pointer-events-none absolute h-0 w-0 overflow-hidden">
        <div className="absolute left-0 top-0 flex items-center gap-4">
          {NAV.map((n) => (
            <span key={n.key} className={itemClass(false)}>
              <Icon name={n.icon} size={15} />
              {t(`nav:primary.${n.key}`)}
            </span>
          ))}
          <span className="flex items-center gap-1 whitespace-nowrap text-sm font-semibold">
            {t('nav:more')}
            <Icon name="chevronDown" size={14} />
          </span>
        </div>
      </div>

      {visible.map((n) => {
        const active = isNavActive(location.pathname, n.to);
        return (
          <button key={n.key} onClick={() => navigate(n.to)} className={itemClass(active)}>
            <Icon name={n.icon} size={15} className="shrink-0 text-mango-deep" />
            {t(`nav:primary.${n.key}`)}
            <span
              className={
                'absolute -bottom-1 start-0 h-0.5 w-full origin-left rounded-full bg-brand-gradient transition-transform duration-300 ease-out motion-reduce:transition-none ' +
                (active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100')
              }
            />
          </button>
        );
      })}

      {overflow.length > 0 && (
        <div ref={moreWrapRef} className="relative shrink-0">
          <button
            onClick={() => setOpenMore((v) => !v)}
            aria-expanded={openMore}
            aria-haspopup="menu"
            className={
              'flex items-center gap-1 whitespace-nowrap text-sm font-semibold transition-colors hover:text-brand ' +
              (overflow.some((n) => isNavActive(location.pathname, n.to)) ? 'text-brand' : 'text-ink-soft')
            }
          >
            {t('nav:more')}
            <Icon name="chevronDown" size={14} className="shrink-0" />
          </button>
          {openMore && (
            <div
              role="menu"
              className="absolute end-0 top-full z-50 mt-3 min-w-[200px] rounded-lg border border-surface-border bg-white p-1.5 shadow-xl"
            >
              {overflow.map((n) => {
                const active = isNavActive(location.pathname, n.to);
                return (
                  <button
                    key={n.key}
                    role="menuitem"
                    onClick={() => navigate(n.to)}
                    className={
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm font-semibold transition-colors ' +
                      (active ? 'bg-brand-surface text-brand' : 'text-ink hover:bg-brand-surface/60')
                    }
                  >
                    <Icon name={n.icon} size={15} className="shrink-0 text-mango-deep" />
                    <span className="min-w-0 break-words">{t(`nav:primary.${n.key}`)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
