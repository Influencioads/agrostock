import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from './cn';

export interface ComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Suggestions. Pass an already-filtered list when the source is remote. */
  options: string[];
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
}: ComboboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const term = value.trim().toLowerCase();
    if (!filterLocally || !term) return options.slice(0, MAX_VISIBLE);
    const starts: string[] = [];
    const contains: string[] = [];
    for (const o of options) {
      const lower = o.toLowerCase();
      if (lower.startsWith(term)) starts.push(o);
      else if (lower.includes(term)) contains.push(o);
      if (starts.length >= MAX_VISIBLE) break;
    }
    return [...starts, ...contains].slice(0, MAX_VISIBLE);
  }, [options, value, filterLocally]);

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

  const pick = (option: string) => {
    onChange(option);
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
          'flex items-center gap-2 rounded-md border bg-white px-3',
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
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
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
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option === value}
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
                  {option}
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
