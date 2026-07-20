import i18next, { type i18n as I18nInstance } from 'i18next';
import { FALLBACK_LNG, LOCALES, type Namespace } from './index';
import { resources } from './resources.native';

const NS: Namespace[] = ['mobile', 'common', 'nav', 'enums', 'errors', 'attrs'];

/**
 * Builds the React Native i18next instance. Every catalog is already bundled
 * (see `resources.native.ts`), so there is no backend and no async load — the
 * caller resolves the starting locale from storage/device first and passes it in.
 *
 * As in the browser entries, `initReactI18next` is deliberately omitted: the app
 * passes this instance to `<I18nextProvider>` so both sides share one react-i18next copy.
 */
export function createNativeI18n(lng: string): I18nInstance {
  const instance = i18next.createInstance();

  void instance.init({
    resources,
    lng,
    ns: NS,
    defaultNS: 'mobile',
    fallbackLng: FALLBACK_LNG,
    supportedLngs: [...LOCALES],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnNull: false,
  });

  return instance;
}
