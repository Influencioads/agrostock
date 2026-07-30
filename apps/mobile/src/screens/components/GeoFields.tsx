import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { countryOptions } from '../../lib/countries';
import { useI18n } from '../../i18n';
import { PickerField } from './PickerSheet';
import { TagInput } from './TagInput';

/**
 * Country / city pickers for every place field on mobile.
 *
 * Free text used to be allowed here, and a hand-typed "banglore" matched nothing
 * in the directory, catalog or market filters — the listing was silently invisible
 * to every search. These pick from the same reference data the filters match on.
 *
 * The ~134k cities live on the API, never in the bundle (`GET /geo/cities`).
 */

/** City suggestions, searched server-side. Unscoped hits read "Mumbai, India". */
function useCities(country: string | undefined, q: string) {
  const term = q.trim();
  const { data = [], isFetching } = useQuery({
    queryKey: ['geo-cities', country ?? '', term],
    queryFn: () => api.geo.cities(country ?? '', term || undefined),
    // With a country the whole list is browsable; without one the search spans
    // every country, which needs something to match on.
    enabled: Boolean(country) || term.length >= 2,
    staleTime: 3600e3,
    retry: 1,
  });
  return { options: data.map((c) => ({ value: c })), loading: isFetching };
}

/**
 * City field. Pass `country` where the form stores one (a worker's origin, a
 * route leg) to scope the list; omit it for fields with no country beside them
 * (freight from/to) and the search covers every country.
 */
export function CityField({
  label,
  value,
  onChange,
  country,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  country?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const { options, loading } = useCities(country, q);
  return (
    <PickerField
      label={label}
      placeholder={placeholder ?? t('common:geo.cityPlaceholder')}
      value={value}
      options={options}
      onChange={onChange}
      onSearch={setQ}
      loading={loading}
      disabled={disabled}
      searchPlaceholder={t('common:geo.citySearchPlaceholder')}
      emptyLabel={
        !country && q.trim().length < 2 ? t('common:geo.typeToSearch') : t('common:geo.noCities')
      }
    />
  );
}

/** Country field — a searchable sheet over the full ISO list. */
export function CountryField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { t, lang } = useI18n();
  // The English name stays the stored VALUE; only the label is localized.
  const options = countryOptions(lang);
  return (
    <PickerField
      label={label}
      placeholder={placeholder ?? t('common:geo.country')}
      value={value}
      displayValue={options.find((o) => o.value === value)?.label}
      options={options}
      onChange={onChange}
      searchPlaceholder={t('common:geo.country')}
    />
  );
}

/** Multi-value city list — operating / supplying areas. */
export function CityTagField({
  label,
  value,
  onChange,
  country,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  country?: string;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const { options, loading } = useCities(country, q);
  return (
    <TagInput
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={options}
      onSearch={setQ}
      loading={loading}
    />
  );
}

/** Multi-value country list — operating / supplying countries. */
export function CountryTagField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const { lang } = useI18n();
  return (
    <TagInput
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={countryOptions(lang)}
    />
  );
}
