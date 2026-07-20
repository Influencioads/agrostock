import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Icon, Input } from '@agrotraders/ui';
import type { ApiCategory, ApiMarket, ApiProduct } from '@agrotraders/api-client';
import { COUNTRIES } from '@agrotraders/api-client';
import { getAttributeFields, type AttrField } from '@agrotraders/types';
import { attrKey } from '@agrotraders/i18n';
import { api, assetUrl } from '../../lib/api';
import { useI18n } from '../../i18n';
import { errMessage } from './order-parts';

export const MAX_IMAGES = 6;

/** Sentinel option value that opens the inline "create a market" sub-form. */
const NEW_MARKET = '__new__';

export interface ProductFormValues {
  name: string;
  categoryId: string;
  subcategoryId: string;
  price: string;
  qty: string;
  moq: string;
  grade: string;
  flag: string;
  origin: string;
  city: string;
  country: string;
  /** Countries the seller can supply/ship this product to. */
  supplyCountries: string[];
  delivery: string;
  marketId: string;
  isOffer: boolean;
  isAuction: boolean;
  startBid: string;
  auctionEndsAt: string;
  /** Category/subcategory-specific attribute values, keyed by field key. */
  attributes: Record<string, unknown>;
  /** Ordered gallery; `images[0]` becomes the cover. */
  images: string[];
}

export const blankProduct: ProductFormValues = {
  name: '', categoryId: '', subcategoryId: '', price: '', qty: '', moq: '', grade: '', flag: '🌾',
  origin: '', city: '', country: '', supplyCountries: [], delivery: '', marketId: '',
  isOffer: false, isAuction: false, startBid: '', auctionEndsAt: '',
  attributes: {},
  images: [],
};

/** Map an existing product back onto the form shape (for Edit). */
export function productToForm(p: ApiProduct): ProductFormValues {
  const cat = p.category as { id?: string } | undefined;
  const sub = p.subcategory as { id?: string } | null | undefined;
  return {
    name: p.name ?? '',
    categoryId: cat?.id ?? '',
    subcategoryId: sub?.id ?? '',
    // The API stores the display string ("$840"); the form edits the bare number.
    price: (p.price ?? '').replace(/^\$/, ''),
    qty: p.qty ?? '',
    moq: p.moq ?? '',
    grade: p.grade ?? '',
    flag: p.flag ?? '🌾',
    origin: p.origin ?? '',
    city: p.city ?? '',
    country: p.country ?? '',
    supplyCountries: p.supplyCountries ?? [],
    delivery: p.delivery ?? '',
    marketId: p.market?.id ?? '',
    isOffer: !!p.isOffer,
    isAuction: !!p.isAuction,
    startBid: p.startBidCents != null ? String(p.startBidCents / 100) : '',
    auctionEndsAt: p.auctionEndsAt ? new Date(p.auctionEndsAt).toISOString().slice(0, 16) : '',
    attributes: (p.attributes as Record<string, unknown>) ?? {},
    images: p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [],
  };
}

/** Strip empties and shape the payload the products API expects. */
export function formToPayload(f: ProductFormValues) {
  return {
    name: f.name,
    categoryId: f.categoryId,
    ...(f.subcategoryId ? { subcategoryId: f.subcategoryId } : {}),
    price: f.price,
    ...(f.qty ? { qty: f.qty } : {}),
    ...(f.moq ? { moq: f.moq } : {}),
    ...(f.grade ? { grade: f.grade } : {}),
    ...(f.flag ? { flag: f.flag } : {}),
    ...(f.origin ? { origin: f.origin } : {}),
    ...(f.city ? { city: f.city } : {}),
    ...(f.country ? { country: f.country } : {}),
    supplyCountries: f.supplyCountries,
    ...(f.delivery ? { delivery: f.delivery } : {}),
    // '' means "no market"; the API maps null → detached.
    marketId: f.marketId || null,
    ...(f.attributes && Object.keys(f.attributes).length ? { attributes: f.attributes } : {}),
    isOffer: f.isOffer,
    isAuction: f.isAuction,
    images: f.images,
    ...(f.isAuction && f.startBid ? { startBidCents: Math.round(Number(f.startBid) * 100) } : {}),
    ...(f.isAuction && f.auctionEndsAt ? { auctionEndsAt: new Date(f.auctionEndsAt).toISOString() } : {}),
  };
}

export const productFormReady = (f: ProductFormValues) => !!f.name.trim() && !!f.categoryId && !!f.price.trim();

