import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Combobox } from '@agrotraders/ui';
import { ALL_COUNTRIES, countryLabel } from '@agrotraders/api-client';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

/**
 * Country / city pickers for the admin forms. The web console has its own copy
 * (`apps/web/src/components/GeoInputs.tsx`) — same rule as `TagInput`: each app
 * owns its fields, since they bind to that app's api client and i18n instance.
 *
 * The point is the same everywhere: a hand-typed country or city never matched
 * the directory, catalog or market filters, which match on these exact names.
 */

/** City suggestions from `/geo/cities`, searched server-side. */
function useCityOptions(country?: string | null, q?: string) {
  const term = (q ?? '').trim();
  const { data, isFetching } = useQuery({
    queryKey: ['geo-cities', country ?? '', term],
    queryFn: () => api.geo.cities(country ?? '', term || undefined),
    // With a country the whole list is browsable; without one the search spans
    // every country and returns "City, Country", which needs something to match.
    enabled: Boolean(country) || term.length >= 2,
    staleTime: 3600e3,
    retry: 1,
  });
  return { cities: data ?? [], loading: isFetching };
}

/**
 * City field. Pass `country` to scope the list to it; leave it off (an office's
 * "Dubai, UAE") and the search covers every country.
 */
export function CityInput({
  label,
  value,
  onChange,
  country,
  placeholder,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  country?: string | null;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  // The Combobox writes every keystroke to `value`, so it doubles as the query.
  const { cities, loading } = useCityOptions(country, value);

  return (
    <Combobox
      label={label}
      value={value}
      onChange={onChange}
      options={cities}
      loading={loading}
      // The API already filtered by the typed term.
      filterLocally={false}
      disabled={disabled}
      placeholder={placeholder ?? t('common:geo.cityPlaceholder')}
      emptyLabel={
        !country && value.trim().length < 2 ? t('common:geo.typeToSearch') : t('common:geo.noCities')
      }
    />
  );
}

/**
 * Country field. A `<select>` is fine here — admin forms are desktop-first and
 * the list is closed, so there is nothing to type that isn't in it.
 */
export function CountrySelectField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}) {
  const { t, lang } = useI18n();
  const options = useMemo(
    () => ALL_COUNTRIES.map((c) => ({ value: c.name, label: `${countryLabel(c.name, lang)} ${c.flag}` })),
    [lang],
  );
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold text-ink-soft">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf"
      >
        <option value="">{placeholder ?? t('common:geo.anyCountry')}</option>
        {options.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
    </label>
  );
}
