import { useCallback, useEffect, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { createWebI18n } from '@agrotraders/i18n/init-web';
import { isRtl, LANG_STORAGE_KEY, LOCALES, LOCALE_LABELS, type Lang } from '@agrotraders/i18n';
import { api } from '../lib/api';

export type { Lang };

/** One instance for the whole app; `<I18nextProvider>` hands it to `useTranslation`. */
const i18n = createWebI18n();

/** Namespaces `useI18n().t` can reach without an explicit prefix falling back to `web`. */
const NS = ['web', 'common', 'nav', 'enums', 'errors'] as const;

/** Keeps `<html lang>`/`<html dir>` in step with the active locale. */
function DocumentLang() {
  const { i18n: instance } = useTranslation();
  const lang = instance.language;
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
  }, [lang]);
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <DocumentLang />
      {children}
    </I18nextProvider>
  );
}

export function useI18n() {
  const { t, i18n: instance } = useTranslation([...NS]);

  /**
   * Switches language by persisting the choice and reloading the page.
   *
   * Swapping the catalog in place (`changeLanguage` + invalidating React Query)
   * left the switch half-applied: anything holding text in state, in a closure,
   * in a memo keyed on something other than the locale, or in a suspended/
   * unmounted query kept the old language until it happened to re-render, and
   * server-translated rows arrived out of step with the UI strings. A reload
   * rebuilds the whole tree — the app boots in one language, from scratch.
   */
  const setLang = useCallback(
    async (next: Lang) => {
      if (next === instance.language) return;
      // Written here rather than left to i18next's detector cache because the
      // reload has to find the choice already stored.
      localStorage.setItem(LANG_STORAGE_KEY, next);
      // Persist to the signed-in user's profile so server-rendered content
      // (notifications, push, email) reaches them in this language on every
      // device. Awaited, not fired-and-forgotten: the reload would abort it.
      if (localStorage.getItem('token')) await api.me.setLocale(next).catch(() => {});
      window.location.reload();
    },
    [instance],
  );

  const toggle = useCallback(() => {
    void setLang(instance.language === 'en' ? 'ru' : 'en');
  }, [instance, setLang]);

  return { lang: instance.language as Lang, t, setLang, toggle };
}

/** Compact header dropdown for picking the interface language (English and Russian). */
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
