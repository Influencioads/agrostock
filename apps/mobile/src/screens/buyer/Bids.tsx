import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { ApiBuyerBid, ApiBuyerBidMode } from '@agrotraders/api-client';
import { PRODUCT_UNITS, toUnit } from '@agrotraders/types';
import { api } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, ChipSelect, EmptyState, Input, Row, Screen, Segmented, SkeletonRows, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
import { GalleryEditor } from '../seller/AddProduct';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
interface MyBid { id: string; amountCents: number; createdAt: string; product?: { name: string; slug: string; emoji: string | null } }

/** H:M:S while open; null once closed. */
function hms(end: string | null | undefined) {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** Buyer posts a requirement. `auction` mode needs a closing time. */
function NewRequirementSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [mode, setMode] = useState<ApiBuyerBidMode>('quote');
  const [f, setF] = useState({ title: '', productName: '', qtyValue: '', qtyUnit: 'MT', targetPrice: '', deliveryPlace: '', notes: '', days: '7' });
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: () => {
      const closes = new Date(Date.now() + Math.max(Number(f.days) || 7, 1) * 864e5).toISOString();
      return api.buyerBids.create({
        mode,
        title: f.title,
        productName: f.productName,
        qtyValue: Number(f.qtyValue),
        qtyUnit: f.qtyUnit,
        targetPriceCents: f.targetPrice ? Math.round(Number(f.targetPrice) * 100) : undefined,
        deliveryPlace: f.deliveryPlace || undefined,
        notes: f.notes || undefined,
        images,
        ...(mode === 'auction' ? { auctionEndsAt: closes } : { deadline: closes }),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buyer-bids', 'mine'] }); onClose(); },
    onError: (e) => setError(errMessage(e, t('buyerX.bids.errPost'))),
  });

  const ready = !!f.title.trim() && !!f.productName.trim() && Number(f.qtyValue) > 0;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{t('buyerX.bids.postTitle')}</Txt>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={C.inkSoft} /></Pressable>
          </Row>

          <Segmented
            options={[{ id: 'quote', label: t('buyerX.bids.requestQuotes') }, { id: 'auction', label: t('buyerX.bids.createAuction') }]}
            value={mode}
            onChange={(m) => setMode(m as ApiBuyerBidMode)}
          />
          <Txt variant="muted">{t('buyerX.bids.modeCopy.' + mode)}</Txt>

          {!!error && <Txt color={C.error} variant="small">{error}</Txt>}
          <Input label={t('buyerX.bids.fieldTitle')} placeholder={t('pubX.ph.bidTitle')} value={f.title} onChangeText={set('title')} />
          <Input label={t('buyerX.bids.fieldProduct')} placeholder={t('pubX.ph.productBasmati1121')} value={f.productName} onChangeText={set('productName')} />
          <Row gap={10}>
            <View style={{ flex: 1 }}><Input label={t('buyerX.bids.fieldQuantity')} keyboardType="numeric" value={f.qtyValue} onChangeText={set('qtyValue')} /></View>
            <View style={{ flex: 1 }}>
              <ChipSelect
                label={t('buyerX.bids.fieldUnit')}
                value={toUnit(f.qtyUnit)}
                options={PRODUCT_UNITS.map((u) => ({ id: u, label: t(`enums:unit.${u}`) }))}
                onChange={set('qtyUnit')}
              />
            </View>
          </Row>
          <Input label={t('buyerX.bids.fieldTargetPrice', { unit: f.qtyUnit })} keyboardType="numeric" value={f.targetPrice} onChangeText={set('targetPrice')} />
          <Input label={t('buyerX.bids.fieldDeliveryPlace')} placeholder={t('pubX.ph.deliveryJebelAli')} value={f.deliveryPlace} onChangeText={set('deliveryPlace')} />
          <Input label={mode === 'auction' ? t('buyerX.bids.fieldAuctionDays') : t('buyerX.bids.fieldQuoteDays')} keyboardType="numeric" value={f.days} onChangeText={set('days')} />
          <Input label={t('buyerX.bids.fieldNotes')} placeholder={t('pubX.ph.notesSortex')} value={f.notes} onChangeText={set('notes')} />

          {/* Buyer's own upload route — the products one is seller-only. */}
          <GalleryEditor images={images} onChange={setImages} onError={setError} upload={api.buyerBids.uploadImages} />
          <Txt variant="muted">{t('buyerX.bids.photosHint')}</Txt>

          <Button
            title={create.isPending ? t('buyerX.bids.posting') : mode === 'auction' ? t('buyerX.bids.startAuction') : t('buyerX.bids.requestQuotes')}
            disabled={!ready || create.isPending}
            onPress={() => create.mutate()}
            full
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Buyer Bids — post requirements, watch seller bids land, award the winner. */
export function BuyerBids() {
  const { t } = useI18n();
  const { fmtCents } = useCurrency();
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(id); }, []);

  const { data: requirements = [], isLoading } = useQuery<ApiBuyerBid[]>({
    queryKey: ['buyer-bids', 'mine'], queryFn: () => api.buyerBids.mine(), enabled: !!user, refetchInterval: 20000,
  });
  const { data: bids = [] } = useQuery<MyBid[]>({
    queryKey: ['auctions', 'mine'], queryFn: () => api.auctions.mine() as Promise<MyBid[]>, enabled: !!user,
  });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h2">{t('buyerX.bids.screenTitle')}</Txt>
        <Button title={t('buyerX.bids.post')} size="sm" icon="add" onPress={() => setCreating(true)} disabled={!user} />
      </Row>
      <Txt variant="muted">{t('buyerX.bids.subtitle')}</Txt>

      {!user ? (
        <EmptyState icon="lock-closed-outline" title={t('buyerX.bids.signInTitle')} />
      ) : isLoading ? (
        <SkeletonRows />
      ) : (
        <>
          {requirements.length === 0 ? (
            <EmptyState icon="pricetags-outline" title={t('buyerX.bids.emptyReqTitle')} body={t('buyerX.bids.emptyReqBody')} />
          ) : (
            requirements.map((r) => {
              const isAuction = r.mode === 'auction';
              const time = isAuction ? hms(r.auctionEndsAt) : null;
              return (
                <Card key={r.id} onPress={() => nav.navigate('BuyerBidRoom', { id: r.id })} style={{ gap: 10 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={6}>
                      <Badge label={isAuction ? t('buyerX.bids.reverseAuction') : t('buyerX.bids.bids')} tone={isAuction ? 'mango' : 'info'} />
                      <Badge label={r.status} tone={r.status === 'open' ? 'green' : 'slate'} />
                    </Row>
                    {isAuction && r.status === 'open' && time ? (
                      <View style={{ backgroundColor: '#FBE9E6', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Txt style={{ fontSize: 11, fontWeight: '800', color: C.error }}>{time}</Txt>
                      </View>
                    ) : null}
                  </Row>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View style={{ flexShrink: 1 }}>
                      <Txt variant="title">{r.title}</Txt>
                      <Txt variant="muted">#{r.reference} · {r.qtyValue} {r.qtyUnit}</Txt>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Txt variant="muted">{r.bestPriceCents != null ? t('buyerX.bids.bestOffer') : t('buyerX.bids.bidCount', { count: r._count?.sellerBids ?? 0 })}</Txt>
                      <Txt variant="h3" color={C.dark}>{r.bestPriceCents != null ? `${fmtCents(r.bestPriceCents)}/${r.qtyUnit}` : '—'}</Txt>
                    </View>
                  </Row>
                </Card>
              );
            })
          )}

          <Txt variant="title" style={{ marginTop: 8 }}>{t('buyerX.bids.myBidsHeading')}</Txt>
          {bids.length === 0 ? (
            <EmptyState icon="hammer-outline" title={t('buyerX.bids.emptyBidsTitle')} body={t('buyerX.bids.emptyBidsBody')} />
          ) : (
            bids.map((b) => (
              <Card key={b.id} onPress={b.product ? () => nav.navigate('ProductDetail', { slug: b.product!.slug }) : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="title">{b.product?.emoji ?? '🌾'} {b.product?.name ?? t('buyerX.bids.auctionFallback')}</Txt>
                  <Txt variant="title">{fmtCents(b.amountCents)}</Txt>
                </Row>
              </Card>
            ))
          )}
        </>
      )}

      {creating && <NewRequirementSheet onClose={() => setCreating(false)} />}
    </Screen>
  );
}
