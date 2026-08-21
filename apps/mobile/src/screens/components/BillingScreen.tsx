import { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiBillingCycle, ApiBillingOverview, ApiGateway, ApiPlan, ApiQuotaRow } from '@agrotraders/api-client';
import { BILLING_CYCLES } from '@agrotraders/types';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Button, Card, Chip, EmptyState, Row, Screen, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import { useI18n } from '../../i18n';

/**
 * Plan, quota meters and checkout on mobile.
 *
 * Checkout leaves the app: acquirers require a full browser for 3-D Secure, so
 * the confirmation URL opens in the system browser and the user returns via the
 * web return page. Pull-to-refresh (or simply revisiting) picks up the state
 * once the webhook lands — nothing here decides that a payment succeeded.
 */

function Meter({ row }: { row: ApiQuotaRow }) {
  const { t } = useI18n();
  const label = t(`billing.limit.${row.key}`);

  if (row.limit === null) {
    return (
      <Row style={s.meterRow}>
        <Txt variant="body" style={s.grow}>
          {label}
        </Txt>
        <Badge label={t('billing.unlimited')} tone="green" />
      </Row>
    );
  }
  if (!row.enforced) {
    return (
      <Row style={s.meterRow}>
        <Txt variant="body" style={s.grow}>
          {label}
        </Txt>
        <Txt variant="numeric" color={C.inkSoft}>
          {String(row.limit)}
        </Txt>
      </Row>
    );
  }

  const pct = Math.min(1, row.used / Math.max(row.limit, 1));
  const over = row.used > row.limit;
  return (
    <View style={s.meter}>
      <Row>
        <Txt variant="body" style={s.grow}>
          {label}
        </Txt>
        <Txt variant="numeric" color={over ? C.error : C.inkSoft}>
          {t('billing.usedOf', { used: row.used, limit: row.limit })}
        </Txt>
      </Row>
      <View style={s.track}>
        <View style={[s.fill, { width: `${(over ? 1 : pct) * 100}%`, backgroundColor: over ? C.error : pct >= 0.8 ? C.mango : C.green }]} />
      </View>
    </View>
  );
}

