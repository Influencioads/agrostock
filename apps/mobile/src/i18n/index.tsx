import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { DevSettings, I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';
import { I18nextProvider, useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { createNativeI18n } from '@agrotraders/i18n/init-native';
import { FALLBACK_LNG, LOCALES, detectLang, isLang, isRtl, type Lang } from '@agrotraders/i18n';
import { storage } from '../lib/storage';
import { queryClient } from '../lib/queryClient';
import { api, getApiToken, setApiLocale } from '../lib/api';

export type { Lang };

/** SecureStore keys must be alphanumeric + underscore, so this is not plain `lang`. */
const LANG_KEY = 'agrotraders_lang';

/** Namespaces `useI18n().t` can reach; unprefixed keys fall back to `mobile`. */
const NS = ['mobile', 'common', 'nav', 'enums', 'errors'] as const;

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

/**
 * The active locale, readable outside the React tree — style helpers need it to
 * decide script-dependent things (see `theme/casing.ts`) without becoming hooks.
 */
export function currentLang(): Lang {
  const l = globalI18n?.language;
  return l && isLang(l) ? l : FALLBACK_LNG;
}

/**
 * First supported locale matching the device's language preferences; failing
 * that, the locale we publish for the region the device says it is in (so a
 * phone set to Uzbek in Tashkent opens in Russian, not English).
 */
function deviceLang(): Lang {
  const locales = getLocales();
  return detectLang(
    locales.map((l) => l.languageTag),
    locales.find((l) => l.regionCode)?.regionCode,
  );
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
  const [lang, setLangState] = useState<string>(FALLBACK_LNG);

  useEffect(() => {
    let cancelled = false;
    void resolveInitialLang().then((lang) => {
      if (cancelled) return;
      setApiLocale(lang);
      I18nManager.allowRTL(true);
      const instance = createNativeI18n(lang);
      globalI18n = instance;
      setLangState(lang);
      setI18n(instance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!i18n) return;
    i18n.on('languageChanged', setLangState);
    return () => i18n.off('languageChanged', setLangState);
  }, [i18n]);

  // Reading the stored locale is a single async storage hit; rendering the tree
  // before it resolves would flash English at a Russian user.
  if (!i18n) return null;

  return (
    <I18nextProvider i18n={i18n}>
      {/*
        Keying the whole tree on the locale is the mobile equivalent of the web's
        `window.location.reload()` (see `apps/web/src/i18n/index.tsx`): swapping the
        catalog in place left the switch half-applied, because anything holding text
        in state, in a closure or in a memo keyed on something other than the locale
        kept the old language until it happened to re-render. Remounting rebuilds
        every screen, context and cached string in one language, from scratch.
        Auth lives above this provider, so the session survives; navigation does not,
        so the user lands back on the first tab — the same reset a web reload causes.
      */}
      <Fragment key={lang}>{children}</Fragment>
    </I18nextProvider>
  );
}

export function useI18n(): I18nValue {
  const { t, i18n } = useTranslation([...NS]);

  const setLang = useCallback(
    async (next: Lang): Promise<boolean> => {
      // Persist before touching I18nManager: forcing RTL restarts the app, and an
      // unsaved choice would be lost on the way back up.
      await storage.set(LANG_KEY, next);
      setApiLocale(next);
      // API-translated rows (product names, chat, requirements) are cached under
      // keys that carry no locale, so the remount below would re-serve them in the
      // old language. Dropped, not invalidated: nothing should render stale-then-swap.
      queryClient.clear();
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
