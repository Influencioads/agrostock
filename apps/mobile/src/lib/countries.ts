import { ALL_COUNTRIES, countryLabel } from '@agrotraders/geo';

const byLang = new Map<string, { value: string; label: string }[]>();

/**
 * Picker options for every country picker on mobile, labelled in the reader's
 * language. The English name stays the VALUE — that is what gets persisted and
 * what the directory/catalog filters match on. Built once per language.
 */
export function countryOptions(lang: string) {
  let options = byLang.get(lang);
  if (!options) {
    options = ALL_COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag} ${countryLabel(c.name, lang)}` }));
    byLang.set(lang, options);
  }
  return options;
}
