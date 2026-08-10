import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { ApiBuyerBid, ApiCategory } from '@agrotraders/api-client';
import {
  buyerBidTitle,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  PROCURE_WINDOWS,
  PRODUCT_UNITS,
  suggestProductName,
  toUnit,
} from '@agrotraders/types';
import { api } from '../../lib/api';
import { countryOptions } from '../../lib/countries';
import { errMessage } from '../../lib/format';
import { useCurrency } from '../../currency/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, Chip, ChipSelect, EmptyState, Input, Row, Screen, SkeletonRows, Txt } from '../../ui';
import { C, radius, space } from '../../theme/tokens';
// The requirement form offers the SAME controls a seller lists with, rather
// than a second set that drifts away from it.
import { AttributeFields, GalleryEditor, MarketPicker, SupplyCountriesPicker } from '../seller/AddProduct';
import { CategorySheet, EMPTY_SELECTION, type CategorySelection } from '../components/CategorySheet';
import { PickerField, ReadOnlyField } from '../components/PickerSheet';
import { CityField } from '../components/GeoFields';
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

/**
 * Buyer posts what they need; sellers underbid each other on it. One flow — the
 * old quote/auction choice is gone (see the API's `create`).
 */
function NewRequirementSheet({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { currency } = useCurrency();
  const { user } = useAuth();
  const [f, setF] = useState({
    qtyValue: '', qtyUnit: 'MT', moq: '', targetPrice: '', targetCurrency: currency, vatExtra: false,
    deliveryPlace: '', destinationCountry: '', origin: '', delivery: 'delivery', marketId: '',
    negotiable: false,
    notes: '', days: '7', procureBy: 'immediate',
    attributes: {} as Record<string, unknown>,
    supplyCountries: [] as string[],
  });
  // The picker hands back the resolved attribute fields, so the sheet never has
  // to walk the taxonomy itself.
  const [taxonomy, setTaxonomy] = useState<CategorySelection>(EMPTY_SELECTION);
  const [catSheet, setCatSheet] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  // Many Android numeric keyboards (ru included) only offer a comma separator;
  // `Number('840,5')` is NaN, which would block submit forever.
  const setNum = (k: 'qtyValue' | 'moq' | 'targetPrice' | 'days') => (v: string) => setF((p) => ({ ...p, [k]: v.replace(',', '.') }));

  const { data: categories = [] } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const attrFields = taxonomy.attrFields;
  const countries = countryOptions(lang);

  // Re-picking the taxonomy invalidates specs the new node has no field for.
  // The API trims them too — this is so the buyer SEES what was dropped.
  useEffect(() => {
    const keys = new Set(attrFields.map((a) => a.key));
    setF((p) => {
      const pruned = Object.fromEntries(Object.entries(p.attributes).filter(([k]) => keys.has(k)));
      return Object.keys(pruned).length === Object.keys(p.attributes).length ? p : { ...p, attributes: pruned };
    });
  }, [attrFields]);

  // Composed, never typed — the same title the web form builds, so both boards
  // list requirements that read alike and stay comparable.
  const leaf = taxonomy.subcategoryName || taxonomy.categoryName || '';
  const title = buyerBidTitle(
    taxonomy.trail.length ? taxonomy.trail : [leaf].filter(Boolean),
    f.deliveryPlace,
    user?.name ? t('buyerX.bids.titleFor', { name: user.name }) : '',
  );

  const create = useMutation({
    mutationFn: () => {
      const closes = new Date(Date.now() + Math.max(Number(f.days) || 7, 1) * 864e5).toISOString();
      return api.buyerBids.create({
        title,
        // The taxonomy leaf IS the product, sharpened by the specs picked —
        // exactly how the seller form names a listing.
        productName: suggestProductName(leaf, f.attributes) || leaf || title,
        qtyValue: Number(f.qtyValue),
        qtyUnit: f.qtyUnit,
        moq: f.moq ? Number(f.moq) : undefined,
        targetPriceCents: f.targetPrice ? Math.round(Number(f.targetPrice) * 100) : undefined,
        targetPriceCurrency: f.targetCurrency,
        vatExtra: f.vatExtra,
        origin: f.origin || undefined,
        delivery: f.delivery || undefined,
        supplyCountries: f.supplyCountries,
        marketId: f.marketId || undefined,
        // Mandatory — the API rejects anything else on a bid.
        safeDeal: true,
        negotiable: f.negotiable,
        deliveryPlace: f.deliveryPlace || undefined,
        destinationCountry: f.destinationCountry || undefined,
        procureBy: f.procureBy,
        notes: f.notes || undefined,
        categoryId: taxonomy.categoryId || undefined,
        subcategoryId: taxonomy.subcategoryId || undefined,
        attributes: Object.keys(f.attributes).length ? f.attributes : undefined,
        images,
        deadline: closes,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buyer-bids', 'mine'] }); onClose(); },
    onError: (e) => setError(errMessage(e, t('buyerX.bids.errPost'))),
  });

  const ready = !!leaf && Number(f.qtyValue) > 0;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">{t('buyerX.bids.postTitle')}</Txt>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={C.inkSoft} /></Pressable>
          </Row>

          <Txt variant="muted">{t('buyerX.bids.modeCopy.auction')}</Txt>

          {!!error && <Txt color={C.error} variant="small">{error}</Txt>}

          {/* Read-only: composed from the taxonomy below, so every requirement on
              the board reads the same way and stays comparable. */}
          <Input label={t('buyerX.bids.fieldTitle')} value={title} editable={false} placeholder={t('buyerX.bids.titleAuto')} />

          <View style={{ gap: 6 }}>
            <Txt variant="label">{t('sellerX.add.category')}</Txt>
            <Pressable
              onPress={() => setCatSheet(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12 }}
            >
              <Txt style={{ flex: 1, fontWeight: '700', color: taxonomy.categoryId ? C.ink : C.inkSoft }} numberOfLines={2}>
                {taxonomy.trail.length ? taxonomy.trail.join('  ›  ') : t('sellerX.add.category')}
              </Txt>
              <Ionicons name="chevron-down" size={18} color={C.inkSoft} />
            </Pressable>
          </View>

          <CategorySheet
            visible={catSheet}
            onClose={() => setCatSheet(false)}
            categories={categories}
            selection={taxonomy}
            onSelect={setTaxonomy}
          />

          {/* The subcategory's own spec fields — the same grades, sizes and
              percentages a seller fills in, so a bid is specific enough to price. */}
          <AttributeFields
            fields={attrFields}
            subcategory={taxonomy.subcategoryName || taxonomy.categoryName}
            value={f.attributes}
            onChange={set('attributes')}
          />

          <MarketPicker value={f.marketId} onChange={set('marketId')} label={t('buyerX.bids.whichMarket')} />

          <ChipSelect
            label={t('buyerX.bids.fieldUnit')}
            value={toUnit(f.qtyUnit)}
            options={PRODUCT_UNITS.map((u) => ({ id: u, label: t(`enums:unit.${u}`) }))}
            onChange={set('qtyUnit')}
          />
          <Row gap={10}>
            <View style={{ flex: 1 }}>
              <Input label={`${t('buyerX.bids.fieldQuantity')} (${toUnit(f.qtyUnit)})`} keyboardType="numeric" value={f.qtyValue} onChangeText={setNum('qtyValue')} />
            </View>
            {/* The listing's MOQ read from the other side: the smallest lot this
                buyer will take, so a seller who cannot fill the whole
                requirement knows whether a part-load is worth quoting. */}
            <View style={{ flex: 1 }}>
              <Input label={`${t('buyerX.bids.fieldMinLot')} (${toUnit(f.qtyUnit)})`} keyboardType="numeric" value={f.moq} onChangeText={setNum('moq')} />
            </View>
          </Row>

          {/* Quote the target in whatever currency the buyer trades in; the API
              converts it to the USD baseline every bid is compared against. */}
          <Row gap={10}>
            <View style={{ flex: 1 }}>
              <PickerField
                label={t('sellerX.add.currency')}
                value={f.targetCurrency}
                displayValue={`${CURRENCY_SYMBOLS[f.targetCurrency] ?? ''} ${f.targetCurrency}`.trim()}
                options={CURRENCIES.map((c) => ({ value: c, label: `${CURRENCY_SYMBOLS[c] ?? ''} ${c}`.trim() }))}
                onChange={set('targetCurrency')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input label={t('buyerX.bids.fieldTargetPrice', { unit: f.qtyUnit, currency: f.targetCurrency })} keyboardType="numeric" value={f.targetPrice} onChangeText={setNum('targetPrice')} />
            </View>
          </Row>
          {/* Sits with the price because that is the number it qualifies. */}
          <Row gap={8}>
            <Chip label={t('sellerX.add.vatExtra')} active={f.vatExtra} onPress={() => set('vatExtra')(!f.vatExtra)} />
          </Row>

          <ChipSelect
            label={t('buyerX.bids.fieldProcure')}
            value={f.procureBy}
            options={PROCURE_WINDOWS.map((w) => ({ id: w, label: t(`enums:procure.${w}`) }))}
            onChange={set('procureBy')}
          />

          {/* Where the buyer wants the goods GROWN — the mirror of the listing's
              origin, off the same country set so both sides match. */}
          <PickerField
            label={t('buyerX.bids.fieldPreferredOrigin')}
            placeholder={t('sellerX.add.searchCountry')}
            value={f.origin}
            displayValue={countries.find((o) => o.value === f.origin)?.label}
            options={countries}
            onChange={set('origin')}
            searchPlaceholder={t('sellerX.add.searchCountry')}
          />
          {/* Who moves the goods — the only two answers, same as the listing. */}
          <PickerField
            label={t('sellerX.add.delivery')}
            value={f.delivery === 'delivery' ? 'delivery' : 'self_pickup'}
            displayValue={t(`enums:delivery.${f.delivery === 'delivery' ? 'delivery' : 'self_pickup'}`)}
            options={[
              { value: 'delivery', label: t('enums:delivery.delivery') },
              { value: 'self_pickup', label: t('enums:delivery.self_pickup') },
            ]}
            onChange={set('delivery')}
          />

          {/* Country first — the city belongs to it, so it resets with it. */}
          <PickerField
            label={t('buyerX.bids.fieldDestinationCountry')}
            placeholder={t('sellerX.add.searchCountry')}
            value={f.destinationCountry}
            displayValue={countries.find((o) => o.value === f.destinationCountry)?.label}
            options={countries}
            onChange={(destinationCountry) => setF((p) => ({ ...p, destinationCountry, deliveryPlace: '' }))}
            searchPlaceholder={t('sellerX.add.searchCountry')}
          />
          <CityField
            label={t('buyerX.bids.fieldDeliveryPlace')}
            placeholder={t('sellerX.add.phCity')}
            country={f.destinationCountry || undefined}
            value={f.deliveryPlace}
            onChange={set('deliveryPlace')}
          />

          {/* The listing's supply-countries picker pointed the other way: which
              origins this buyer will actually accept offers from. */}
          <SupplyCountriesPicker
            value={f.supplyCountries}
            onChange={set('supplyCountries')}
            label={t('buyerX.bids.fieldAcceptFrom')}
            hint={t('buyerX.bids.fieldAcceptFromHint')}
          />

          {/* Settlement is NOT a choice on a bid: every bid settles through
              Safe Deal escrow, so the picker is replaced by a statement of the
              rule. The API rejects `safeDeal: false` on this flow. */}
          <ReadOnlyField
            label={t('sellerX.add.dealType')}
            value={t('sellerX.add.dealSafe')}
            hint={t('sellerX.add.dealBidLocked')}
          />
          <PickerField
            label={t('sellerX.add.priceType')}
            value={f.negotiable ? 'negotiable' : 'fixed'}
            displayValue={f.negotiable ? t('sellerX.add.priceNegotiable') : t('sellerX.add.priceFixed')}
            options={[
              { value: 'fixed', label: t('sellerX.add.priceFixed') },
              { value: 'negotiable', label: t('sellerX.add.priceNegotiable') },
            ]}
            onChange={(v) => set('negotiable')(v === 'negotiable')}
          />

          <Input label={t('buyerX.bids.fieldAuctionDays')} keyboardType="numeric" value={f.days} onChangeText={setNum('days')} />
          {/* Multi-line like the listing's — packing, loading terms, documents. */}
          <Input
            label={t('buyerX.bids.fieldNotes')}
            placeholder={t('pubX.ph.notesSortex')}
            value={f.notes}
            onChangeText={set('notes')}
            multiline
            maxLength={800}
            style={{ minHeight: 84, textAlignVertical: 'top' }}
          />

          {/* Buyer's own upload route — the products one is seller-only. */}
          <GalleryEditor images={images} onChange={setImages} onError={setError} upload={api.buyerBids.uploadImages} />
          <Txt variant="muted">{t('buyerX.bids.photosHint')}</Txt>

          <Button
            title={create.isPending ? t('buyerX.bids.posting') : t('buyerX.bids.postTitle')}
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