/* ── Gallery editor ──────────────────────────────────────────────── */

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
  upload?: (files: File[]) => Promise<{ imageUrls: string[] }>;
  max?: number;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const remaining = max - images.length;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same files
    if (!picked.length) return;
    if (picked.length > remaining) {
      onError(t('console.productForm.addMore', { count: remaining, max }));
      return;
    }
    onError('');
    setUploading(true);
    try {
      const { imageUrls } = await upload(picked);
      onChange([...images, ...imageUrls]);
    } catch (err) {
      onError(errMessage(err, t('console.productForm.uploadFailed')));
    } finally {
      setUploading(false);
    }
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {t('console.productForm.photos')} <span className="font-normal text-ink-soft">{t('console.productForm.coverHint', { count: images.length, max })}</span>
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {images.map((src, i) => (
          <div key={src + i} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-surface-border bg-brand-surface">
            <img src={assetUrl(src)} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute start-1 top-1 rounded bg-brand-dark/85 px-1.5 py-0.5 text-[10px] font-bold text-white">{t('console.productForm.cover')}</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 opacity-0 transition group-hover:opacity-100">
              <button type="button" title={t('console.productForm.moveLeft')} disabled={i === 0} onClick={() => move(i, i - 1)} className="px-1.5 py-1 text-xs text-white disabled:opacity-30">←</button>
              {i !== 0 && (
                <button type="button" title={t('console.productForm.makeCover')} onClick={() => move(i, 0)} className="px-1.5 py-1 text-[10px] font-bold text-white">{t('console.productForm.cover')}</button>
              )}
              <button type="button" title={t('console.productForm.moveRight')} disabled={i === images.length - 1} onClick={() => move(i, i + 1)} className="px-1.5 py-1 text-xs text-white disabled:opacity-30">→</button>
            </div>
            <button
              type="button"
              title={t('console.productForm.remove')}
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white opacity-0 transition group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-surface-border text-ink-soft transition hover:border-brand-leaf hover:text-brand-dark">
            <Icon name="plus" size={18} />
            <span className="text-[11px] font-semibold">{uploading ? t('console.productForm.uploading') : t('console.productForm.addPhoto')}</span>
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={onPick} />
          </label>
        )}
      </div>
    </div>
  );
}

/* ── Market select, with inline "create a market" ────────────────── */

