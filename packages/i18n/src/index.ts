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

