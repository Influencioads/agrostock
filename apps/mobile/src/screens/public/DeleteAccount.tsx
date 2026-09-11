import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ApiDeletionPreflight } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card, EmptyState, Input, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import { errMessage } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';

/**
 * Self-service account deletion (App Store Guideline 5.1.1(v)): an app that
 * creates accounts must let the user start deletion from inside the app.
 *
 * Three gates, in the order Apple's reviewers walk them: we first show what
 * still blocks deletion (open orders, live auctions, held escrow, wallet
 * balance) so nobody is refused without being told why, then re-authenticate
 * with the password, then take an explicit confirmation. The server re-checks
 * all three — this screen is the explanation, not the enforcement.
 */
export function DeleteAccount() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { fmtMinor } = useCurrency();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const preflight = useQuery<ApiDeletionPreflight>({
    queryKey: ['me', 'deletion-preflight'],
    queryFn: () => api.me.deletionPreflight(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <Screen>
        <EmptyState icon="person-outline" title={t('pubX.deleteAccount.signIn')} />
      </Screen>
    );
  }

  const blockers = preflight.data?.blockers ?? [];
  // A failed preflight must NOT wedge the screen: `canDelete` used to be
  // `data?.canDelete === true`, so any network error left the button disabled with
  // nothing on screen explaining why and no way to retry — an account that could
  // not be deleted because a GET failed. The preflight is an explanation, not the
  // enforcement; the server re-checks every blocker on DELETE. So on error we let
  // the request through and surface whatever the server says.
  const canDelete = preflight.isError || preflight.data?.canDelete === true;

  const confirmAndDelete = () => {
    // The OS dialog is the point of no return, so it carries the plain-language
    // consequence rather than just "OK / Cancel".
    Alert.alert(
      t('pubX.deleteAccount.confirmTitle'),
      t('pubX.deleteAccount.confirmBody'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('pubX.deleteAccount.confirmCta'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setError('');
            try {
              const res = await api.me.deleteAccount(password);
              // Say it plainly first. `logout()` nulls `user`, at which point this
              // screen falls through to its "sign in to manage your account" empty
              // state — which, arriving unannounced, reads like the delete failed.
              Alert.alert(
                t('pubX.deleteAccount.doneTitle'),
                t(res?.erased === 'anonymized' ? 'pubX.deleteAccount.doneAnonymized' : 'pubX.deleteAccount.doneDeleted'),
              );
              // Tears down the session and unregisters the push token, so the
              // device stops receiving notifications for the dead account.
              await logout();
            } catch (e) {
              setError(errMessage(e, t('pubX.deleteAccount.failed')));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <Card>
        <Row gap={8}>
          <Ionicons name="warning-outline" size={20} color={C.error} />
          <Txt variant="h3" style={s.grow}>{t('pubX.deleteAccount.title')}</Txt>
        </Row>
        <Txt variant="small" color={C.inkSoft} style={s.mt8}>{t('pubX.deleteAccount.body')}</Txt>
      </Card>

      {preflight.isLoading ? (
        <Card style={s.mt12}><SkeletonRows /></Card>
      ) : preflight.isError ? (
        <Card style={s.mt12}>
          <Txt variant="small" color={C.inkSoft}>{t('pubX.deleteAccount.preflightFailed')}</Txt>
        </Card>
      ) : blockers.length > 0 ? (
        <Card style={s.blockCard}>
          <Txt variant="label" color={C.error}>{t('pubX.deleteAccount.blockedTitle')}</Txt>
          <Txt variant="small" color={C.inkSoft} style={s.mt8}>{t('pubX.deleteAccount.blockedBody')}</Txt>
          <View style={s.mt12}>
            {blockers.map((b) => (
              <Row key={b.code} gap={8} style={s.blockRow}>
                <Ionicons name="alert-circle-outline" size={16} color={C.error} />
                <Txt variant="small" style={s.grow}>
                  {b.code === 'wallet_balance'
                    ? t('pubX.deleteAccount.blocker.wallet_balance', { amount: fmtMinor(b.count) })
                    : t(`pubX.deleteAccount.blocker.${b.code}`, { count: b.count })}
                </Txt>
              </Row>
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={s.mt12}>
        <Txt variant="label">{t('pubX.deleteAccount.confirmPassword')}</Txt>
        <Txt variant="small" color={C.inkSoft} style={s.mt8}>{t('pubX.deleteAccount.passwordHint')}</Txt>
        <Input
          icon="lock-closed-outline"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          placeholder={t('pubX.deleteAccount.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          style={s.mt12}
        />
        {error ? <Txt variant="small" color={C.error} style={s.mt8}>{error}</Txt> : null}
        <Button
          title={t('pubX.deleteAccount.cta')}
          variant="danger"
          full
          icon="trash-outline"
          disabled={!password || !canDelete || busy}
          loading={busy}
          onPress={confirmAndDelete}
        />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  mt8: { marginTop: space.sm },
  mt12: { marginTop: space.md },
  blockCard: { marginTop: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.error, borderRadius: radius.md },
  blockRow: { paddingVertical: space.xs },
});
