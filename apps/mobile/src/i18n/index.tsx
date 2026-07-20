import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { DevSettings, I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { i18n as I18nInstance } from 'i18next';
import { createNativeI18n } from '@agrotraders/i18n/init-native';
import { FALLBACK_LNG, LOCALES, isLang, isRtl, type Lang } from '@agrotraders/i18n';
import { storage } from '../lib/storage';
import { api, getApiToken, setApiLocale } from '../lib/api';

export type { Lang };

/** SecureStore keys must be alphanumeric + underscore, so this is not plain `lang`. */
const LANG_KEY = 'agrotraders_lang';

/** Namespaces `useI18n().t` can reach; unprefixed keys fall back to `mobile`. */
const NS = ['mobile', 'common', 'nav', 'enums', 'errors', 'attrs'] as const;

/**
 * The live i18next instance, for non-component modules (e.g. `lib/push.ts`)
 * that need a translation outside the React tree. Null until `I18nProvider`
 * has created the instance, so callers must provide an English fallback.
 */
let globalI18n: I18nInstance | null = null;

/** Translate `key` with the app's current locale, or `fallback` before i18n boots. */
export function translateGlobal(key: string, fallback: string): string {
  return globalI18n ? globalI18n.t(key, { defaultValue: fallback }) : fallback;
}

/** First supported locale matching the device: exact tag, then bare language code. */
function deviceLang(): Lang {
  for (const { languageTag, languageCode } of getLocales()) {
    if (isLang(languageTag)) return languageTag;
    if (languageCode && isLang(languageCode)) return languageCode;
  }
  return FALLBACK_LNG;
}

async function resolveInitialLang(): Promise<Lang> {
  // A storage failure must not leave the tree stuck on `null` forever.
  const stored = await storage.get(LANG_KEY).catch(() => null);
  return stored && isLang(stored) ? stored : deviceLang();
}

interface I18nValue {
  lang: Lang;
  t: I18nInstance['t'];
  /** Resolves `true` when the text direction changed and the app must restart to apply it. */
  setLang: (next: Lang) => Promise<boolean>;
  toggle: () => void;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [i18n, setI18n] = useState<I18nInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveInitialLang().then((lang) => {
      if (cancelled) return;
      setApiLocale(lang);
      I18nManager.allowRTL(true);
      const instance = createNativeI18n(lang);
      globalI18n = instance;
      setI18n(instance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reading the stored locale is a single async storage hit; rendering the tree
  // before it resolves would flash English at a Russian user.
  if (!i18n) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <RefetchOnLocaleChange />
      {children}
    </I18nextProvider>
  );
}

/**
 * Refetches server data when the locale changes.
 *
 * Product names, requirements, chat messages and the like are translated by the
 * API, which picks the locale off `Accept-Language` (see `setApiLocale`). React
 * Query caches those responses under keys that (deliberately) carry no locale,
 * so without this the previous language's rows would stay on screen until
 * something happened to refetch. Invalidating marks every query stale, so active
 * ones refetch with the new header and the rest refresh next time they mount.
 * The first run is skipped: on mount the language has not changed, and
 * invalidating would throw away the cache the app just filled.
 */
function RefetchOnLocaleChange() {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const lang = i18n.language;
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

export function useI18n(): I18nValue {
  const { t, i18n } = useTranslation([...NS]);

  const setLang = useCallback(
    async (next: Lang): Promise<boolean> => {
      // Persist before touching I18nManager: forcing RTL restarts the app, and an
      // unsaved choice would be lost on the way back up.
      await storage.set(LANG_KEY, next);
      setApiLocale(next);
      await i18n.changeLanguage(next);
      // Persist to the signed-in user's profile so server-rendered content
      // (notifications, push, email) reaches them in this language on every device.
      if (getApiToken()) void api.me.setLocale(next).catch(() => {});

      const flipsDirection = isRtl(next) !== I18nManager.isRTL;
      if (!flipsDirection) return false;

      I18nManager.allowRTL(isRtl(next));
      I18nManager.forceRTL(isRtl(next));
      // Layout direction only takes effect after a full JS reload. There is no
      // expo-updates here, so release builds have to be restarted by the user.
      if (__DEV__) {
        DevSettings.reload();
        return false;
      }
      return true;
    },
    [i18n],
  );

  const toggle = useCallback(() => {
    void setLang(i18n.language === 'en' ? 'ru' : 'en');
  }, [i18n, setLang]);

  return { lang: i18n.language as Lang, t, setLang, toggle };
}

export { LOCALES };
