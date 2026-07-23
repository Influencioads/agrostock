import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { ApiAuctionBid, ApiAuctionListing, ApiProduct } from '@agrotraders/api-client';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, ChipSelect, EmptyState, Input, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C, space } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function countdown(end: string | null | undefined, t: ReturnType<typeof useI18n>['t']) {
  if (!end) return t('sellerX.auctions.open');
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return t('sellerX.auctions.ended');
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
}

/** Turn one of the seller's existing listings into an auction. */
function StartAuctionSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [startBid, setStartBid] = useState('');
  const [days, setDays] = useState('7');
  const [error, setError] = useState('');

  const { data: products = [] } = useQuery<ApiProduct[]>({ queryKey: ['products', 'mine'], queryFn: () => api.products.mine() });
  const eligible = products.filter((p) => !p.isAuction);

  const start = useMutation({
    mutationFn: () =>
      api.products.update(productId, {
        isAuction: true,
        startBidCents: Math.round(Number(startBid) * 100),
        auctionEndsAt: new Date(Date.now() + Math.max(Number(days) || 7, 1) * 864e5).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', 'mine'] });
      qc.invalidateQueries({ queryKey: ['auctions', 'selling'] });
      onClose();
    },
    onError: (e) => setError(errMessage(e, t('sellerX.auctions.startError'))),
  });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{t('sellerX.auctions.startSheetTitle')}</Txt>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={C.inkSoft} /></Pressable>
          </Row>

          {eligible.length === 0 ? (
            <Txt variant="muted">{t('sellerX.auctions.allAuctions')}</Txt>
          ) : (
            <>
              {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
              <ChipSelect
                label={t('sellerX.auctions.listing')}
                options={eligible.map((p) => ({ id: p.id, label: `${p.emoji ?? '🌾'} ${p.name}` }))}
                value={productId}
                onChange={setProductId}
              />
              <Row gap={10}>
                <View style={{ flex: 1 }}><Input label={t('sellerX.auctions.startBid')} keyboardType="numeric" placeholder="800" value={startBid} onChangeText={setStartBid} /></View>
                <View style={{ flex: 1 }}><Input label={t('sellerX.auctions.runsForDays')} keyboardType="numeric" value={days} onChangeText={setDays} /></View>
              </Row>
              <Txt variant="small">{t('sellerX.auctions.sealedHint')}</Txt>
              <Button
                title={start.isPending ? t('sellerX.auctions.starting') : t('sellerX.auctions.startAuction')}
                full
                disabled={!productId || !Number(startBid) || start.isPending}
                onPress={() => start.mutate()}
              />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** The owner's full bid book for one auction. */
function BidBookSheet({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const { data: bids = [], isLoading } = useQuery<ApiAuctionBid[]>({
    queryKey: ['auction-bids', slug],
    queryFn: () => api.auctions.bids(slug) as Promise<ApiAuctionBid[]>,
    refetchInterval: 5000,
  });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '80%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3" style={{ flexShrink: 1 }}>{t('sellerX.auctions.bidBookTitle', { name })}</Txt>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={C.inkSoft} /></Pressable>
          </Row>
          {isLoading ? (
            <SkeletonRows />
          ) : bids.length === 0 ? (
            <Txt variant="muted">{t('sellerX.auctions.noBids')}</Txt>
          ) : (
            bids.map((b, i) => (
              <Card key={b.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={6}>
                    <Txt variant="title">{b.bidder?.name ?? t('sellerX.auctions.bidderFallback')}</Txt>
                    {i === 0 && <Badge label={t('sellerX.auctions.highest')} tone="green" />}
                  </Row>
                  <Txt variant="title">{fmtCents(b.amountCents)}</Txt>
                </Row>
              </Card>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Auctions — start, watch, and close the seller's own auctions. */
export function SellerAuctions() {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);
  const [viewing, setViewing] = useState<ApiAuctionListing | null>(null);
  const [error, setError] = useState('');

  const { data: auctions = [], isLoading } = useQuery<ApiAuctionListing[]>({
    queryKey: ['auctions', 'selling'],
    queryFn: () => api.auctions.selling(),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const close = useMutation({
    mutationFn: (slug: string) => api.auctions.close(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions', 'selling'] }),
    onError: (e) => setError(errMessage(e, t('sellerX.auctions.closeError'))),
  });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">{t('sellerX.auctions.title')}</Txt>
        <Button title={t('sellerX.auctions.start')} size="sm" icon="add" onPress={() => setStarting(true)} disabled={!user} />
      </Row>
      <Txt variant="muted">{t('sellerX.auctions.subtitle')}</Txt>
      {!!error && <Txt color={C.error} variant="small">{error}</Txt>}

      {isLoading ? (
        <SkeletonRows />
      ) : auctions.length === 0 ? (
        <EmptyState icon="hammer-outline" title={t('sellerX.auctions.emptyTitle')} body={t('sellerX.auctions.emptyBody')} />
      ) : (
        auctions.map((p) => {
          const ended = p.auctionEndsAt ? new Date(p.auctionEndsAt).getTime() <= Date.now() : false;
          return (
            <Card key={p.id} style={{ gap: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={10}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ fontSize: 22 }}>{p.emoji ?? '🌾'}</Txt>
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Txt variant="title">{p.name}</Txt>
                    <Txt variant="muted">
                      {t('sellerX.auctions.startPrefix')} {p.startBidCents != null ? fmtCents(p.startBidCents) : p.price} · {t('sellerX.auctions.bids', { count: p.bidCount })}
                    </Txt>
                  </View>
                </Row>
                <Badge label={countdown(p.auctionEndsAt, t)} tone={ended ? 'slate' : 'mango'} />
              </Row>

              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="muted">{t('sellerX.auctions.highestBid')}</Txt>
                <Txt variant="title">
                  {p.highestCents != null ? fmtCents(p.highestCents) : '—'}
                  {p.highBidder ? ` · ${p.highBidder}` : ''}
                </Txt>
              </Row>

              <Row gap={8}>
                <View style={{ flex: 1 }}><Button title={t('sellerX.auctions.viewBids')} variant="outline" size="sm" full onPress={() => setViewing(p)} /></View>
                {!ended && (
                  <View style={{ flex: 1 }}>
                    <Button
                      title={close.isPending ? t('sellerX.auctions.closing') : t('sellerX.auctions.closeNow')}
                      size="sm"
                      full
                      disabled={close.isPending}
                      onPress={() => { setError(''); close.mutate(p.slug); }}
                    />
                  </View>
                )}
              </Row>
              <Button title={t('sellerX.auctions.viewListing')} variant="ghost" size="sm" onPress={() => nav.navigate('ProductDetail', { slug: p.slug })} />
            </Card>
          );
        })
      )}

      {starting && <StartAuctionSheet onClose={() => setStarting(false)} />}
      {viewing && <BidBookSheet slug={viewing.slug} name={viewing.name} onClose={() => setViewing(null)} />}
    </Screen>
  );
}
