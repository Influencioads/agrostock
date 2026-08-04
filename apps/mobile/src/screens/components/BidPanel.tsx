import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ApiAuctionDetail } from '@agrotraders/api-client';
import { toUnit, unitSuffix } from '@agrotraders/types';
import { api } from '../../lib/api';
import { useApiError } from '../../lib/useApiError';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, Input, Row, Txt } from '../../ui';
import { C, radius } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { useI18n } from '../../i18n';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Open auction bidding card — current highest bid, the viewer's standing, a
 * free offer field and a proxy auto-bid toggle. Bids are public; identities stay
 * masked in the history.
 *
 * No minimum raise: the bidder names their own price and the highest offer takes
 * the lot at close, so the old quick-raise chips are gone with it.
 */
export function BidPanel({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const apiError = useApiError();
  const { user, roles } = useAuth();
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();
  const [amount, setAmount] = useState<number | null>(null); // dollars; null = track min
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoMax, setAutoMax] = useState('');
  const [error, setError] = useState('');

  const { data: auction } = useQuery<ApiAuctionDetail>({
    queryKey: ['auction', slug], queryFn: () => api.auctions.detail(slug), refetchInterval: 4000,
  });

  // No minimum raise: any offer is accepted, above or below the current top, and
  // the highest one wins at close. The field opens at whatever the lot stands at
  // — or at YOUR standing offer once you have one, since one account holds a
  // single revisable offer — and the ± buttons nudge by 1% of the lot price.
  const currentCents = auction?.highestCents ?? auction?.startBidCents ?? 0;
  const value = amount ?? (auction?.standing?.yourMaxCents ?? currentCents) / 100;
  const nudge = Math.max(0.01, Math.round(currentCents * 0.01) / 100);
  const unit = unitSuffix(auction?.unit, t);
  const isOwner = auction?.isOwner ?? false;
  const standing = auction?.standing;
  const autoMaxCents = standing?.autoMaxCents ?? null;

  useEffect(() => {
    if (autoMaxCents != null) { setAutoOpen(true); if (!autoMax) setAutoMax(String(Math.round(autoMaxCents / 100))); }
  }, [autoMaxCents]); // eslint-disable-line react-hooks/exhaustive-deps

  const requireBuyer = () => {
    setError('');
    if (!user) { nav.navigate('SignIn', { reason: 'bid' }); return false; }
    // Effective roles, not the viewed one — a seller granted `buyer` may bid.
    if (!roles.includes('buyer')) { setError(t('compX.bid.onlyBuyers')); return false; }
    return true;
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['auction', slug] });
    qc.invalidateQueries({ queryKey: ['auction-bids', slug] });
  };
  const place = useMutation({
    mutationFn: () => api.auctions.placeBid(slug, value),
    onSuccess: () => { invalidate(); setAmount(null); setError(''); },
    onError: (e) => setError(apiError(e, t('compX.bid.placeError'))),
  });
  const saveAuto = useMutation({
    mutationFn: (clear: boolean) => (clear ? api.auctions.clearAutoBid(slug) : api.auctions.setAutoBid(slug, Number(autoMax))),
    onSuccess: () => { invalidate(); setError(''); },
    onError: (e) => setError(apiError(e, t('compX.bid.placeError'))),
  });

  const step = (dir: 1 | -1) => setAmount(Math.max(0.01, Math.round((value + dir * nudge) * 100) / 100));
  const onBid = () => { if (requireBuyer()) place.mutate(); };
  const onSaveAuto = () => { if (requireBuyer() && Number(autoMax) > 0) saveAuto.mutate(false); };
  const onToggleAuto = () => {
    if (autoOpen && autoMaxCents != null) { saveAuto.mutate(true); setAutoOpen(false); setAutoMax(''); }
    else setAutoOpen((o) => !o);
  };

  return (
    <Card style={{ gap: 12 }}>
      {/* current highest */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Txt variant="muted">{t('compX.bid.currentHighest')}</Txt>
          <Txt style={{ fontSize: 30, fontWeight: '800', color: C.dark }}>
            {fmtCents(currentCents)}
            <Txt variant="muted" style={{ fontSize: 14 }}>{unit}</Txt>
          </Txt>
        </View>
        <Badge label={t('compX.bid.bidsN', { count: auction?.bidCount ?? 0 })} tone="green" />
      </Row>

      {/* your standing */}
      {standing && standing.yourRank != null ? (
        <Row style={{ gap: 10, backgroundColor: standing.leading ? C.surface : C.mangoSoft, borderRadius: radius.md, paddingHorizontal: 11, paddingVertical: 9 }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: standing.leading ? C.dark : C.gold, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ color: C.white, fontSize: 11, fontWeight: '700' }}>#{standing.yourRank}</Txt>
          </View>
          <Txt variant="small" style={{ flex: 1, fontWeight: '600' }}>
            {standing.leading ? t('compX.bid.leading') : t('compX.bid.outbid', { amount: fmtCents(standing.yourMaxCents) })}
          </Txt>
        </Row>
      ) : null}

      {isOwner ? (
        <Txt variant="small" color={C.inkSoft}>{t('compX.bid.ownerNote')}</Txt>
      ) : (
        <>
          {/* offer field — any amount, priced per the lot's own metric */}
          <View style={{ gap: 6 }}>
            <Txt variant="muted">{t('auction.pricePerUnit', { unit: t(`enums:unitShort.${toUnit(auction?.unit)}`) })}</Txt>
            <Row style={{ borderWidth: 2, borderColor: C.leaf, borderRadius: radius.md, overflow: 'hidden' }}>
              <Pressable onPress={() => step(-1)} style={{ width: 46, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
                <Txt style={{ fontSize: 22, color: C.dark }}>−</Txt>
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center' }}>
                {/* Cents matter now that a lot can be priced per KG. */}
                <Txt style={{ fontSize: 22, fontWeight: '800' }}>${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Txt>
              </View>
              <Pressable onPress={() => step(1)} style={{ width: 46, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
                <Txt style={{ fontSize: 22, color: C.dark }}>+</Txt>
              </Pressable>
            </Row>
          </View>

          <Button
            title={t('compX.bid.placeAmount', { amount: `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}${unit}` })}
            variant="primary"
            icon="hammer"
            full
            disabled={place.isPending || !(value > 0)}
            onPress={onBid}
          />
          {!!error && <Txt color={C.error} variant="small">{error}</Txt>}

          {/* auto-bid */}
          <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
            <View style={{ flex: 1, paddingEnd: 10 }}>
              <Txt variant="label">{t('compX.bid.autoBid')}</Txt>
              <Txt variant="muted">{t('compX.bid.autoBidSub')}</Txt>
            </View>
            <Pressable onPress={onToggleAuto} style={{ width: 44, height: 25, borderRadius: 20, backgroundColor: autoOpen ? C.dark : C.border, justifyContent: 'center' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.white, marginStart: autoOpen ? 22 : 2.5 }} />
            </Pressable>
          </Row>
          {autoOpen ? (
            <Row style={{ gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input placeholder={t('compX.bid.maxPlaceholder')} keyboardType="numeric" value={autoMax} onChangeText={setAutoMax} />
              </View>
              <Button title={autoMaxCents != null ? t('mobile2.form.save') : t('compX.bid.setMax')} variant="outline" size="sm" disabled={saveAuto.isPending || !Number(autoMax)} onPress={onSaveAuto} />
            </Row>
          ) : null}
        </>
      )}
    </Card>
  );
}
