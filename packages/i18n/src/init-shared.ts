import i18next, { type i18n as I18nInstance, type ResourceLanguage } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { FALLBACK_LNG, LANG_STORAGE_KEY, LOCALES, type Namespace } from './index';

export interface BrowserI18nOptions {
  ns: Namespace[];
  defaultNS: Namespace;
  /** English catalogs inlined into the initial bundle so first paint never flashes keys. */
  eagerEn: ResourceLanguage;
  /** Fetches one (locale, namespace) JSON chunk on demand. */
  load: (lng: string, ns: string) => Promise<unknown>;
}

/**
 * Builds a browser i18next instance: English is bundled, every other locale is
 * fetched as its own chunk on first use.
 */
export function createBrowserI18n({ ns, defaultNS, eagerEn, load }: BrowserI18nOptions): I18nInstance {
  const instance = i18next.createInstance();

  // Deliberately no `initReactI18next`: that plugin lives in whichever copy of
  // react-i18next this package resolves, which under pnpm is not the copy the
  // app renders with. The app passes this instance to <I18nextProvider> instead.
  void instance
    .use(resourcesToBackend((lng: string, namespace: string) => load(lng, namespace)))
    .use(LanguageDetector)
    .init({
      ns,
      defaultNS,
      fallbackLng: FALLBACK_LNG,
      supportedLngs: [...LOCALES],
      resources: { en: eagerEn },
      // `resources` above only covers `en`; the backend supplies the rest.
      partialBundledLanguages: true,
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: LANG_STORAGE_KEY,
        caches: ['localStorage'],
      },
      interpolation: { escapeValue: false },
      // The app tree has no Suspense boundary; `setLang` preloads before switching.
      react: { useSuspense: false },
      returnNull: false,
    });

  return instance;
}
