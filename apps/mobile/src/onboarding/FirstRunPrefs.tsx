import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLocales } from 'expo-localization';
import { CURRENCIES, SYMBOLS } from '@agrotraders/api-client';
import { LOCALE_LABELS, LOCALES } from '@agrotraders/i18n';
import { useAuth } from '../auth/AuthProvider';
import { useCurrency } from '../currency/CurrencyContext';
import { useI18n } from '../i18n';
import { storage } from '../lib/storage';
import { C, space, type } from '../theme/tokens';
import { Button, Chip } from '../ui';
import { BrandTile } from '../ui/BrandLogo';

/** Set once the first-launch language/currency choice has been made. */
const DONE_KEY = 'agrotraders_prefs_chosen';
/** CurrencyProvider's own key — read here only to avoid overriding a stored pick. */
const CURRENCY_KEY = 'agrotraders_currency';

/**
 * Asks a fresh install for its language and currency before the first screen.
 * Shown once: the flag survives restarts, and a signed-in user (an existing
 * install that updated) is never asked. Picking a language remounts the whole
 * tree (see I18nProvider), which re-runs this gate — the flag is still unset,
 * so the screen simply comes back in the chosen language.
 */
export function FirstRunGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    void storage
      .get(DONE_KEY)
      .catch(() => null)
      .then((v) => setDone(!!v || !!user));
  }, [user]);

  if (done === null) return <View style={{ flex: 1, backgroundColor: C.page }} />;
  if (done) return <>{children}</>;
  return (
    <PrefsScreen
      onDone={() => {
        void storage.set(DONE_KEY, '1').catch(() => {});
        setDone(true);
      }}
    />
  );
}

function PrefsScreen({ onDone }: { onDone: () => void }) {
  const { t, lang, setLang } = useI18n();
  const { currency, setCurrency } = useCurrency();

  // Suggest the phone's own currency, but never over one already picked (this
  // screen remounts after a language switch, before the stored value reloads).
  useEffect(() => {
    const device = getLocales()[0]?.currencyCode;
    if (!device || !(CURRENCIES as readonly string[]).includes(device)) return;
    void storage
      .get(CURRENCY_KEY)
      .catch(() => null)
      .then((stored) => !stored && setCurrency(device));
  }, [setCurrency]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.page }}>
      <ScrollView contentContainerStyle={s.body}>
        <BrandTile size={72} />
        <Text style={s.title}>{t('firstRun.title')}</Text>
        <Text style={s.lead}>{t('firstRun.body')}</Text>

        <Text style={s.label}>{t('common:language')}</Text>
        <View style={s.wrap}>
          {LOCALES.map((l) => (
            <Chip key={l} label={LOCALE_LABELS[l]} active={l === lang} onPress={() => void setLang(l)} />
          ))}
        </View>

        <Text style={s.label}>{t('hub.displayCurrency')}</Text>
        <View style={s.wrap}>
          {CURRENCIES.map((c) => (
            <Chip key={c} label={`${SYMBOLS[c] ?? ''} ${c}`.trim()} active={c === currency} onPress={() => setCurrency(c)} />
          ))}
        </View>
      </ScrollView>
      <View style={s.footer}>
        <Text style={s.hint}>{t('firstRun.hint')}</Text>
        <Button full size="lg" title={t('firstRun.continue')} icon="arrow-forward" iconRight onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, paddingTop: space.xxl, gap: space.md, alignItems: 'flex-start' },
  title: { ...type.display, color: C.ink, marginTop: space.lg },
  lead: { ...type.body, fontSize: 15, lineHeight: 22, color: C.inkSoft },
  label: { ...type.h3, color: C.ink, marginTop: space.lg },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { padding: space.xl, paddingTop: space.md, gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, backgroundColor: C.page },
  hint: { ...type.caption, color: C.inkSoft, textAlign: 'center' },
});
