import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ApiAuctionDetail } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { useApiError } from '../../lib/useApiError';
import { useAuth } from '../../auth/AuthProvider';
import { Badge, Button, Card, Input, Row, Txt } from '../../ui';
import { C, radius } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { useI18n } from '../../i18n';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const usd = (c: number | null | undefined) => (c == null ? '—' : '$' + Math.round(c / 100).toLocaleString());

/**
 * Open ascending auction bidding card — current highest bid, the viewer's
 * standing, a min-increment stepper with quick raises, and a proxy auto-bid
 * toggle. Bids are public; identities stay masked in the history.
 */
export function BidPanel({ slug }: { slug: string }) {
  const { t } = useI18n();
  const apiError = useApiError();
  const { user, role } = useAuth();
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();
  const [amount, setAmount] = useState<number | null>(null); // dollars; null = track min
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoMax, setAutoMax] = useState('');
  const [error, setError] = useState('');

  const { data: auction } = useQuery<ApiAuctionDetail>({
    queryKey: ['auction', slug], queryFn: () => api.auctions.detail(slug), refetchInterval: 4000,
  });

  const increment = (auction?.bidIncrementCents ?? 0) / 100;
  const minNext = (auction?.minNextCents ?? 0) / 100;
  const value = amount ?? minNext;
  const isOwner = auction?.isOwner ?? false;
  const standing = auction?.standing;
  const autoMaxCents = standing?.autoMaxCents ?? null;

  useEffect(() => {
    if (autoMaxCents != null) { setAutoOpen(true); if (!autoMax) setAutoMax(String(Math.round(autoMaxCents / 100))); }
  }, [autoMaxCents]); // eslint-disable-line react-hooks/exhaustive-deps

  const requireBuyer = () => {
    setError('');
    if (!user) { nav.navigate('SignIn', { reason: 'bid' }); return false; }
    if (role !== 'buyer') { setError(t('compX.bid.onlyBuyers')); return false; }
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

  const step = (dir: 1 | -1) => setAmount(Math.max(minNext, Math.round(value + dir * (increment || 1))));
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
            {usd(auction?.highestCents ?? auction?.startBidCents ?? 0)}
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
            {standing.leading ? t('compX.bid.leading') : t('compX.bid.outbid', { amount: usd(standing.yourMaxCents) })}
          </Txt>
        </Row>
      ) : null}

      {isOwner ? (
        <Txt variant="small" color={C.inkSoft}>{t('compX.bid.ownerNote')}</Txt>
      ) : (
        <>
          {/* stepper */}
          <View style={{ gap: 6 }}>
            <Txt variant="muted">{t('compX.bid.minNext', { amount: usd((auction?.minNextCents ?? 0)) })}</Txt>
            <Row style={{ borderWidth: 2, borderColor: C.leaf, borderRadius: radius.md, overflow: 'hidden' }}>
              <Pressable onPress={() => step(-1)} style={{ width: 46, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
                <Txt style={{ fontSize: 22, color: C.dark }}>−</Txt>
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Txt style={{ fontSize: 22, fontWeight: '800' }}>${Math.round(value).toLocaleString()}</Txt>
              </View>
              <Pressable onPress={() => step(1)} style={{ width: 46, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
                <Txt style={{ fontSize: 22, color: C.dark }}>+</Txt>
              </Pressable>
            </Row>
          </View>

          {/* quick raises */}
          <Row style={{ gap: 8 }}>
            {[1, 2, 5].map((mult) => {
              const total = minNext + increment * (mult - 1);
              return (
                <Pressable key={mult} onPress={() => setAmount(total)} style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: radius.sm, paddingVertical: 8, alignItems: 'center' }}>
                  <Txt style={{ fontSize: 12, fontWeight: '700', color: C.dark }}>+${Math.round(increment * mult).toLocaleString()}</Txt>
                  <Txt style={{ fontSize: 10, color: C.inkSoft }}>${Math.round(total).toLocaleString()}</Txt>
                </Pressable>
              );
            })}
          </Row>

          <Button title={t('compX.bid.placeAmount', { amount: `$${Math.round(value).toLocaleString()}` })} variant="primary" icon="hammer" full disabled={place.isPending || value < minNext} onPress={onBid} />
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