export function BillingScreen() {
  const { t } = useI18n();
  const { user, activeRole } = useAuth();
  const { fmtMinor } = useCurrency();
  const qc = useQueryClient();
  const [cycle, setCycle] = useState<ApiBillingCycle>('yearly');
  const [chosen, setChosen] = useState<ApiPlan | null>(null);
  const [error, setError] = useState('');

  const role = activeRole || user?.role || 'buyer';

  const { data: overview, isLoading } = useQuery<ApiBillingOverview>({ queryKey: ['billing-overview'], queryFn: () => api.billing.overview() });
  const { data: plans = [] } = useQuery<ApiPlan[]>({ queryKey: ['plans', role], queryFn: () => api.billing.plans({ role }) });
  const { data: gateways = [] } = useQuery<ApiGateway[]>({ queryKey: ['gateways'], queryFn: () => api.billing.gateways() });

  const current = overview?.subscriptions.find((sub) => sub.role === role);
  const entitlement = overview?.entitlements[role];
  const meters = overview?.usage[role] ?? [];
  const upgrades = useMemo(
    () => plans.filter((p) => p.active && p.tier > (entitlement?.tier ?? 0) && p.prices.length > 0).sort((a, b) => a.tier - b.tier),
    [plans, entitlement],
  );

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['billing-overview'] });

  const cancel = useMutation({ mutationFn: () => api.billing.cancel({ role }), onSuccess: invalidate });
  const resume = useMutation({ mutationFn: () => api.billing.resume({ role }), onSuccess: invalidate });

  const pay = useMutation({
    mutationFn: (provider: string) => api.billing.subscribe({ planId: chosen!.id, cycle, provider: provider as never }),
    onSuccess: async (intent) => {
      if (!intent.confirmationUrl) {
        setError(t('billing.noRedirect'));
        return;
      }
      // The acquirer's page needs a real browser (3-D Secure), so hand off to
      // the OS rather than trying to host it in a WebView.
      await Linking.openURL(intent.confirmationUrl);
      setChosen(null);
    },
    onError: (e) => setError(errMessage(e, t('billing.checkoutFailed'))),
  });

  if (isLoading) return <Screen><Txt variant="muted">{t('billing.loading')}</Txt></Screen>;

  return (
    <Screen scroll>
      <Card>
        <Txt variant="muted">{t('billing.currentPlan')}</Txt>
        <Txt variant="h2">{entitlement?.planName ?? t('billing.free')}</Txt>
        <Row gap={6} style={s.mt6}>
          {current ? (
            <>
              <Badge
                label={t(`billing.status.${current.status}`)}
                tone={current.status === 'active' ? 'green' : current.status === 'past_due' ? 'warn' : 'slate'}
              />
              <Txt variant="small" color={C.inkSoft}>
                {current.cancelAtPeriodEnd
                  ? t('billing.endsOn', { date: new Date(current.currentPeriodEnd).toLocaleDateString() })
                  : t('billing.renewsOn', { date: new Date(current.currentPeriodEnd).toLocaleDateString() })}
              </Txt>
            </>
          ) : (
            <Badge label={t('billing.status.free')} tone="slate" />
          )}
        </Row>

        {current && current.status !== 'expired' && (
          <Row gap={8} style={s.mt12}>
            {current.cancelAtPeriodEnd ? (
              <Button title={t('billing.resume')} size="sm" variant="outline" onPress={() => resume.mutate()} />
            ) : (
              <Button title={t('billing.cancelPlan')} size="sm" variant="outline" onPress={() => cancel.mutate()} />
            )}
          </Row>
        )}

        {current?.status === 'past_due' && (
          <View style={s.warn}>
            <Txt variant="label">{t('billing.pastDueTitle')}</Txt>
            <Txt variant="small" color={C.inkSoft}>
              {t('billing.pastDueBody')}
            </Txt>
          </View>
        )}
      </Card>

      {meters.length > 0 && (
        <Card style={s.mt12}>
          <Txt variant="h3">{t('billing.usageTitle')}</Txt>
          {meters.map((row) => (
            <Meter key={row.key} row={row} />
          ))}
        </Card>
      )}

      {upgrades.length > 0 && (
        <Card style={s.mt12}>
          <Txt variant="h3">{t('billing.upgradeTitle')}</Txt>
          <Row gap={6} style={s.mt12}>
            {BILLING_CYCLES.map((c) => (
              <Chip key={c} label={t(`billing.cycle.${c}`)} active={c === cycle} onPress={() => setCycle(c as ApiBillingCycle)} />
            ))}
          </Row>

          {upgrades.map((p) => {
            const price = p.prices.find((x) => x.cycle === cycle);
            return (
              <View key={p.id} style={s.planRow}>
                <Txt variant="title">{p.name}</Txt>
                {price ? (
                  <>
                    <Txt variant="numeric">{fmtMinor(price.amountMinor, price.currency)}</Txt>
                    <Txt variant="small" color={C.inkSoft}>
                      {cycle === 'monthly'
                        ? t('billing.perMonth')
                        : t('billing.perMonthEquivalent', { amount: fmtMinor(price.perMonthMinor, price.currency) })}
                    </Txt>
                    <Button title={t('billing.choose')} size="sm" full onPress={() => setChosen(p)} />
                  </>
                ) : (
                  <Txt variant="small" color={C.inkSoft}>
                    {t('billing.cycleUnavailable')}
                  </Txt>
                )}
              </View>
            );
          })}
        </Card>
      )}

      {chosen && (
        <Card style={s.mt12}>
          <Txt variant="h3">{t('billing.confirmTitle', { plan: chosen.name, cycle: t(`billing.cycle.${cycle}`) })}</Txt>
          <Txt variant="small" color={C.inkSoft}>
            {t('billing.chargedInRubles')}
          </Txt>

          {gateways.length === 0 ? (
            <EmptyState icon="card-outline" title={t('billing.noGatewaysTitle')} body={t('billing.noGatewaysBody')} />
          ) : (
            gateways.map((g) => (
              <Button
                key={g.provider}
                title={g.label}
                variant="outline"
                full
                disabled={pay.isPending}
                onPress={() => pay.mutate(g.provider)}
              />
            ))
          )}

          {error ? (
            <Txt variant="small" color={C.error}>
              {error}
            </Txt>
          ) : null}
          <Button title={t('common:cancel')} size="sm" variant="ghost" onPress={() => setChosen(null)} />
        </Card>
      )}

      {overview && overview.payments.length > 0 && (
        <Card style={s.mt12}>
          <Txt variant="h3">{t('billing.historyTitle')}</Txt>
          {overview.payments.map((p) => (
            <Row key={p.id} style={s.meterRow}>
              <View style={s.grow}>
                <Txt variant="body">{t(`billing.purpose.${p.purpose}`)}</Txt>
                <Txt variant="caption" color={C.inkSoft}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </Txt>
              </View>
              <Txt variant="numeric">{fmtMinor(p.amountMinor, p.currency)}</Txt>
              <Badge
                label={t(`billing.payment.${p.status}`)}
                tone={p.status === 'succeeded' ? 'green' : p.status === 'pending' ? 'warn' : 'error'}
              />
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  grow: { flex: 1 },
  mt6: { marginTop: 6 },
  mt12: { marginTop: space.md },
  meterRow: { paddingVertical: 8, alignItems: 'center' },
  meter: { paddingVertical: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.border, marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  planRow: { marginTop: space.md, gap: 4 },
  warn: { marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: C.surface },
});