function MarketSelect({
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
  const [draft, setDraft] = useState({ name: '', country: '', city: '', region: '', flag: '' });

  // `markets.mine` = approved markets + this seller's own pending proposals, so
  // a market they just created is selectable immediately.
  const { data: markets = [] } = useQuery<ApiMarket[]>({ queryKey: ['markets', 'mine'], queryFn: () => api.markets.mine() });

  const create = useMutation({
    mutationFn: () => api.markets.create({ name: draft.name, country: draft.country, city: draft.city || undefined, region: draft.region || undefined, flag: draft.flag || undefined }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['markets'] });
      onChange(m.id);
      setCreating(false);
      setDraft({ name: '', country: '', city: '', region: '', flag: '' });
    },
    onError: (e) => onError(errMessage(e, t('console.productForm.createMarketError'))),
  });

  const selected = markets.find((m) => m.id === value);

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.productForm.market')}</span>
      <select
        value={creating ? NEW_MARKET : value}
        onChange={(e) => {
          if (e.target.value === NEW_MARKET) { setCreating(true); return; }
          setCreating(false);
          onChange(e.target.value);
        }}
        className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf"
      >
        <option value="">{t('console.productForm.marketPlaceholder')}</option>
        {markets.map((m) => (
          <option key={m.id} value={m.id}>
            {m.flag} {m.name}{m.city ? ` · ${m.city}` : ''}{m.status === 'pending' ? t('console.productForm.pendingApproval') : ''}
          </option>
        ))}
        <option value={NEW_MARKET}>{t('console.productForm.createNewMarket')}</option>
      </select>

      {selected?.status === 'pending' && !creating && (
        <p className="mt-1.5 flex items-center gap-2 text-xs text-ink-soft">
          <Badge tone="warn">{t('console.productForm.pendingBadge')}</Badge> {t('console.productForm.pendingNote')}
        </p>
      )}

      {creating && (
        <div className="mt-3 space-y-3 rounded-xl border border-surface-border bg-brand-surface/40 p-3">
          <p className="text-xs text-ink-soft">{t('console.productForm.newMarketNote')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('console.productForm.marketName')} placeholder={t('console.productForm.phMarketName')} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input label={t('console.productForm.country')} placeholder={t('console.productForm.phCountry')} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
            <Input label={t('console.productForm.cityOptional')} placeholder={t('console.productForm.phCity')} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            <Input label={t('console.productForm.flagOptional')} placeholder="🇮🇳" value={draft.flag} onChange={(e) => setDraft({ ...draft, flag: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={!draft.name.trim() || !draft.country.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? t('console.productForm.creating') : t('console.productForm.createMarket')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>{t('common:cancel')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Supply-countries multi-select ───────────────────────────────── */

/**
 * Toggleable, searchable chip grid for the destinations a seller ships to.
 * Selected countries surface as a summary row above the picker.
 */
function SupplyCountriesSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((c) => c !== name) : [...value, name]);

  const q = query.trim().toLowerCase();
  const shown = q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)) : COUNTRIES;

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {t('console.productForm.supplyCountries')}{' '}
        <span className="font-normal text-ink-soft">{t('console.productForm.supplyCountriesHint')}</span>
      </span>

      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((name) => {
            const c = COUNTRIES.find((x) => x.name === name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className="inline-flex items-center gap-1 rounded-pill bg-brand-leaf px-2.5 py-1 text-xs font-bold text-white hover:brightness-95"
              >
                {c?.flag} {name} <span className="text-white/80">×</span>
              </button>
            );
          })}
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('console.productForm.searchCountry')}
        className="mb-2 h-10 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf"
      />
      <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-surface-border bg-brand-surface/30 p-2">
        {shown.map((c) => {
          const on = value.includes(c.name);
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => toggle(c.name)}
              className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 text-xs font-semibold transition ${
                on
                  ? 'border-brand-leaf bg-brand-leaf text-white'
                  : 'border-surface-border bg-white text-ink hover:border-brand-leaf'
              }`}
            >
              {c.flag} {c.name}
            </button>
          );
        })}
        {shown.length === 0 && <span className="px-1 py-1 text-xs text-ink-soft">{t('console.productForm.noCountry')}</span>}
      </div>
    </div>
  );
}

/* ── Category/subcategory-specific attribute fields ──────────────── */

/**
 * Renders the dynamic detail fields for the chosen subcategory (grade codes,
 * sizes, processing, etc.) from the shared attribute schema. Values live under
 * `attributes` keyed by each field's `key`.
 */
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
  // Only the display is localized — the stored value stays the canonical English
  // option, because buyer filters match on it.
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

  const selCls =
    'h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf';

  return (
    <div className="rounded-xl border border-surface-border bg-brand-surface/30 p-3">
      <p className="mb-3 text-sm font-semibold text-ink">
        {t('console.productForm.attrSectionTitle', { name: subcategory })}{' '}
        <span className="font-normal text-ink-soft">{t('console.productForm.attrSectionHint')}</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f: AttrField) => {
          const raw = value[f.key];
          const label = (
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              {aLabel(f.label)}
              {f.unit ? <span className="font-normal text-ink-soft"> ({f.unit})</span> : ''}
              {f.required ? <span className="text-brand-mango"> *</span> : ''}
            </span>
          );

          if (f.type === 'select') {
            return (
              <label key={f.key} className="block">
                {label}
                <select value={(raw as string) ?? ''} onChange={(e) => setField(f.key, e.target.value)} className={selCls}>
                  <option value="">—</option>
                  {(f.options ?? []).map((o) => <option key={o} value={o}>{aOpt(o)}</option>)}
                </select>
              </label>
            );
          }
          if (f.type === 'boolean') {
            return (
              <label key={f.key} className="flex items-center justify-between gap-2 rounded-md border border-surface-border bg-white px-3 py-2.5 text-sm sm:mt-6">
                <span className="font-semibold text-ink">{aLabel(f.label)}</span>
                <input type="checkbox" checked={raw === true} onChange={(e) => setField(f.key, e.target.checked || undefined)} className="accent-[#249653]" />
              </label>
            );
          }
          if (f.type === 'multiselect') {
            const arr = Array.isArray(raw) ? (raw as string[]) : [];
            return (
              <div key={f.key} className="sm:col-span-2">
                {label}
                <div className="flex flex-wrap gap-1.5">
                  {(f.options ?? []).map((o) => {
                    const on = arr.includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setField(f.key, on ? arr.filter((x) => x !== o) : [...arr, o])}
                        className={`rounded-pill border px-2.5 py-1 text-xs font-semibold transition ${on ? 'border-brand-leaf bg-brand-leaf text-white' : 'border-surface-border bg-white text-ink hover:border-brand-leaf'}`}
                      >
                        {aOpt(o)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }
          // text / number / date
          return (
            <label key={f.key} className="block">
              {label}
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={(raw as string) ?? ''}
                onChange={(e) => setField(f.key, e.target.value)}
                className={selCls}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ── The form ────────────────────────────────────────────────────── */

/**
 * One product form for every surface: the Inventory add/edit modal and the
 * dedicated "Add Product" tab. Keeping a single component is what stops the
 * two from drifting apart on market / gallery / auction fields.
 */
export function ProductForm({
  value,
  onChange,
  error,
  onError,
}: {
  value: ProductFormValues;
  onChange: (next: ProductFormValues) => void;
  error?: string;
  onError: (msg: string) => void;
}) {
  const { t } = useI18n();
  const { data: categories = [] } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const set = <K extends keyof ProductFormValues>(k: K) => (v: ProductFormValues[K]) => onChange({ ...value, [k]: v });
  const selectedCategory = categories.find((c) => c.id === value.categoryId);
  const subcategories = selectedCategory?.subcategories ?? [];
  const categoryName = selectedCategory?.name ?? null;
  const subcategoryName = subcategories.find((s) => s.id === value.subcategoryId)?.name ?? null;

  // Changing category invalidates any previously chosen subcategory.
  useEffect(() => {
    if (value.subcategoryId && !subcategories.some((s) => s.id === value.subcategoryId)) {
      onChange({ ...value, subcategoryId: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.categoryId, categories.length]);

  // Drop attribute values that don't belong to the current subcategory's schema.
  useEffect(() => {
    const keys = new Set(getAttributeFields(categoryName, subcategoryName).map((f) => f.key));
    const pruned = Object.fromEntries(Object.entries(value.attributes ?? {}).filter(([k]) => keys.has(k)));
    if (Object.keys(pruned).length !== Object.keys(value.attributes ?? {}).length) {
      onChange({ ...value, attributes: pruned });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryName, subcategoryName]);

  return (
    <div className="space-y-4">
      <GalleryEditor images={value.images} onChange={set('images')} onError={onError} />

      <Input label={t('console.productForm.productName')} placeholder={t('console.productForm.phName')} value={value.name} onChange={(e) => set('name')(e.target.value)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.productForm.category')}</span>
          <select
            value={value.categoryId}
            onChange={(e) => onChange({ ...value, categoryId: e.target.value, subcategoryId: '' })}
            className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf"
          >
            <option value="">{t('console.productForm.select')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.productForm.subcategory')}</span>
          <select
            value={value.subcategoryId}
            onChange={(e) => set('subcategoryId')(e.target.value)}
            disabled={subcategories.length === 0}
            className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf disabled:cursor-not-allowed disabled:bg-brand-surface/40 disabled:text-ink-soft"
          >
            <option value="">{subcategories.length === 0 ? t('console.productForm.none') : t('console.productForm.optional')}</option>
            {subcategories.map((s) => <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ''}{s.name}</option>)}
          </select>
        </label>
      </div>

      <AttributeFields
        category={categoryName}
        subcategory={subcategoryName}
        value={value.attributes}
        onChange={set('attributes')}
      />

      <MarketSelect value={value.marketId} onChange={set('marketId')} onError={onError} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t('console.productForm.price')} placeholder="840" value={value.price} onChange={(e) => set('price')(e.target.value)} />
        <Input label={t('console.productForm.grade')} placeholder={t('console.productForm.phGrade')} value={value.grade} onChange={(e) => set('grade')(e.target.value)} />
        <Input label={t('console.productForm.quantity')} placeholder={t('console.productForm.phQty')} value={value.qty} onChange={(e) => set('qty')(e.target.value)} />
        <Input label={t('console.productForm.moq')} placeholder={t('console.productForm.phMoq')} value={value.moq} onChange={(e) => set('moq')(e.target.value)} />
        <Input label={t('console.productForm.origin')} placeholder={t('console.productForm.phOrigin')} value={value.origin} onChange={(e) => set('origin')(e.target.value)} />
        <Input label={t('console.productForm.delivery')} placeholder={t('console.productForm.phDelivery')} value={value.delivery} onChange={(e) => set('delivery')(e.target.value)} />
      </div>

      {/* Location: where the goods physically sit */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t('console.productForm.city')} placeholder={t('console.productForm.phCity')} value={value.city} onChange={(e) => set('city')(e.target.value)} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('console.productForm.country')}</span>
          <select
            value={value.country}
            onChange={(e) => set('country')(e.target.value)}
            className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf"
          >
            <option value="">{t('console.productForm.select')}</option>
            {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
          </select>
        </label>
      </div>

      <SupplyCountriesSelect value={value.supplyCountries} onChange={set('supplyCountries')} />

      <div className="flex flex-wrap gap-4 pt-1">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={value.isOffer} onChange={(e) => set('isOffer')(e.target.checked)} className="accent-[#249653]" />
          {t('console.productForm.markOffer')}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={value.isAuction} onChange={(e) => set('isAuction')(e.target.checked)} className="accent-[#249653]" />
          {t('console.productForm.listAuction')}
        </label>
      </div>

      {value.isAuction && (
        <div className="grid gap-3 rounded-xl border border-surface-border bg-brand-surface/40 p-3 sm:grid-cols-2">
          <Input label={t('console.seller.startingBid')} type="number" placeholder="800" value={value.startBid} onChange={(e) => set('startBid')(e.target.value)} />
          <Input label={t('console.seller.auctionCloses')} type="datetime-local" value={value.auctionEndsAt} onChange={(e) => set('auctionEndsAt')(e.target.value)} />
        </div>
      )}

      {error && <p className="text-sm font-semibold text-status-error">{error}</p>}
    </div>
  );
}
