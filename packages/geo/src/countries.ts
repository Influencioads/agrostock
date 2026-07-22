import { ISO_COUNTRIES } from './countries.generated';

/**
 * Country reference for every location picker on web, admin and mobile.
 *
 * `name` is the value that gets PERSISTED (User.country, Profile.originCountry,
 * Product.country, the operating/supplying string arrays…) and the directory
 * filters match on it, so these strings must stay stable forever. `iso2` is only
 * a join key into `country-state-city` for the city lists — needed because that
 * dataset spells several countries differently ("Cote D'Ivoire" vs our
 * "Ivory Coast").
 *
 * The curated head is ordered by agri-trade relevance so the common cases are
 * one scroll away; `ALL_COUNTRIES` appends the rest of the world so nobody is
 * ever locked out of signing up.
 */
export interface Country {
  name: string;
  flag: string;
  /** ISO 3166-1 alpha-2, uppercase. */
  iso2: string;
}

/** Trade-relevant countries, in picker order. Names must never change. */
export const COUNTRIES: Country[] = [
  { name: 'India', flag: '🇮🇳', iso2: 'IN' },
  { name: 'China', flag: '🇨🇳', iso2: 'CN' },
  { name: 'United States', flag: '🇺🇸', iso2: 'US' },
  { name: 'Brazil', flag: '🇧🇷', iso2: 'BR' },
  { name: 'Russia', flag: '🇷🇺', iso2: 'RU' },
  { name: 'Ukraine', flag: '🇺🇦', iso2: 'UA' },
  { name: 'Argentina', flag: '🇦🇷', iso2: 'AR' },
  { name: 'Canada', flag: '🇨🇦', iso2: 'CA' },
  { name: 'Australia', flag: '🇦🇺', iso2: 'AU' },
  { name: 'France', flag: '🇫🇷', iso2: 'FR' },
  { name: 'Germany', flag: '🇩🇪', iso2: 'DE' },
  { name: 'Turkey', flag: '🇹🇷', iso2: 'TR' },
  { name: 'Vietnam', flag: '🇻🇳', iso2: 'VN' },
  { name: 'Thailand', flag: '🇹🇭', iso2: 'TH' },
  { name: 'Indonesia', flag: '🇮🇩', iso2: 'ID' },
  { name: 'Pakistan', flag: '🇵🇰', iso2: 'PK' },
  { name: 'Bangladesh', flag: '🇧🇩', iso2: 'BD' },
  { name: 'Egypt', flag: '🇪🇬', iso2: 'EG' },
  { name: 'Nigeria', flag: '🇳🇬', iso2: 'NG' },
  { name: 'South Africa', flag: '🇿🇦', iso2: 'ZA' },
  { name: 'Kenya', flag: '🇰🇪', iso2: 'KE' },
  { name: 'Ethiopia', flag: '🇪🇹', iso2: 'ET' },
  { name: 'Saudi Arabia', flag: '🇸🇦', iso2: 'SA' },
  { name: 'United Arab Emirates', flag: '🇦🇪', iso2: 'AE' },
  { name: 'Qatar', flag: '🇶🇦', iso2: 'QA' },
  { name: 'Kuwait', flag: '🇰🇼', iso2: 'KW' },
  { name: 'Iran', flag: '🇮🇷', iso2: 'IR' },
  { name: 'Iraq', flag: '🇮🇶', iso2: 'IQ' },
  { name: 'Kazakhstan', flag: '🇰🇿', iso2: 'KZ' },
  { name: 'Uzbekistan', flag: '🇺🇿', iso2: 'UZ' },
  { name: 'United Kingdom', flag: '🇬🇧', iso2: 'GB' },
  { name: 'Netherlands', flag: '🇳🇱', iso2: 'NL' },
  { name: 'Italy', flag: '🇮🇹', iso2: 'IT' },
  { name: 'Spain', flag: '🇪🇸', iso2: 'ES' },
  { name: 'Poland', flag: '🇵🇱', iso2: 'PL' },
  { name: 'Romania', flag: '🇷🇴', iso2: 'RO' },
  { name: 'Belgium', flag: '🇧🇪', iso2: 'BE' },
  { name: 'Mexico', flag: '🇲🇽', iso2: 'MX' },
  { name: 'Colombia', flag: '🇨🇴', iso2: 'CO' },
  { name: 'Peru', flag: '🇵🇪', iso2: 'PE' },
  { name: 'Chile', flag: '🇨🇱', iso2: 'CL' },
  { name: 'Japan', flag: '🇯🇵', iso2: 'JP' },
  { name: 'South Korea', flag: '🇰🇷', iso2: 'KR' },
  { name: 'Malaysia', flag: '🇲🇾', iso2: 'MY' },
  { name: 'Philippines', flag: '🇵🇭', iso2: 'PH' },
  { name: 'Singapore', flag: '🇸🇬', iso2: 'SG' },
  { name: 'Sri Lanka', flag: '🇱🇰', iso2: 'LK' },
  { name: 'Nepal', flag: '🇳🇵', iso2: 'NP' },
  { name: 'Myanmar', flag: '🇲🇲', iso2: 'MM' },
  { name: 'Morocco', flag: '🇲🇦', iso2: 'MA' },
  { name: 'Algeria', flag: '🇩🇿', iso2: 'DZ' },
  { name: 'Tunisia', flag: '🇹🇳', iso2: 'TN' },
  { name: 'Ghana', flag: '🇬🇭', iso2: 'GH' },
  { name: 'Tanzania', flag: '🇹🇿', iso2: 'TZ' },
  { name: 'Uganda', flag: '🇺🇬', iso2: 'UG' },
  { name: 'Ivory Coast', flag: '🇨🇮', iso2: 'CI' },
  { name: 'Sudan', flag: '🇸🇩', iso2: 'SD' },
  { name: 'Azerbaijan', flag: '🇦🇿', iso2: 'AZ' },
  { name: 'Georgia', flag: '🇬🇪', iso2: 'GE' },
  { name: 'Afghanistan', flag: '🇦🇫', iso2: 'AF' },
  { name: 'Jordan', flag: '🇯🇴', iso2: 'JO' },
  { name: 'Lebanon', flag: '🇱🇧', iso2: 'LB' },
  { name: 'Oman', flag: '🇴🇲', iso2: 'OM' },
  { name: 'Bahrain', flag: '🇧🇭', iso2: 'BH' },
  { name: 'Yemen', flag: '🇾🇪', iso2: 'YE' },
  { name: 'Portugal', flag: '🇵🇹', iso2: 'PT' },
  { name: 'Greece', flag: '🇬🇷', iso2: 'GR' },
  { name: 'Hungary', flag: '🇭🇺', iso2: 'HU' },
  { name: 'Bulgaria', flag: '🇧🇬', iso2: 'BG' },
  { name: 'Serbia', flag: '🇷🇸', iso2: 'RS' },
  { name: 'Sweden', flag: '🇸🇪', iso2: 'SE' },
  { name: 'Denmark', flag: '🇩🇰', iso2: 'DK' },
  { name: 'Ireland', flag: '🇮🇪', iso2: 'IE' },
  { name: 'Switzerland', flag: '🇨🇭', iso2: 'CH' },
  { name: 'Austria', flag: '🇦🇹', iso2: 'AT' },
  { name: 'New Zealand', flag: '🇳🇿', iso2: 'NZ' },
];

const curatedIso2 = new Set(COUNTRIES.map((c) => c.iso2));

/**
 * Picker options: the curated head in trade-relevance order, then every other
 * ISO country alphabetically. Names-only, so the whole list is a few KB.
 */
export const ALL_COUNTRIES: Country[] = [
  ...COUNTRIES,
  ...ISO_COUNTRIES.filter((c) => !curatedIso2.has(c.iso2)),
];

const byLowerName = new Map(ALL_COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

/** Resolve a stored country name to its entry, tolerating case differences. */
export function findCountry(name?: string | null): Country | undefined {
  if (!name) return undefined;
  return byLowerName.get(name.trim().toLowerCase());
}

/** Look up a country's flag by its stored name (empty string when unknown). */
export const countryFlag = (name?: string | null): string => findCountry(name)?.flag ?? '';

/** ISO2 for a stored country name, or undefined when we do not recognise it. */
export const countryIso2 = (name?: string | null): string | undefined => findCountry(name)?.iso2;
