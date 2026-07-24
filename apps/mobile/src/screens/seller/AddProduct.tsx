import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { ApiCategory, ApiMarket, ApiProduct } from '@agrotraders/api-client';
import { COUNTRIES } from '@agrotraders/api-client';
import { getAttributeFields, PRODUCT_UNITS, toUnit, type AttrField } from '@agrotraders/types';
import { attrKey } from '@agrotraders/i18n';
import { api, assetUrl } from '../../lib/api';
import { errMessage } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Badge, Button, Card, Chip, ChipSelect, Input, Row, Screen, Txt } from '../../ui';
import { C, radius } from '../../theme/tokens';
import { CategorySheet, EMPTY_SELECTION, type CategorySelection } from '../components/CategorySheet';
import { MultiPickerField, PickerField } from '../components/PickerSheet';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'Section'>;

export const MAX_IMAGES = 6;

const blank = {
  name: '', categoryId: '', subcategoryId: '', price: '', unit: 'MT', qty: '', moq: '',
  grade: '', emoji: '🌾', origin: '', city: '', country: '', delivery: '', isOffer: false, isAuction: false,
  marketId: '', startBid: '', auctionDays: '7',
  images: [] as string[],
  supplyCountries: [] as string[],
  attributes: {} as Record<string, unknown>,
};

/* ── Market picker with inline create ─────────────────────────────── */

function MarketPicker({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', country: '', city: '', flag: '' });

  // Approved markets + this seller's own pending proposals, so a market they
  // just created is selectable immediately.
  const { data: markets = [] } = useQuery<ApiMarket[]>({ queryKey: ['markets', 'mine'], queryFn: () => api.markets.mine() });

  const create = useMutation({
    mutationFn: () => api.markets.create({ name: draft.name, country: draft.country, city: draft.city || undefined, flag: draft.flag || undefined }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['markets'] });
      onChange(m.id);
      setCreating(false);
      setDraft({ name: '', country: '', city: '', flag: '' });
    },
    onError: (e) => onError(errMessage(e, t('sellerX.market.createError'))),
  });

  const selected = markets.find((m) => m.id === value);

  return (
    <View style={{ gap: 8 }}>
      <Txt variant="label">{t('sellerX.market.label')}</Txt>
      <ChipSelect
        options={[
          { id: '', label: t('sellerX.market.none') },
          ...markets.map((m) => ({
            id: m.id,
            label: `${m.flag ?? ''} ${m.name}${m.status === 'pending' ? t('sellerX.market.pendingSuffix') : ''}`.trim(),
          })),
        ]}
        value={value}
        onChange={onChange}
      />
      {selected?.status === 'pending' && (
        <Row gap={6}>
          <Badge label={t('sellerX.market.pendingApproval')} tone="warn" />
          <Txt variant="small">{t('sellerX.market.pendingHint')}</Txt>
        </Row>
      )}

      {creating ? (
        <Card style={{ gap: 10 }}>
          <Txt variant="small">{t('sellerX.market.reviewHint')}</Txt>
          <Input label={t('sellerX.market.name')} placeholder={t('sellerX.market.phName')} value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} />
          <Row gap={10}>
            <View style={{ flex: 1 }}><Input label={t('sellerX.market.country')} placeholder={t('sellerX.market.phCountry')} value={draft.country} onChangeText={(v) => setDraft({ ...draft, country: v })} /></View>
            <View style={{ flex: 1 }}><Input label={t('sellerX.market.city')} placeholder={t('sellerX.market.phCity')} value={draft.city} onChangeText={(v) => setDraft({ ...draft, city: v })} /></View>
          </Row>
          <Input label={t('sellerX.market.flag')} placeholder="🇮🇳" value={draft.flag} onChangeText={(v) => setDraft({ ...draft, flag: v })} />
          <Row gap={8}>
            <Button
              title={create.isPending ? t('sellerX.market.creating') : t('sellerX.market.create')}
              size="sm"
              disabled={!draft.name.trim() || !draft.country.trim() || create.isPending}
              onPress={() => create.mutate()}
            />
            <Button title={t('sellerX.market.cancel')} size="sm" variant="ghost" onPress={() => setCreating(false)} />
          </Row>
        </Card>
      ) : (
        <Pressable onPress={() => setCreating(true)}>
          <Txt variant="small" color={C.leaf}>{t('sellerX.market.addNew')}</Txt>
        </Pressable>
      )}
    </View>
  );
}

