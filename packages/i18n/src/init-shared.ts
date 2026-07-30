import i18next, { type i18n as I18nInstance, type ResourceLanguage } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { FALLBACK_LNG, LANG_STORAGE_KEY, LOCALES, detectLang, type Namespace } from './index';

/**
 * Replaces the stock `navigator` detector.
 *
 * The stock one just hands i18next `navigator.languages` and lets `fallbackLng`
 * mop up, so a device set to a language we do not publish always lands on
 * English — even in Moscow or Riyadh. This resolves the language first and only
 * then falls back to *where the browser is*, taken from the region subtag and
 * the IANA time zone. Both are already in the page; neither prompts, and no
 * request leaves the browser.
 */
const deviceDetector = {
  name: 'device',
  lookup(): string {
    const tags = navigator.languages?.length ? [...navigator.languages] : [navigator.language];
    return detectLang(tags, timeZoneRegion());
  },
};

/**
 * Country implied by the browser's time zone — the machine's actual location,
 * unlike the language list, which is a preference. `Intl` exposes no
 * zone→country mapping, hence the table.
 */
function timeZoneRegion(): string | null {
  try {
    // ponytail: only zones for countries whose language we publish; every other
    // zone falls through to English, which is where it would have landed anyway.
    return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? null;
  } catch {
    return null;
  }
}

/** Zones for the countries whose language we publish, keyed by IANA name. */
const TZ_COUNTRY: Record<string, string> = {
  'Europe/Moscow': 'RU', 'Europe/Kaliningrad': 'RU', 'Europe/Samara': 'RU', 'Asia/Yekaterinburg': 'RU',
  'Asia/Novosibirsk': 'RU', 'Asia/Krasnoyarsk': 'RU', 'Asia/Irkutsk': 'RU', 'Asia/Vladivostok': 'RU',
  'Europe/Minsk': 'BY', 'Asia/Almaty': 'KZ', 'Asia/Bishkek': 'KG', 'Asia/Tashkent': 'UZ', 'Asia/Dushanbe': 'TJ',
  'Asia/Ashgabat': 'TM', 'Asia/Yerevan': 'AM', 'Asia/Baku': 'AZ', 'Asia/Tbilisi': 'GE', 'Europe/Chisinau': 'MD',
};

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
  const detector = new LanguageDetector();
  detector.addDetector(deviceDetector);

  // Deliberately no `initReactI18next`: that plugin lives in whichever copy of
  // react-i18next this package resolves, which under pnpm is not the copy the
  // app renders with. The app passes this instance to <I18nextProvider> instead.
  void instance
    .use(resourcesToBackend((lng: string, namespace: string) => load(lng, namespace)))
    .use(detector)
    .init({
      ns,
      defaultNS,
      fallbackLng: FALLBACK_LNG,
      supportedLngs: [...LOCALES],
      resources: { en: eagerEn },
      // `resources` above only covers `en`; the backend supplies the rest.
      partialBundledLanguages: true,
      detection: {
        order: ['localStorage', 'device'],
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
