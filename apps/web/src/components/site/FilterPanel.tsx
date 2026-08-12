import { useMemo, useState, type ReactNode } from 'react';
import { Badge, Button, Icon } from '@agrotraders/ui';
import { useI18n } from '../../i18n';

/**
 * The shared left-hand filter panel — the marketplace grid and the provider
 * directories both browse through these.
 *
 * The rules the whole panel is built on:
 *
 * - Every facet is a CHECKBOX list. Multiple boxes tick within a group (they OR)
 *   and across groups (they AND), which a `<select>` could never express — the
 *   old market panel could ask for India *or* Turkey but never both.
 * - Every choice writes straight to the URL, so results refresh on the click
 *   with no Apply button, and the view stays shareable and back-button-able.
 * - Anything ticked is also a removable chip above the results, so a filter set
 *   two screens down the panel is still visible and still one click to undo.
 * - Below `lg` the panel collapses behind a "Filters" button. Rendered inline it
 *   is several screens tall, which pushed the actual listings off the bottom of
 *   a phone.
 */

/** One selectable box: value is what the URL carries, label is what a human reads. */
export interface FilterOption {
  value: string;
  label: string;
  /** Leading glyph — a category emoji, a country flag. */
  emoji?: string;
  /**
   * Matching listings, as the API counted them with every OTHER filter applied.
   * `0` is meaningful and IS rendered — an option with nothing behind it right
   * now is still a real choice, and hiding it would make the panel disagree with
   * the catalog.
   */
  count?: number;
  /** Second line under the label — a taxonomy trail, a market's city. */
  hint?: string;
}

/** A ticked filter, rendered as a removable chip above the results. */
export interface FilterChip {
  /** Unique across the whole chip row — `group:value`. */
  key: string;
  label: string;
  tone: 'green' | 'mango' | 'slate';
  onRemove: () => void;
}

/* ── primitives ──────────────────────────────────────────────────── */

/**
 * A checkbox row. A real `<input type="checkbox">` rather than a styled button:
 * screen readers announce the checked state for free, space toggles it, and the
 * group reads as the multi-select it is.
 */
export function FilterCheckbox({
  checked,
  onChange,
  label,
  emoji,
  count,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  emoji?: string;
  count?: number;
  hint?: string;
}) {
  // Dimmed at zero rather than removed: the box still says something true (there
  // is nothing behind this option right now), and it stays tickable so a stale
  // count can never trap a buyer out of a filter.
  const empty = count === 0 && !checked;
  return (
    <label
      className={
        'flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ' +
        (checked ? 'bg-brand-surface font-semibold text-brand-dark' : 'text-ink hover:bg-brand-surface/60') +
        (empty ? ' opacity-55' : '')
      }
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 rounded accent-[#249653]"
      />
      {emoji && <span className="shrink-0 text-base leading-none">{emoji}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {hint && <span className="block truncate text-[11px] font-normal text-ink-soft">{hint}</span>}
      </span>
      {count != null && <span className="shrink-0 text-xs text-ink-soft">{count}</span>}
    </label>
  );
}

/**
 * A collapsible group of related boxes.
 *
 * Collapsed by default for the long tail (country, market) and open for the
 * facets a buyer reaches for first — with ~12 groups the panel is otherwise a
 * scroll marathon on a phone. The selected count stays on the header so a
 * collapsed group never hides an active filter.
 */
export function FilterGroup({
  title,
  selectedCount = 0,
  defaultOpen = true,
  children,
}: {
  title: string;
  selectedCount?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-surface-border py-3 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-start"
      >
        <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wide text-ink-soft">{title}</span>
        {selectedCount > 0 && (
          <span className="shrink-0 rounded-pill bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
            {selectedCount}
          </span>
        )}
        <Icon
          name="chevronDown"
          size={14}
          className={'shrink-0 text-ink-soft transition ' + (open ? 'rotate-180' : '')}
        />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}

/**
 * A searchable, capped list of checkboxes.
 *
 * `searchable` earns its keep past a couple of dozen options — the country list
 * is 200 long and scrolling it to find Uruguay is not a filter. `initialLimit`
 * keeps the panel short until "show all" is asked for; ticked boxes always
 * survive the cap, so a selection can never scroll out of reach.
 */
export function FilterOptionList({
  options,
  selected,
  onToggle,
  searchable = false,
  searchPlaceholder,
  initialLimit = 8,
  emptyLabel,
}: {
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  initialLimit?: number;
  emptyLabel?: string;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const picked = useMemo(() => new Set(selected), [selected]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.label.toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle));
  }, [options, query]);

  // Ticked options float to the top and are never truncated away: a filter you
  // cannot see is a filter you cannot clear.
  const ordered = useMemo(() => {
    const on = matches.filter((o) => picked.has(o.value));
    const off = matches.filter((o) => !picked.has(o.value));
    return [...on, ...off];
  }, [matches, picked]);

  const searching = query.trim().length > 0;
  const capped = expanded || searching ? ordered : ordered.slice(0, Math.max(initialLimit, picked.size));
  const hidden = ordered.length - capped.length;

  return (
    <div>
      {searchable && (
        <label className="mb-2 flex items-center gap-2 rounded-md border border-surface-border px-2.5">
          <Icon name="search" size={14} className="shrink-0 text-ink-soft" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? t('page.market.searchOptions')}
            className="h-8 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-soft"
          />
        </label>
      )}
      {ordered.length === 0 ? (
        <p className="px-2 py-2 text-xs text-ink-soft">{emptyLabel ?? t('page.market.noOptionMatch')}</p>
      ) : (
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {capped.map((o) => (
            <FilterCheckbox
              key={o.value}
              checked={picked.has(o.value)}
              onChange={() => onToggle(o.value)}
              label={o.label}
              emoji={o.emoji}
              count={o.count}
              hint={o.hint}
            />
          ))}
        </div>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 px-2 text-xs font-bold text-brand-dark hover:text-brand"
        >
          {t('page.market.showAll', { count: hidden })}
        </button>
      )}
      {expanded && !searching && ordered.length > initialLimit && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 px-2 text-xs font-bold text-brand-dark hover:text-brand"
        >
          {t('page.market.showLess')}
        </button>
      )}
    </div>
  );
}

