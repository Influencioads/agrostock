import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from './cn';

/**
 * A suggestion whose stored value differs from what the row reads — a city is
 * stored under its canonical English name but shown in the reader's language.
 */
export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * Suggestions. Pass an already-filtered list when the source is remote, and
   * `{ value, label }` objects where the two differ (localized city names).
   */
  options: (string | ComboboxOption)[];
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  /**
   * Filter `options` against what the user typed. Leave off for a remote source
   * that filters server-side (`/geo/cities?q=`) — otherwise the local pass would
   * hide results the server deliberately returned.
   */
  filterLocally?: boolean;
  emptyLabel?: string;
  id?: string;
  /** Filter-bar height (h-9), to sit level with the `<select>`s beside it. */
  compact?: boolean;
}

const MAX_VISIBLE = 100;

/**
 * A text input with a filtered suggestion list — for pickers whose option count
 * makes a native `<select>` unusable (cities run to tens of thousands).
 *
 * Deliberately NOT a strict select: whatever the user types is kept, so a place
 * missing from the dataset can never block a signup. Callers that want a closed
 * set should use a plain `<select>` instead.
 */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
  disabled,
  loading,
  filterLocally = true,
  emptyLabel,
  id,
  compact,
}: ComboboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // True while the user is editing, so their own text is never overwritten by a
  // label. Reset on pick, which is when `value` becomes an option again.
  const [typing, setTyping] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const opts = useMemo(
    () => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options],
  );
  // What the box shows: the picked option's label, or the raw value for free
  // text. The STORED value stays canonical — only the label is localized.
  const text = typing ? value : opts.find((o) => o.value === value)?.label ?? value;

  const visible = useMemo(() => {
    const term = text.trim().toLowerCase();
    if (!filterLocally || !term) return opts.slice(0, MAX_VISIBLE);
    const starts: ComboboxOption[] = [];
    const contains: ComboboxOption[] = [];
    for (const o of opts) {
      const lower = o.label.toLowerCase();
      if (lower.startsWith(term)) starts.push(o);
      else if (lower.includes(term) || o.value.toLowerCase().includes(term)) contains.push(o);
      if (starts.length >= MAX_VISIBLE) break;
    }
    return [...starts, ...contains].slice(0, MAX_VISIBLE);
  }, [opts, text, filterLocally]);

  // Close when focus or a click lands outside — a listbox that outlives its
  // field ends up floating over the next section of the form.
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent | FocusEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('focusin', onDocDown);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('focusin', onDocDown);
    };
  }, [open]);

  const pick = (option: ComboboxOption) => {
    onChange(option.value);
    setTyping(false);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (visible.length ? (i + delta + visible.length) % visible.length : -1));
    } else if (e.key === 'Enter' && open && active >= 0 && visible[active]) {
      e.preventDefault();
      pick(visible[active]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative block" ref={wrapRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={inputId}>
          {label}
        </label>
      )}
      <span
        className={cn(
          'flex items-center gap-2 rounded-md border bg-white',
          compact ? 'px-2.5' : 'px-3',
          error ? 'border-status-error' : 'border-surface-border focus-within:border-brand-leaf',
          disabled && 'opacity-60',
        )}
      >
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          className={cn('w-full bg-transparent text-sm outline-none placeholder:text-ink-soft', compact ? 'h-9' : 'h-11')}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setTyping(true);
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading && <span className="text-xs text-ink-soft">…</span>}
      </span>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-surface-border bg-white py-1 shadow-lg"
        >
          {visible.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-soft">{emptyLabel ?? '—'}</li>
          ) : (
            visible.map((option, i) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  // onMouseDown, not onClick: the input's blur would tear the
                  // list down before a click ever registered.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(option);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'block w-full px-3 py-2 text-start text-sm text-ink',
                    i === active ? 'bg-brand-surface' : 'hover:bg-brand-surface',
                  )}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {error ? (
        <span className="mt-1 block text-xs text-status-error">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>
      )}
    </div>
  );
}

export interface SearchSelectOption {
  /** What gets stored. */
  value: string;
  /** What the row shows — searched alongside `value`. */
  label: string;
}

/**
 * Closed-set picker with a search box. A native `<select>` only jumps to options
 * whose FIRST letters match what you type, which is useless over hundreds of
 * countries or thousands of markets — here any substring of either the label or
 * the stored value matches.
 */
export function SearchSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  error,
  disabled,
  id,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  /** Shown when nothing is selected, and as the row that clears the choice. */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
}) {
  const autoId = useId();
  const buttonId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options.slice(0, MAX_VISIBLE);
    return options
      .filter((o) => o.label.toLowerCase().includes(term) || o.value.toLowerCase().includes(term))
      .slice(0, MAX_VISIBLE);
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent | FocusEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('focusin', onDocDown);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('focusin', onDocDown);
    };
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative block" ref={wrapRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={buttonId}>
          {label}
        </label>
      )}
      <button
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-start text-sm outline-none',
          error ? 'border-status-error' : 'border-surface-border focus:border-brand-leaf',
          disabled && 'cursor-not-allowed bg-brand-surface/40 text-ink-soft',
        )}
      >
        <span className={cn('truncate', !selected && 'text-ink-soft')}>{selected?.label ?? placeholder ?? ''}</span>
        <span className="shrink-0 text-ink-soft">▾</span>
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-surface-border bg-white shadow-lg">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? placeholder}
            className="h-10 w-full rounded-t-md border-b border-surface-border px-3 text-sm outline-none placeholder:text-ink-soft"
          />
          <ul role="listbox" className="max-h-60 overflow-auto py-1">
            {placeholder && (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pick(''); }}
                  className="block w-full px-3 py-2 text-start text-sm text-ink-soft hover:bg-brand-surface"
                >
                  {placeholder}
                </button>
              </li>
            )}
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-soft">{emptyLabel ?? '—'}</li>
            ) : (
              visible.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    // onMouseDown, not onClick: the search input's blur tears the
                    // list down before a click would ever register.
                    onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
                    className={cn(
                      'block w-full px-3 py-2 text-start text-sm text-ink hover:bg-brand-surface',
                      o.value === value && 'font-semibold',
                    )}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {error && <span className="mt-1 block text-xs text-status-error">{error}</span>}
    </div>
  );
}
