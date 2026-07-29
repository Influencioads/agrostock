/**
 * Shared i18n configuration for web, admin, mobile and the API.
 *
 * This module is runtime-free (no i18next import) so the NestJS API can read
 * the locale/namespace constants without pulling in a client runtime.
 * Message catalogs live as JSON under `../locales/<locale>/<namespace>.json`.
 */

/** Supported locales. `en` is the source of truth; the rest are translated from it. */
export const LOCALES = ['en', 'ru', 'zh-Hans', 'es', 'hi', 'ar', 'pt', 'fr', 'de', 'ja', 'fa'] as const;
export type Lang = (typeof LOCALES)[number];

/** Locale names written in their own language, for the language picker. */
export const LOCALE_LABELS: Record<Lang, string> = {
  en: 'English',
  ru: 'Русский',
  'zh-Hans': '简体中文',
  es: 'Español',
  hi: 'हिन्दी',
  ar: 'العربية',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  fa: 'فارسی',
};

/** Right-to-left locales. Drives `dir="rtl"` on web and `I18nManager` on mobile. */
export const RTL_LOCALES: readonly string[] = ['ar', 'fa'];

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
 *   attrs                   — product attribute labels/options (generated)
 */
export const NAMESPACES = ['common', 'nav', 'enums', 'errors', 'validation', 'web', 'admin', 'mobile', 'attrs'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/**
 * Key for a product-attribute label/option in the `attrs` namespace.
 *
 * Attribute text lives in the generated ATTRIBUTE_SCHEMA as English, and the DB
 * stores those English values (filters match on them) — so only the *display*
 * is translated: `t('attrs:option.' + attrKey(value))`. Spelling variants of one
 * concept ("Powder (ground)" / "Powder/ground") slug together on purpose and
 * share a translation. Must stay in sync with `scripts/gen-attrs.mjs`.
 */
export function attrKey(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'x'
  );
}

/** Namespaces every client loads. */
export const CORE_NAMESPACES: readonly Namespace[] = ['common', 'nav', 'enums', 'errors'];

export const FALLBACK_LNG: Lang = 'en';

/** localStorage / SecureStore key holding the user's chosen locale. */
export const LANG_STORAGE_KEY = 'lang';

/**
 * Country (ISO 3166-1 alpha-2) → the locale we serve there, for visitors whose
 * device language we do not support. Only countries where one of our eleven
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
  // Chinese. TW/HK/MO read Traditional, but Simplified beats English for them.
  CN: 'zh-Hans', TW: 'zh-Hans', HK: 'zh-Hans', MO: 'zh-Hans', SG: 'zh-Hans',
  // Spanish.
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', VE: 'es', CL: 'es', EC: 'es', GT: 'es', CU: 'es',
  BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', GQ: 'es',
  // Hindi.
  IN: 'hi',
  // Arabic.
  SA: 'ar', AE: 'ar', EG: 'ar', DZ: 'ar', MA: 'ar', IQ: 'ar', SD: 'ar', SY: 'ar', YE: 'ar', TN: 'ar',
  JO: 'ar', LY: 'ar', LB: 'ar', PS: 'ar', OM: 'ar', KW: 'ar', MR: 'ar', QA: 'ar', BH: 'ar', DJ: 'ar', KM: 'ar', EH: 'ar',
  // Portuguese.
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',
  // French.
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', HT: 'fr', CD: 'fr', CI: 'fr', CM: 'fr', MG: 'fr', NE: 'fr',
  BF: 'fr', ML: 'fr', SN: 'fr', TD: 'fr', GN: 'fr', RW: 'fr', BJ: 'fr', BI: 'fr', TG: 'fr', CF: 'fr',
  CG: 'fr', GA: 'fr', NC: 'fr', PF: 'fr', RE: 'fr', GP: 'fr', MQ: 'fr', GF: 'fr', YT: 'fr',
  // German.
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  // Japanese.
  JP: 'ja',
  // Persian.
  IR: 'fa', AF: 'fa',
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

