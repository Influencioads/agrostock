import { useMemo, useState, type KeyboardEvent } from 'react';
import { Icon } from '@agrotraders/ui';

/**
 * Tag entry: type a value and press Enter (or comma) to add a chip. Backspace on
 * an empty field removes the last chip. Used for the city/country lists
 * collected at registration (operating / supplying areas).
 *
 * Pass `options` to get a suggestion list — entries then snap to the canonical
 * spelling, which is what makes the directory filters match. Typing something
 * absent from the list is still allowed on purpose: a missing place must never
 * block a signup.
 */
export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  options,
  loading,
  onDraftChange,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  hint?: string;
  /** Suggestions. Already filtered when they come from a server-side search. */
  options?: string[];
  loading?: boolean;
  /** Fires as the user types — lets the caller drive a remote search. */
  onDraftChange?: (draft: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    if (!options?.length) return [];
    const term = draft.trim().toLowerCase();
    const chosen = new Set(value.map((v) => v.toLowerCase()));
    return options
      .filter((o) => !chosen.has(o.toLowerCase()) && (!term || o.toLowerCase().includes(term)))
      .slice(0, 50);
  }, [options, draft, value]);

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    // Snap to the canonical option when one matches, so casing/spelling is stable.
    const canonical = options?.find((o) => o.toLowerCase() === v.toLowerCase()) ?? v;
    // De-dupe case-insensitively while keeping the first-entered casing.
    if (value.some((t) => t.toLowerCase() === canonical.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, canonical]);
    setDraft('');
    onDraftChange?.('');
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      removeAt(value.length - 1);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-surface-border bg-white px-2 py-1.5 focus-within:border-brand">
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand-surface px-2 py-0.5 text-xs font-semibold text-brand-dark"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="rounded-full text-brand-dark/70 hover:text-status-error"
              aria-label={`Remove ${tag}`}
            >
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onDraftChange?.(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          // Blur commits the draft, but only after a suggestion click has had a
          // chance to run (the list uses onMouseDown, which fires first).
          onBlur={() => {
            setOpen(false);
            add(draft);
          }}
          placeholder={value.length ? '' : placeholder}
          className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft"
        />
        {loading && <span className="text-xs text-ink-soft">…</span>}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-surface-border bg-white py-1 shadow-lg">
          {suggestions.map((option) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(option);
                }}
                className="block w-full px-3 py-2 text-start text-sm text-ink hover:bg-brand-surface"
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hint && <span className="mt-1 block text-[11px] text-ink-soft">{hint}</span>}
    </div>
  );
}
