import { Fragment, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiBillingCycle, ApiBillingOverview, ApiGateway, ApiPlan, ApiQuotaRow } from '@agrotraders/api-client';
import {
  appleProductId,
  BILLING_CYCLES,
  cycleSavingPercent,
  PLAN_FEATURE_KEYS,
  PLAN_LIMIT_KEYS,
  UNENFORCED_LIMIT_KEYS,
  type PlanFeatureKey,
  type PlanLimitKey,
} from '@agrotraders/types';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import {
  buySubscription,
  fetchStoreSubscriptions,
  IAP_AVAILABLE,
  manageSubscriptions,
  restoreOwnedPurchases,
  type StoreProduct,
} from '../../lib/iap';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../currency/CurrencyContext';
import { Badge, Button, Card, Chip, EmptyState, Row, Screen, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import { useI18n } from '../../i18n';
import type { RootStackParamList } from '../../navigation/types';
import { isBilledElsewhere, laddersFor, planAction, shownRoleFor } from './planLadder';

/**
 * Plan, quota meters and checkout on mobile.
 *
 * Android pays through the gateway checkout, which leaves the app: acquirers
 * require a full browser for 3-D Secure, so the confirmation URL opens in the
 * system browser and the user returns via the web return page. Pull-to-refresh
 * (or simply revisiting) picks up the state once the webhook lands — nothing
 * here decides that a payment succeeded.
 *
 * iOS sells the same plans as App Store auto-renewable subscriptions, as
 * Guideline 3.1.1 requires for anything that unlocks in-app quota: one product
 * per plan and cycle, `appleProductId(plan.code, cycle)`. The prices shown there
 * are Apple's localized ones, not the ruble catalogue, and the API verifies every
 * signed transaction before it moves the plan (lib/iap, lib/IapSync). No gateway
 * button, resume or other purchasing path is offered on iOS.
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

/**
 * Quota keys settled by a success fee rather than a cap. Uncapped, the card
 * shows the live fee instead of "Unlimited", exactly as the web pricing page does.
 */
const FEE_FOR_LIMIT: Partial<Record<string, 'auction' | 'buyerBid'>> = {
  auctionLotsPerMonth: 'auction',
  rfqsPerMonth: 'buyerBid',
};

/** Basis points → the percent a trader reads. 100 → "1", 50 → "0.5". */
const pctOf = (bps: number) => String(Number((bps / 100).toFixed(2)));

type Fees = { auctionBps: number; buyerBidBps: number };

function Perk({ children }: { children: string }) {
  return (
    <Row gap={8} style={s.perk}>
      <Ionicons name="checkmark-circle" size={18} color={C.green} />
      <Txt variant="body" style={s.grow}>{children}</Txt>
    </Row>
  );
}

/**
 * What a card lists. Android prints the same rows as the web pricing page. iOS
 * sells through the App Store, where a listed benefit must be one the platform
 * delivers: no plan feature flag is checked anywhere yet, and the unenforced
 * quotas count nothing, so only the enforced quotas (and success fees) remain.
 * Photos per listing goes too: the paid rungs promise 10 and 15, but every
 * listing is capped at 6 (MAX_PRODUCT_IMAGES in the API, MAX_IMAGES in
 * AddProduct), so a subscriber could never get what the card sells.
 */
const CARD_LIMIT_KEYS: readonly PlanLimitKey[] = IAP_AVAILABLE
  ? PLAN_LIMIT_KEYS.filter((k) => !UNENFORCED_LIMIT_KEYS.includes(k) && k !== 'photosPerListing')
  : PLAN_LIMIT_KEYS;
const CARD_FEATURE_KEYS: readonly PlanFeatureKey[] = IAP_AVAILABLE ? [] : PLAN_FEATURE_KEYS;

/**
 * One plan, described in full: price, every quota and every feature — the same
 * rows the web pricing page prints, so the two never disagree about a plan
 * (iOS trims them, see CARD_LIMIT_KEYS).
 */
function PlanCard({ plan, cycle, current, highlight, fees, storePrice, onChoose, chooseLabel, busy }: {
  plan: ApiPlan;
  cycle: ApiBillingCycle;
  current: boolean;
  highlight: boolean;
  fees?: Fees;
  /**
   * iOS only: the App Store's localized price for this cycle, or null when the
   * product is not on sale there. Undefined (Android) shows the ruble price.
   */
  storePrice?: string | null;
  /** Absent when the plan cannot be bought from here (current, lower tier, billed elsewhere). */
  onChoose?: () => void;
  chooseLabel: string;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const { fmtMinor } = useCurrency();
  const price = plan.prices.find((x) => x.cycle === cycle);
  const monthly = plan.prices.find((x) => x.cycle === 'monthly');
  const saving = price && monthly && cycle !== 'monthly' ? cycleSavingPercent(monthly.amountMinor, price.amountMinor, cycle) : 0;
  // By tier, not by an empty price list: a paid plan an admin has not priced
  // yet must read "not offered on this cycle", never "Free".
  const isFree = plan.tier === 0;

  return (
    <Card style={StyleSheet.flatten([s.mt12, current ? s.planCurrent : highlight ? s.planHighlight : null])}>
      <Row gap={8}>
        <Txt variant="h3" style={s.grow}>{plan.name}</Txt>
        {current ? (
          <Badge label={t('billing.currentPlan')} tone="green" />
        ) : highlight ? (
          <Badge label={t('billing.mostPopular')} tone="gold" />
        ) : null}
      </Row>
      {plan.description ? (
        <Txt variant="small" color={C.inkSoft} style={s.mt6}>{plan.description}</Txt>
      ) : null}

      {isFree ? (
        <View style={s.mt6}>
          <Txt variant="h2">{t('billing.free')}</Txt>
          <Txt variant="small" color={C.inkSoft}>{t('billing.freeForever')}</Txt>
        </View>
      ) : storePrice === null ? (
        <Txt variant="small" color={C.inkSoft} style={s.mt6}>{t('billing.storeUnavailable')}</Txt>
      ) : storePrice !== undefined ? (
        // No per-month figure or Save badge: both are worked out from ruble prices.
        <View style={s.mt6}>
          <Txt variant="h2">{storePrice}</Txt>
          <Txt variant="small" color={C.inkSoft}>{t(`billing.billedEvery.${cycle}`)}</Txt>
        </View>
      ) : price ? (
        <View style={s.mt6}>
          <Txt variant="h2">{fmtMinor(price.amountMinor, price.currency)}</Txt>
          <Row gap={6} wrap>
            <Txt variant="small" color={C.inkSoft}>
              {cycle === 'monthly'
                ? t('billing.perMonth')
                : t('billing.perMonthEquivalent', { amount: fmtMinor(price.perMonthMinor, price.currency) })}
            </Txt>
            {saving > 0 ? <Badge label={t('billing.save', { percent: saving })} tone="gold" /> : null}
          </Row>
        </View>
      ) : (
        <Txt variant="small" color={C.inkSoft} style={s.mt6}>{t('billing.cycleUnavailable')}</Txt>
      )}

      <View style={s.perks}>
        {CARD_LIMIT_KEYS.filter((k) => k in plan.limits).map((k) => {
          const n = plan.limits[k];
          const fee = n === null ? FEE_FOR_LIMIT[k] : undefined;
          if (fee) {
            const bps = fee === 'auction' ? fees?.auctionBps : fees?.buyerBidBps;
            if (!bps || bps <= 0) return null;
            return <Perk key={k}>{`${t('billing.successFee.pct', { pct: pctOf(bps) })} ${t(`billing.successFee.${fee}`)}`}</Perk>;
          }
          // `count` only picks the plural form; 0 selects the many/other form
          // that reads right after the word "Unlimited".
          return <Perk key={k}>{`${n === null ? t('billing.unlimited') : n} ${t(`billing.planLimit.${k}`, { count: n ?? 0 })}`}</Perk>;
        })}
        {CARD_FEATURE_KEYS.filter((k) => plan.features[k] && plan.features[k] !== 'none').map((k) => (
          <Perk key={k}>
            {t(`billing.feature.${k}`) + (typeof plan.features[k] === 'string' ? ` — ${t(`billing.option.${String(plan.features[k])}`)}` : '')}
          </Perk>
        ))}
      </View>

      {onChoose && (storePrice === undefined ? price : storePrice) ? (
        <Button title={chooseLabel} size="sm" full disabled={busy} onPress={onChoose} />
      ) : null}
    </Card>
  );
}

export function BillingScreen() {
  const { t } = useI18n();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, activeRole } = useAuth();
  const { fmtMinor } = useCurrency();
  const qc = useQueryClient();
  const [cycle, setCycle] = useState<ApiBillingCycle>('yearly');
  const [chosen, setChosen] = useState<ApiPlan | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const role = activeRole || user?.role || 'buyer';
  const ladders = laddersFor(role, IAP_AVAILABLE);
  const [picked, setPicked] = useState(role);
  // The picked ladder only sticks while it is still one this role may see; a
  // buyer on iOS lands on the seller ladder. A worker there has none at all.
  const ladderRole = ladders.includes(picked) ? picked : (ladders[0] ?? role);
  const shownRole = shownRoleFor(role, ladders, ladderRole);

  const { data: overview, isLoading } = useQuery<ApiBillingOverview>({ queryKey: ['billing-overview'], queryFn: () => api.billing.overview() });
  const { data: plans = [] } = useQuery<ApiPlan[]>({
    queryKey: ['plans', ladderRole],
    queryFn: () => api.billing.plans({ role: ladderRole }),
    enabled: ladders.length > 0,
  });
  // Read live, as on the web: an admin can change either rate at any time.
  const { data: fees } = useQuery<Fees>({ queryKey: ['commission-rates'], queryFn: () => api.billing.commissionRates() });
  const { data: gateways = [] } = useQuery<ApiGateway[]>({
    queryKey: ['gateways'],
    queryFn: () => api.billing.gateways(),
    enabled: !IAP_AVAILABLE,
  });

  const current = overview?.subscriptions.find((sub) => sub.role === shownRole);
  const entitlement = overview?.entitlements[shownRole];
  const meters = overview?.usage[shownRole] ?? [];
  // Absent when the account does not hold the ladder's role — the API only
  // sells a plan for a held role, so that ladder routes to Roles & Access.
  const ladderEnt = overview?.entitlements[ladderRole];
  const ladder = useMemo(() => plans.filter((p) => p.active).sort((a, b) => a.tier - b.tier), [plans]);

  // Every paid rung on every cycle, so switching cycle needs no second round trip.
  const skus = useMemo(
    () => ladder.filter((p) => p.tier > 0).flatMap((p) => BILLING_CYCLES.map((c) => appleProductId(p.code, c))),
    [ladder],
  );
  const { data: storeProducts, isLoading: storeLoading } = useQuery<StoreProduct[]>({
    queryKey: ['store-products', ladderRole, skus],
    queryFn: () => fetchStoreSubscriptions(skus),
    enabled: IAP_AVAILABLE && skus.length > 0,
  });
  const storePriceOf = (p: ApiPlan): string | null | undefined =>
    IAP_AVAILABLE && p.tier > 0
      ? (storeProducts?.find((x) => x.id === appleProductId(p.code, cycle))?.displayPrice ?? null)
      : undefined;

  // This ladder's plan (one row per role), when the channel this build does not
  // sell through still bills it.
  const billedElsewhere = isBilledElsewhere(
    overview?.subscriptions.find((sub) => sub.role === ladderRole),
    ladderEnt?.tier ?? 0,
    IAP_AVAILABLE,
  );

  const pickLadder = (r: string) => {
    setPicked(r);
    setChosen(null);
    setError('');
    setNotice('');
  };

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['billing-overview'] });

  const cancel = useMutation({ mutationFn: () => api.billing.cancel({ role: shownRole }), onSuccess: invalidate });
  const resume = useMutation({ mutationFn: () => api.billing.resume({ role: shownRole }), onSuccess: invalidate });

  // IapSync uploads the transaction and refreshes the overview once the API
  // accepts it; the invalidate here only covers a purchase it already finished.
  const buy = useMutation({
    mutationFn: (p: ApiPlan) => buySubscription(appleProductId(p.code, cycle), overview!.appleAccountToken),
    onMutate: () => {
      setError('');
      setNotice('');
    },
    onSuccess: (outcome) => {
      if (outcome === 'pending') setNotice(t('billing.purchasePending'));
      if (outcome === 'purchased') invalidate();
    },
    // The API's reason when it refused the transaction (e.g. another account's).
    onError: (e) => setError(errMessage(e, t('billing.iapFailed'))),
  });
  const restore = useMutation({
    mutationFn: restoreOwnedPurchases,
    onMutate: () => {
      setError('');
      setNotice('');
    },
    onSuccess: ({ found, rejected, error: refusal }) => {
      invalidate();
      // The API's reason when it refused one (e.g. another account's).
      if (rejected > 0) setError(errMessage(refusal, t('billing.restoreFailed')));
      else setNotice(found === 0 ? t('billing.nothingToRestore') : t('billing.restored'));
    },
    onError: () => setError(t('billing.restoreFailed')),
  });

  const chooseFor = (p: ApiPlan): (() => void) | undefined => {
    const action = planAction(p.tier, ladderEnt, billedElsewhere);
    if (action === 'addRole') return () => nav.navigate('RolesAccess');
    if (action !== 'choose') return undefined;
    return IAP_AVAILABLE ? () => buy.mutate(p) : () => setChosen(p);
  };

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

  // Rendered straight under the plan that was tapped, not below the whole ladder.
  const checkout = chosen && !IAP_AVAILABLE ? (
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
  ) : null;

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
          <Row gap={8} style={s.mt12} wrap>
            {current.provider === 'apple' ? (
              // Apple owns the renewal: only the App Store can cancel or resume it.
              IAP_AVAILABLE ? (
                <Button
                  title={t('billing.manageInAppStore')}
                  size="sm"
                  variant="outline"
                  onPress={() => void manageSubscriptions().catch(() => {})}
                />
              ) : (
                <Txt variant="small" color={C.inkSoft}>{t('billing.appStoreManaged')}</Txt>
              )
            ) : current.cancelAtPeriodEnd ? (
              // Resuming restarts gateway billing, a purchase path iOS may not offer.
              IAP_AVAILABLE ? null : (
                <Button title={t('billing.resume')} size="sm" variant="outline" onPress={() => resume.mutate()} />
              )
            ) : (
              <Button title={t('billing.cancelPlan')} size="sm" variant="outline" onPress={() => cancel.mutate()} />
            )}
          </Row>
        )}

        {current?.status === 'past_due' && (
          // Apple retries its own renewals against the Apple ID's payment method.
          <View style={s.warn}>
            <Txt variant="label">{current.provider === 'apple' ? t('billing.pastDueAppleTitle') : t('billing.pastDueTitle')}</Txt>
            <Txt variant="small" color={C.inkSoft}>
              {current.provider === 'apple' ? t('billing.pastDueAppleBody') : t('billing.pastDueBody')}
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

      {/* On iOS, held back until the App Store prices arrive rather than
          flashing "not available" on every paid card. */}
      {ladder.length > 0 && !storeLoading && (
        <View style={s.mt12}>
          <Txt variant="h3">{t('billing.allPlans')}</Txt>
          <Txt variant="small" color={C.inkSoft}>{t('billing.allPlansHint')}</Txt>
          {/* A lone ladder still gets its label when it is not the user's own role. */}
          {ladders.length > 1 || ladderRole !== role ? (
            <Row gap={6} style={s.mt12}>
              {ladders.map((r) => (
                <Chip key={r} label={t(`enums:role.${r}`)} active={r === ladderRole} onPress={() => pickLadder(r)} />
              ))}
            </Row>
          ) : null}
          <Row gap={6} style={s.mt12}>
            {BILLING_CYCLES.map((c) => (
              <Chip key={c} label={t(`billing.cycle.${c}`)} active={c === cycle} onPress={() => setCycle(c as ApiBillingCycle)} />
            ))}
          </Row>
          {ladder.map((p) => (
            <Fragment key={p.id}>
              <PlanCard
                plan={p}
                cycle={cycle}
                current={!!ladderEnt && p.id === ladderEnt.planId}
                // The middle rung is the anchor, as on the web pricing page.
                highlight={p.tier === 1 && ladder.length > 2}
                fees={fees}
                storePrice={storePriceOf(p)}
                onChoose={chooseFor(p)}
                chooseLabel={ladderEnt ? t('billing.choose') : t('billing.addRole', { role: t(`enums:role.${ladderRole}`) })}
                busy={buy.isPending || restore.isPending}
              />
              {chosen?.id === p.id ? checkout : null}
            </Fragment>
          ))}

          {IAP_AVAILABLE ? (
            <>
              {notice ? <Txt variant="small" color={C.inkSoft} style={s.mt12}>{notice}</Txt> : null}
              {error ? <Txt variant="small" color={C.error} style={s.mt12}>{error}</Txt> : null}
              <View style={s.mt12}>
                <Button
                  title={t('billing.restore')}
                  size="sm"
                  variant="ghost"
                  loading={restore.isPending}
                  disabled={buy.isPending}
                  onPress={() => restore.mutate()}
                />
              </View>
              <Txt variant="muted" style={s.mt6}>{t('billing.autoRenewNote')}</Txt>
            </>
          ) : null}
          {/* Guideline 3.1.2 wants both reachable from wherever a subscription is sold. */}
          <Row gap={8} style={s.mt6} wrap>
            <Button
              title={t('pubX.legal.terms')}
              size="sm"
              variant="ghost"
              onPress={() => nav.navigate('LegalPage', { slug: 'terms', title: t('pubX.legal.terms') })}
            />
            <Button
              title={t('pubX.legal.privacy')}
              size="sm"
              variant="ghost"
              onPress={() => nav.navigate('LegalPage', { slug: 'privacy', title: t('pubX.legal.privacy') })}
            />
          </Row>
        </View>
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
  perks: { marginVertical: space.md, gap: 6 },
  perk: { alignItems: 'flex-start' },
  planCurrent: { borderWidth: 2, borderColor: C.green },
  planHighlight: { borderWidth: 2, borderColor: C.mango },
  warn: { marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: C.surface },
});
