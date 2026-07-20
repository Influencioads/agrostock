import { useState, type KeyboardEvent } from 'react';
import { Icon } from '@agrotraders/ui';

/**
 * Free-text tag entry: type a value and press Enter (or comma) to add a chip.
 * Backspace on an empty field removes the last chip. Used for the free-text
 * city/country lists collected at registration (operating / supplying areas).
 */
export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    // De-dupe case-insensitively while keeping the first-entered casing.
    if (value.some((t) => t.toLowerCase() === v.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, v]);
    setDraft('');
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      removeAt(value.length - 1);
    }
  };

  return (
    <label className="block">
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
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length ? '' : placeholder}
          className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft"
        />
      </div>
      {hint && <span className="mt-1 block text-[11px] text-ink-soft">{hint}</span>}
    </label>
  );
}
