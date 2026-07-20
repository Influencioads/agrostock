import { useCallback, useEffect, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { createAdminI18n } from '@agrotraders/i18n/init-admin';
import { isRtl, LOCALES, LOCALE_LABELS, type Lang } from '@agrotraders/i18n';

export type { Lang };

/** One instance for the whole app; `<I18nextProvider>` hands it to `useTranslation`. */
const i18n = createAdminI18n();

/** Namespaces `useI18n().t` can reach; unprefixed keys fall back to `admin`. */
const NS = ['admin', 'common', 'nav', 'enums', 'errors'] as const;

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

  // Preload the target locale's chunks before switching, otherwise the render
  // between `changeLanguage` and the fetch resolving would show raw keys.
  const setLang = useCallback(
    async (next: Lang) => {
      await instance.loadLanguages(next);
      await instance.changeLanguage(next);
    },
    [instance],
  );

  const toggle = useCallback(() => {
    void setLang(instance.language === 'en' ? 'ru' : 'en');
  }, [instance, setLang]);

  return { lang: instance.language as Lang, t, setLang, toggle };
}

/** Header dropdown for picking the interface language (all supported locales). */
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