/* ── Gallery editor ───────────────────────────────────────────────── */

/**
 * Upload-on-pick image gallery. `upload` is injectable because the routes are
 * role-scoped: products' is seller-only, so a buyer attaching photos to a
 * requirement must pass `api.buyerBids.uploadImages` instead.
 */
export function GalleryEditor({
  images,
  onChange,
  onError,
  upload = api.products.uploadImages,
  max = MAX_IMAGES,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  onError: (msg: string) => void;
  upload?: (files: { uri: string; name: string; type: string }[]) => Promise<{ imageUrls: string[] }>;
  max?: number;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const remaining = max - images.length;

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { onError(t('sellerX.gallery.permissionError')); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (res.canceled || !res.assets?.length) return;
    onError('');
    setUploading(true);
    try {
      const files = res.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName || a.uri.split('/').pop() || 'photo.jpg',
        type: a.mimeType || 'image/jpeg',
      }));
      const { imageUrls } = await upload(files);
      onChange([...images, ...imageUrls]);
    } catch (e) {
      onError(errMessage(e, t('sellerX.gallery.uploadError')));
    } finally {
      setUploading(false);
    }
  }

  const makeCover = (i: number) => {
    if (i === 0) return;
    const next = [...images];
    const [m] = next.splice(i, 1);
    next.unshift(m);
    onChange(next);
  };

  return (
    <View style={{ gap: 8 }}>
      <Txt variant="label">{t('sellerX.gallery.photos', { n: images.length, max })}</Txt>
      <Txt variant="small">{t('sellerX.gallery.hint')}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {images.map((src, i) => (
          <View key={src + i} style={{ width: 84, height: 84 }}>
            <Pressable
              onPress={() => makeCover(i)}
              style={{ width: 84, height: 84, borderRadius: 14, overflow: 'hidden', backgroundColor: C.surface, borderWidth: i === 0 ? 2 : 1, borderColor: i === 0 ? C.leaf : C.border }}
            >
              <Image source={{ uri: assetUrl(src) }} style={{ width: '100%', height: '100%' }} />
            </Pressable>
            {i === 0 && (
              <View style={{ position: 'absolute', left: 4, top: 4, backgroundColor: C.leaf, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Txt variant="small" style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{t('sellerX.gallery.cover')}</Txt>
              </View>
            )}
            <Pressable
              onPress={() => onChange(images.filter((_, j) => j !== i))}
              hitSlop={8}
              style={{ position: 'absolute', right: 2, top: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={13} color="#fff" />
            </Pressable>
          </View>
        ))}
        {remaining > 0 && (
          <Pressable
            onPress={pick}
            disabled={uploading}
            style={{ width: 84, height: 84, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, alignItems: 'center', justifyContent: 'center', gap: 2 }}
          >
            <Ionicons name="add" size={20} color={C.inkSoft} />
            <Txt variant="small" style={{ fontSize: 10 }}>{uploading ? t('sellerX.gallery.uploading') : t('sellerX.gallery.add')}</Txt>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Country pickers (single origin + multi supply) ───────────────── */

/**
 * Both pickers used to render all ~60 countries as inline chips behind a search
 * box, which buried the rest of the form under several screens of flags. They
 * are searchable sheets now, showing only what the seller actually picked.
 */
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.name, label: `${c.flag} ${c.name}` }));

/** Searchable single-select for the country the goods sit in. */
function CountryPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const { t } = useI18n();
  return (
    <PickerField
      label={t('sellerX.add.country')}
      placeholder={t('sellerX.add.searchCountry')}
      value={value}
      displayValue={COUNTRY_OPTIONS.find((o) => o.value === value)?.label}
      options={COUNTRY_OPTIONS}
      onChange={onChange}
      searchPlaceholder={t('sellerX.add.searchCountry')}
    />
  );
}

/** Searchable multi-select for the countries the seller can supply to. */
function SupplyCountriesPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const { t } = useI18n();
  return (
    <MultiPickerField
      label={t('sellerX.add.supplyCountries')}
      hint={t('sellerX.add.supplyCountriesHint')}
      placeholder={t('sellerX.add.searchCountry')}
      values={value}
      options={COUNTRY_OPTIONS}
      onChange={onChange}
      searchPlaceholder={t('sellerX.add.searchCountry')}
    />
  );
}

/* ── Category/subcategory-specific attribute fields ──────────────── */

/** Dynamic detail inputs for the chosen subcategory, from the shared schema. */
function AttributeFields({
  category,
  subcategory,
  value,
  onChange,
}: {
  category?: string | null;
  subcategory?: string | null;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const aLabel = (s: string) => t(`attrs:label.${attrKey(s)}`, { defaultValue: s });
  const aOpt = (s: string) => t(`attrs:option.${attrKey(s)}`, { defaultValue: s });
  const fields = getAttributeFields(category, subcategory);
  if (fields.length === 0) return null;

  const setField = (key: string, v: unknown) => {
    const next = { ...value };
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete next[key];
    else next[key] = v;
    onChange(next);
  };

  return (
    <View style={{ gap: 12 }}>
      <Txt variant="label">{t('sellerX.add.attrSectionTitle', { name: subcategory })}</Txt>
      {fields.map((f: AttrField) => {
        const raw = value[f.key];
        // Only the display is localized — the stored value stays the canonical
        // English option, because buyer filters match on it.
        const label = `${aLabel(f.label)}${f.unit ? ` (${f.unit})` : ''}${f.required ? ' *' : ''}`;

        if (f.type === 'select') {
          return (
            <View key={f.key} style={{ gap: 6 }}>
              <Txt variant="small">{label}</Txt>
              <ChipSelect
                options={[{ id: '', label: '—' }, ...(f.options ?? []).map((o) => ({ id: o, label: aOpt(o) }))]}
                value={(raw as string) ?? ''}
                onChange={(v) => setField(f.key, v)}
              />
            </View>
          );
        }
        if (f.type === 'multiselect') {
          const arr = Array.isArray(raw) ? (raw as string[]) : [];
          return (
            <View key={f.key} style={{ gap: 6 }}>
              <Txt variant="small">{label}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(f.options ?? []).map((o) => (
                  <Chip
                    key={o}
                    label={aOpt(o)}
                    active={arr.includes(o)}
                    onPress={() => setField(f.key, arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}
                  />
                ))}
              </View>
            </View>
          );
        }
        if (f.type === 'boolean') {
          return (
            <Chip
              key={f.key}
              label={aLabel(f.label)}
              active={raw === true}
              onPress={() => setField(f.key, raw === true ? undefined : true)}
            />
          );
        }
        // text / number / date
        return (
          <Input
            key={f.key}
            label={label}
            keyboardType={f.type === 'number' ? 'numeric' : 'default'}
            value={(raw as string) ?? ''}
            onChangeText={(v) => setField(f.key, v)}
          />
        );
      })}
    </View>
  );
}

/* ── Screen ───────────────────────────────────────────────────────── */

/** Create or edit a product. Edit mode when the Section route carries `productId`. */
export function SellerAddProduct() {
  const { t } = useI18n();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const editingId = params?.productId;
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: categories = [] } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const categoryName = selectedCategory?.name ?? null;
  // The picker hands back the resolved names, so the form never has to walk the
  // tree itself. `attrSource` is the level-2 ancestor whose schema applies.
  const [taxonomy, setTaxonomy] = useState<CategorySelection>(EMPTY_SELECTION);
  const [catSheet, setCatSheet] = useState(false);
  const subcategoryName = taxonomy.attrSource;

  // Edit mode: prefill from the seller's own listings.
  const { data: mine = [] } = useQuery<ApiProduct[]>({
    queryKey: ['products', 'mine'],
    queryFn: () => api.products.mine(),
    enabled: !!user && !!editingId,
  });
  useEffect(() => {
    if (!editingId) return;
    const p = mine.find((x) => x.id === editingId);
    if (p) {
      setForm((f) => ({
        ...f,
        name: p.name ?? '', price: String(p.price ?? '').replace(/[^0-9.]/g, ''), unit: toUnit(p.unit),
        qty: p.qty ?? '', moq: p.moq ?? '', grade: p.grade ?? '', emoji: p.emoji ?? '🌾',
        origin: p.origin ?? '', city: p.city ?? '', country: p.country ?? '',
        subcategoryId: (p.subcategory && typeof p.subcategory === 'object' ? (p.subcategory as { id?: string }).id : '') ?? '',
        attributes: (p.attributes as Record<string, unknown>) ?? {},
        supplyCountries: p.supplyCountries ?? [],
        delivery: p.delivery ?? '', isOffer: !!p.isOffer, isAuction: !!p.isAuction,
        marketId: p.market?.id ?? '',
        startBid: p.startBidCents != null ? String(p.startBidCents / 100) : '',
        // Older rows may predate the gallery; fall back to the single cover.
        images: p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [],
      }));
    }
  }, [editingId, mine]);

  // Drop attribute values that don't belong to the current subcategory's schema.
  useEffect(() => {
    const keys = new Set(getAttributeFields(categoryName, subcategoryName).map((f) => f.key));
    setForm((f) => {
      const pruned = Object.fromEntries(Object.entries(f.attributes ?? {}).filter(([k]) => keys.has(k)));
      return Object.keys(pruned).length === Object.keys(f.attributes ?? {}).length ? f : { ...f, attributes: pruned };
    });
  }, [categoryName, subcategoryName]);

  const save = useMutation({
    mutationFn: () => {
      const { images, marketId, startBid, auctionDays, isAuction, subcategoryId, attributes, ...rest } = form;
      const payload: Record<string, unknown> = {
        ...rest,
        isAuction,
        images,
        marketId: marketId || null,
        ...(subcategoryId ? { subcategoryId } : {}),
        ...(attributes && Object.keys(attributes).length ? { attributes } : {}),
      };
      if (isAuction) {
        if (startBid) payload.startBidCents = Math.round(Number(startBid) * 100);
        payload.auctionEndsAt = new Date(Date.now() + Math.max(Number(auctionDays) || 7, 1) * 864e5).toISOString();
      }
      return editingId ? api.products.update(editingId, payload) : api.products.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', 'mine'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
      nav.goBack();
    },
    onError: (e) => setErr(errMessage(e, t('sellerX.add.saveError'))),
  });

  const canSubmit = !!form.name && !!form.price && (!!editingId || !!form.categoryId);

  return (
    <Screen>
      <Txt variant="h2">{editingId ? t('sellerX.add.editTitle') : t('sellerX.add.addTitle')}</Txt>
      <Txt variant="muted">{t('sellerX.add.subtitle')}</Txt>

      <Card style={{ gap: 14 }}>
        {!!err && <Txt color={C.error} variant="small">{err}</Txt>}

        <GalleryEditor images={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} onError={setErr} />

        <Input label={t('sellerX.add.name')} placeholder={t('sellerX.add.phName')} value={form.name} onChangeText={set('name')} />
        {/* One cascading picker instead of two chip strips — the taxonomy is five
            levels deep, which no chip strip can represent. */}
        <View style={{ gap: 6 }}>
          <Txt variant="label">{t('sellerX.add.category')}</Txt>
          <Pressable
            onPress={() => setCatSheet(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1, borderColor: form.categoryId ? C.green : C.border, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 46, paddingVertical: 8 }}
          >
            <Ionicons name="grid-outline" size={18} color={form.categoryId ? C.green : C.inkSoft} />
            <Txt style={{ flex: 1, fontWeight: '700', color: form.categoryId ? C.ink : C.inkSoft }} numberOfLines={2}>
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
          onSelect={(next) => {
            setTaxonomy(next);
            setForm((f) => ({ ...f, categoryId: next.categoryId, subcategoryId: next.subcategoryId }));
          }}
        />

        <AttributeFields
          category={categoryName}
          subcategory={subcategoryName}
          value={form.attributes}
          onChange={(attributes) => setForm((f) => ({ ...f, attributes }))}
        />

        <MarketPicker value={form.marketId} onChange={(id) => setForm((f) => ({ ...f, marketId: id }))} onError={setErr} />

        <Row gap={10}>
          <View style={{ flex: 1 }}><Input label={t('sellerX.add.price')} keyboardType="numeric" placeholder="840" value={form.price} onChangeText={set('price')} /></View>
          <View style={{ flex: 1 }}>
            <PickerField
              label={t('sellerX.add.unit')}
              value={toUnit(form.unit)}
              displayValue={t(`enums:unit.${toUnit(form.unit)}`)}
              options={PRODUCT_UNITS.map((u) => ({ value: u, label: t(`enums:unit.${u}`) }))}
              onChange={set('unit')}
            />
          </View>
        </Row>
        <Row gap={10}>
          <View style={{ flex: 1 }}><Input label={t('sellerX.add.quantity')} placeholder={t('sellerX.add.phQty')} value={form.qty} onChangeText={set('qty')} /></View>
          <View style={{ flex: 1 }}><Input label={t('sellerX.add.moq')} placeholder={t('sellerX.add.phMoq')} value={form.moq} onChangeText={set('moq')} /></View>
        </Row>
        <Row gap={10}>
          <View style={{ flex: 1 }}><Input label={t('sellerX.add.grade')} placeholder={t('sellerX.add.phGrade')} value={form.grade} onChangeText={set('grade')} /></View>
          <View style={{ flex: 1 }}><Input label={t('sellerX.add.emoji')} placeholder="🌾" value={form.emoji} onChangeText={set('emoji')} /></View>
        </Row>
        <Row gap={10}>
          <View style={{ flex: 1 }}><Input label={t('sellerX.add.origin')} placeholder={t('sellerX.add.phOrigin')} value={form.origin} onChangeText={set('origin')} /></View>
          <View style={{ flex: 1 }}><Input label={t('sellerX.add.delivery')} placeholder={t('sellerX.add.phDelivery')} value={form.delivery} onChangeText={set('delivery')} /></View>
        </Row>

        {/* Country first — the city belongs to it. */}
        <CountryPicker value={form.country} onChange={(country) => setForm((f) => ({ ...f, country }))} />
        <Input label={t('sellerX.add.city')} placeholder={t('sellerX.add.phCity')} value={form.city} onChangeText={set('city')} />
        <SupplyCountriesPicker value={form.supplyCountries} onChange={(supplyCountries) => setForm((f) => ({ ...f, supplyCountries }))} />

        <View style={{ gap: 8 }}>
          <Txt variant="label">{t('sellerX.add.listingType')}</Txt>
          <Row gap={8}>
            <Chip label={t('sellerX.add.offer')} active={form.isOffer} onPress={() => setForm((f) => ({ ...f, isOffer: !f.isOffer }))} />
            <Chip label={t('sellerX.add.auction')} active={form.isAuction} onPress={() => setForm((f) => ({ ...f, isAuction: !f.isAuction }))} />
          </Row>
        </View>

        {form.isAuction && (
          <Row gap={10}>
            <View style={{ flex: 1 }}><Input label={t('sellerX.add.startBid')} keyboardType="numeric" placeholder="800" value={form.startBid} onChangeText={set('startBid')} /></View>
            <View style={{ flex: 1 }}><Input label={t('sellerX.add.runsForDays')} keyboardType="numeric" value={form.auctionDays} onChangeText={set('auctionDays')} /></View>
          </Row>
        )}

        <Button
          title={save.isPending ? t('sellerX.add.saving') : editingId ? t('sellerX.add.saveChanges') : t('sellerX.add.addProduct')}
          full
          disabled={!canSubmit || save.isPending}
          onPress={() => save.mutate()}
        />
      </Card>
    </Screen>
  );
}
