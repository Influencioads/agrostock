import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { createWebI18n } from '@agrotraders/i18n/init-web';
import { isRtl, LOCALES, LOCALE_LABELS, type Lang } from '@agrotraders/i18n';
import { api } from '../lib/api';

export type { Lang };

/** One instance for the whole app; `<I18nextProvider>` hands it to `useTranslation`. */
const i18n = createWebI18n();

/** Namespaces `useI18n().t` can reach without an explicit prefix falling back to `web`. */
const NS = ['web', 'common', 'nav', 'enums', 'errors', 'attrs'] as const;

/** Keeps `<html lang>`/`<html dir>` in step with the active locale (Arabic is RTL). */
function DocumentLang() {
  const { i18n: instance } = useTranslation();
  const lang = instance.language;
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
  }, [lang]);
  return null;
}

/**
 * Refetches server data when the locale changes.
 *
 * Product names, requirements, chat messages and the like are translated by the
 * API, which picks the locale off `Accept-Language`. React Query caches those
 * responses under keys that (deliberately) carry no locale, so without this the
 * previous language's rows would stay on screen until something happened to
 * refetch — the switch looked half-applied and only a page reload fixed it.
 * Invalidating marks every query stale, so active ones refetch with the new
 * header and the rest refresh next time they mount. The first run is skipped:
 * on mount the language has not changed, and invalidating would throw away the
 * cache the app just filled.
 */
function RefetchOnLocaleChange() {
  const { i18n: instance } = useTranslation();
  const queryClient = useQueryClient();
  const lang = instance.language;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    void queryClient.invalidateQueries();
  }, [lang, queryClient]);

  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <DocumentLang />
      <RefetchOnLocaleChange />
      {children}
    </I18nextProvider>
  );
}

export function useI18n() {
  const { t, i18n: instance } = useTranslation([...NS]);

  // Preload the target locale's chunks before switching, otherwise the render
  // between `changeLanguage` and the fetch resolving would show raw keys.
  const setLang = useCallback(
    async (next: Lang) => {
      await instance.loadLanguages(next);
      await instance.changeLanguage(next);
      // Persist to the signed-in user's profile so server-rendered content
      // (notifications, push, email) reaches them in this language on every device.
      if (localStorage.getItem('token')) void api.me.setLocale(next).catch(() => {});
    },
    [instance],
  );

  const toggle = useCallback(() => {
    void setLang(instance.language === 'en' ? 'ru' : 'en');
  }, [instance, setLang]);

  return { lang: instance.language as Lang, t, setLang, toggle };
}

/** Compact header dropdown for picking the interface language (all supported locales). */
export function LanguageSelect({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      value={lang}
      onChange={(e) => void setLang(e.target.value as Lang)}
      title={t('common:language')}
      className={
        'h-9 cursor-pointer rounded-md border border-surface-border bg-white px-2 font-numeric text-sm font-bold text-ink hover:border-brand-leaf ' +
        className
      }
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
