/**
 * Shared i18n configuration for web, admin, mobile and the API.
 *
 * This module is runtime-free (no i18next import) so the NestJS API can read
 * the locale/namespace constants without pulling in a client runtime.
 * Message catalogs live as JSON under `../locales/<locale>/<namespace>.json`.
 */

/**
 * Supported locales. `en` is the source of truth; the rest are translated from it.
 *
 * This list is the single switch for what the product publishes: it drives the
 * language pickers, i18next's `supportedLngs`, `isLang` (so a stale `es` in a
 * user row or an `Accept-Language` header falls back to English), and the API's
 * machine-translation targets. Adding a locale back means adding it here, to
 * `Lang` in `@agrotraders/types`, and to `PROVIDERS` in `scripts/translate.mjs`.
 */
export const LOCALES = ['en', 'ru'] as const;
export type Lang = (typeof LOCALES)[number];

/** Locale names written in their own language, for the language picker. */
export const LOCALE_LABELS: Record<Lang, string> = {
  en: 'English',
  ru: 'Русский',
};

/**
 * Right-to-left locales. Drives `dir="rtl"` on web and `I18nManager` on mobile.
 * Empty while we publish only English and Russian; the plumbing stays so
 * re-adding Arabic or Persian is a one-line change here.
 */
export const RTL_LOCALES: readonly string[] = [];

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale);
}

export function isLang(value: string): value is Lang {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Namespaces are loaded per app so a web locale chunk never ships admin copy.
 *   common/nav/enums/errors — shared core, loaded everywhere
 *   validation              — API only
 *   web/admin/mobile        — one per app
 *
 * There is deliberately no `attrs` namespace: product attribute labels and
 * options are admin-editable DB rows now, and the API ships them already
 * localized on the category tree and on `product.attributeSpecs`.
 */
export const NAMESPACES = ['common', 'nav', 'enums', 'errors', 'validation', 'web', 'admin', 'mobile'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Namespaces every client loads. */
export const CORE_NAMESPACES: readonly Namespace[] = ['common', 'nav', 'enums', 'errors'];

export const FALLBACK_LNG: Lang = 'en';

/** localStorage / SecureStore key holding the user's chosen locale. */
export const LANG_STORAGE_KEY = 'lang';

/**
 * Country (ISO 3166-1 alpha-2) → the locale we serve there, for visitors whose
 * device language we do not support. Only countries where one of our published
 * locales is an official or majority working language are listed; everywhere
 * else `langForCountry` returns English, which is the whole point of the table
 * being a lookup rather than a guess.
 *
 * `en` is deliberately absent: it is the fallback, so listing US/GB/IN-style
 * entries would only be noise.
 */
const COUNTRY_LANG: Record<string, Lang> = {
  // Russian — the post-Soviet states where it remains the trade lingua franca.
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', TJ: 'ru', TM: 'ru', UZ: 'ru', AM: 'ru', AZ: 'ru', GE: 'ru', MD: 'ru',
};

/**
 * The locale to serve a visitor located in `country`, or English when we do not
 * publish their language. Case-insensitive; empty/unknown input yields English.
 */
export function langForCountry(country: string | null | undefined): Lang {
  return COUNTRY_LANG[(country ?? '').trim().toUpperCase()] ?? FALLBACK_LNG;
}

/**
 * Best locale for a device, from its BCP 47 language tags (most preferred
 * first) and, failing those, the region it reports.
 *
 * The language tags win: a Russian speaker travelling through Frankfurt should
 * still get Russian. Only when *none* of them is a locale we publish does
 * location decide — that is the case where the alternative is English anyway,
 * so an Uzbek (`uz-UZ`) device gets Russian instead of nothing.
 */
export function detectLang(tags: readonly string[], region?: string | null): Lang {
  for (const tag of tags) {
    if (isLang(tag)) return tag;
    const base = tag.split('-')[0];
    if (isLang(base)) return base;
  }
  // Region subtag of the top preference (`en-RU` → RU) before the explicit one.
  const fromTag = tags[0]?.split('-').slice(1).find((p) => /^[A-Za-z]{2}$/.test(p));
  const byTag = langForCountry(fromTag);
  return byTag === FALLBACK_LNG ? langForCountry(region) : byTag;
}

