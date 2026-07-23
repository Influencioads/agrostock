import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiAdCampaign, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, ChipSelect, EmptyState, Input, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C } from '../../theme/tokens';

/**
 * Ads — promote a listing. Every campaign is reviewed by an admin before it
 * runs; pausing an approved campaign never re-triggers review.
 */
export function SellerAds() {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [productId, setProductId] = useState('');
  const [budget, setBudget] = useState('');
  const [error, setError] = useState('');

  const { data: products = [] } = useQuery<ApiProduct[]>({
    queryKey: ['products', 'mine'],
    queryFn: () => api.products.mine(),
    enabled: !!user,
  });
  const { data: campaigns = [], isLoading } = useQuery<ApiAdCampaign[]>({
    queryKey: ['ads', 'mine'],
    queryFn: () => api.ads.mine(),
    enabled: !!user,
    refetchInterval: 20000,
  });

  const launch = useMutation({
    mutationFn: () => api.ads.create({ productId, dailyBudgetCents: Math.round(Number(budget) * 100) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ads', 'mine'] });
      setProductId('');
      setBudget('');
    },
    onError: (e) => setError(errMessage(e, t('sellerX.ads.submitError'))),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.ads.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads', 'mine'] }),
    onError: (e) => setError(errMessage(e, t('sellerX.ads.updateError'))),
  });

  // Only an approved and unpaused campaign is actually spending.
  const totalSpend = useMemo(
    () => campaigns.filter((c) => c.active && c.status === 'approved').reduce((s, c) => s + c.dailyBudgetCents / 100, 0),
    [campaigns],
  );

  if (!user) {
    return (
      <Screen>
        <Txt variant="h2">{t('sellerX.ads.title')}</Txt>
        <EmptyState icon="lock-closed-outline" title={t('sellerX.ads.signIn')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Txt variant="h2">{t('sellerX.ads.title')}</Txt>
      <Txt variant="muted">{t('sellerX.ads.subtitle')}</Txt>

      <Card style={{ gap: 12 }}>
        {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
        <ChipSelect
          label={t('sellerX.ads.product')}
          options={products.map((p) => ({
            id: p.id,
            label: `${p.emoji ?? '🌾'} ${p.name}${p.approved === false ? t('sellerX.ads.awaitingSuffix') : ''}`,
          }))}
          value={productId}
          onChange={setProductId}
        />
        <Input label={t('sellerX.ads.dailyBudget')} keyboardType="numeric" placeholder="50" value={budget} onChangeText={setBudget} />
        <Button
          title={launch.isPending ? t('sellerX.ads.submitting') : t('sellerX.ads.submitReview')}
          full
          disabled={!productId || !Number(budget) || launch.isPending}
          onPress={() => { setError(''); launch.mutate(); }}
        />
        {campaigns.length > 0 && <Txt variant="small">{t('sellerX.ads.activeSpend', { amount: totalSpend })}</Txt>}
      </Card>

      {isLoading ? (
        <SkeletonRows />
      ) : campaigns.length === 0 ? (
        <EmptyState icon="megaphone-outline" title={t('sellerX.ads.emptyTitle')} body={t('sellerX.ads.emptyBody')} />
      ) : (
        campaigns.map((c) => {
          const live = c.status === 'approved' && c.active;
          return (
            <Card key={c.id} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flexShrink: 1 }}>
                  <Txt variant="title">{c.product?.emoji ?? '🌾'} {c.product?.name ?? t('sellerX.ads.listingFallback')}</Txt>
                  <Txt variant="muted">{t('sellerX.ads.perDay', { amount: fmtCents(c.dailyBudgetCents) })}</Txt>
                </View>
                {c.status === 'pending' && <Badge label={t('sellerX.ads.pendingReview')} tone="warn" />}
                {c.status === 'rejected' && <Badge label={t('sellerX.ads.rejected')} tone="error" />}
                {c.status === 'approved' && <Badge label={live ? t('sellerX.ads.live') : t('sellerX.ads.paused')} tone={live ? 'green' : 'slate'} />}
              </Row>

              {c.status === 'rejected' && !!c.rejectionReason && (
                <Txt variant="small" color={C.error}>{t('sellerX.ads.reason', { reason: c.rejectionReason })}</Txt>
              )}

              <Button
                title={c.active ? t('sellerX.ads.pause') : t('sellerX.ads.resume')}
                variant="outline"
                size="sm"
                // Pause/resume only means something once the campaign is approved.
                disabled={toggle.isPending || c.status !== 'approved'}
                onPress={() => { setError(''); toggle.mutate({ id: c.id, active: !c.active }); }}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