/**
 * The panel shell: mobile disclosure button, sticky desktop column, header with
 * the live filter count and Clear all.
 *
 * Rendered as one component (rather than a button beside an `<aside>`) so the
 * `aria-controls`/`aria-expanded` pairing and the open state can never drift
 * apart between the two callers.
 */
export function FilterPanel({
  id = 'filter-panel',
  activeCount,
  onClearAll,
  children,
}: {
  id?: string;
  activeCount: number;
  onClearAll: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        fullWidth
        className="mb-4 justify-between lg:hidden"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        leftIcon={<Icon name="filter" size={16} />}
        rightIcon={<Icon name="chevronDown" size={16} className={open ? 'rotate-180 transition' : 'transition'} />}
      >
        {t('page.market.filters')}
        {activeCount > 0 && (
          <span className="rounded-pill bg-brand px-2 py-0.5 text-xs font-bold text-white">{activeCount}</span>
        )}
      </Button>

      <aside
        id={id}
        className={
          // Sticky with its own scroll on desktop: at a dozen groups the panel
          // outruns the viewport, and a filter you have to scroll the whole page
          // back up to change is one you stop changing.
          'h-fit rounded-lg border border-surface-border bg-white p-4 shadow-card sm:p-5 lg:sticky lg:top-4 ' +
          'lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto ' +
          (open ? 'block' : 'hidden')
        }
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex items-center gap-2 font-display font-bold text-ink">
            <Icon name="filter" size={18} /> {t('page.market.filters')}
          </span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="ms-auto shrink-0 text-xs font-bold text-brand-dark hover:text-brand"
            >
              {t('page.market.clearAll')}
            </button>
          )}
        </div>
        {children}

        {/* Phones only: the panel is tall, and after ticking six boxes the way
            back to the results was a long scroll past every group you skipped. */}
        <Button variant="outline" fullWidth className="mt-4 lg:hidden" onClick={() => setOpen(false)}>
          {t('page.market.showResults')}
        </Button>
      </aside>
    </>
  );
}

/**
 * The removable-chip row above the results, plus Clear all.
 *
 * Renders nothing when nothing is selected rather than an empty bar — the
 * results should start at the top of the column on a fresh browse.
 */
export function ActiveFilterChips({ chips, onClearAll }: { chips: FilterChip[]; onClearAll: () => void }) {
  const { t } = useI18n();
  if (chips.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={t('page.market.removeFilter', { name: chip.label })}
          className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Badge tone={chip.tone} className="hover:opacity-80">
            <span className="truncate">{chip.label}</span>
            <Icon name="x" size={11} className="shrink-0" />
          </Badge>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="px-1 text-xs font-bold text-brand-dark underline-offset-2 hover:underline"
      >
        {t('page.market.clearAll')}
      </button>
    </div>
  );
}
