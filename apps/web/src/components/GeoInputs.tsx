import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Combobox } from '@agrotraders/ui';
import { ALL_COUNTRIES, countryLabel } from '@agrotraders/api-client';
import { useCityOptions } from '../lib/geo';
import { TagInput } from './TagInput';

/**
 * The shared country / city fields. Every place-entry box on the site routes
 * through one of these, so a typed place always snaps to the canonical spelling
 * that the directory, catalog and market filters match on — a hand-typed
 * "banglore" matched nothing and silently hid the listing from every search.
 *
 * Free text is still accepted on submit, deliberately: the dataset misses small
 * places, and a missing village must never block a shipment being posted.
 */

/** Every country as plain names — the value shape the tag lists persist. */
const COUNTRY_NAMES = ALL_COUNTRIES.map((c) => c.name);

/**
 * City field backed by `/geo/cities`.
 *
 * Pass `country` where the form already stores one (a loader's origin, a route
 * leg) and the list is that country's cities. Leave it off for fields with no
 * country beside them (freight from/to, a hire's pickup point): the search then
 * spans every country and a pick reads "Mumbai, India".
 */
export function CityInput({
  label,
  value,
  onChange,
  country,
  placeholder,
  hint,
  error,
  disabled,
  id,
  compact,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Scopes the list. Omit to search every country. */
  country?: string | null;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  /** Filter-bar height, to sit level with the `<select>`s beside it. */
  compact?: boolean;
}) {
  const { t } = useTranslation(['common']);
  // The Combobox writes every keystroke to `value`, so it doubles as the query.
  const { cities, loading } = useCityOptions(country, value);

  return (
    <Combobox
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      options={cities}
      loading={loading}
      // The API already filtered by the typed term — filtering again locally
      // would hide the tail of a 200-result page.
      filterLocally={false}
      disabled={disabled}
      error={error}
      hint={hint}
      compact={compact}
      placeholder={placeholder ?? t('common:geo.cityPlaceholder')}
      emptyLabel={
        !country && value.trim().length < 2 ? t('common:geo.typeToSearch') : t('common:geo.noCities')
      }
    />
  );
}

/**
 * Multi-value twin of `CityInput` — operating / supplying city lists. The draft
 * the user is typing drives the search.
 */
export function CityTagInput({
  label,
  value,
  onChange,
  country,
  placeholder,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  country?: string | null;
  placeholder?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState('');
  const { cities, loading } = useCityOptions(country, draft);

  return (
    <TagInput
      label={label}
      value={value}
      onChange={onChange}
      onDraftChange={setDraft}
      options={cities}
      loading={loading}
      placeholder={placeholder}
      hint={hint}
    />
  );
}

/** Country list as removable chips — operating / supplying countries. */
export function CountryTagInput({
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
  return (
    <TagInput
      label={label}
      value={value}
      onChange={onChange}
      options={COUNTRY_NAMES}
      placeholder={placeholder}
      hint={hint}
    />
  );
}

/**
 * Country dropdown as a plain `<select>`, for the compact filter bars and admin
 * rows where the full `CountrySelect` (searchable, label-sized) is too heavy.
 * Options are localized; the stored value stays the English name.
 */
export function CountryOptions() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const options = useMemo(
    () => ALL_COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag} ${countryLabel(c.name, lang)}` })),
    [lang],
  );
  return (
    <>
      {options.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </>
  );
}
