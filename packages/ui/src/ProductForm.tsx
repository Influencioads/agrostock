import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ApiCategory, ApiMarket, ApiProduct } from '@agrotraders/api-client';
import {
  ALL_COUNTRIES,
  buildSubcategoryTree,
  countryFlag,
  countryLabel,
  findCountry,
  findSubcategoryPath,
  resolveAttrFields,
} from '@agrotraders/api-client';
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  isPercentField,
  optionLabel,
  PERCENT_OPTIONS,
  PRODUCT_UNITS,
  suggestProductName,
  toUnit,
  type AttrField,
} from '@agrotraders/types';
import { Combobox, SearchSelect } from './Combobox';
import { Icon } from './Icon';
import { Input } from './Input';

export const MAX_IMAGES = 6;

/**
 * The slice of the API client this form talks to. Structural, so each app just
 * hands over its own configured `api` — the component lives in `@agrotraders/ui`
 * precisely so the seller console and the admin panel edit listings through the
 * SAME form instead of two that drift apart.
 */
export interface ProductFormApi {
  categories: { list: () => Promise<ApiCategory[]> };
  markets: { list: () => Promise<ApiMarket[]> };
  products: { uploadImages: (files: File[]) => Promise<{ imageUrls: string[] }> };
  geo: { cities: (country: string, q?: string) => Promise<string[]> };
}

/** Namespaces the form reads; every key below is explicitly prefixed, because
 *  the two host apps have different `defaultNS` ('web' vs 'admin'). */
const NS = ['web', 'common', 'enums'] as const;

/** Pull the API's message out of an axios-shaped error. */
export function formErrMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
}

/** Strip a stored "500 MT" back to the bare number the numeric inputs hold. */
const bareNumber = (s?: string | null) => (s ?? '').replace(/[^\d.]/g, '');
/** Recompose "500" + "MT" → "500 MT" for storage/display. */
const withUnit = (amount: string, unit: string) => (amount.trim() ? `${amount.trim()} ${toUnit(unit)}` : '');

export interface ProductFormValues {
  name: string;
  categoryId: string;
  subcategoryId: string;
  price: string;
  /** Currency the seller quotes in — converted to a USD baseline by the API. */
  priceCurrency: string;
  /** Price is net of VAT; the buyer sees "VAT extra" under it. */
  vatExtra: boolean;
  /** Bare number; the metric comes from `unit`. */
  qty: string;
  /** Quantity unit (`PRODUCT_UNITS`) — applies to quantity, MOQ and stock alike. */
  unit: string;
  /** Bare number; the metric comes from `unit`. */
  moq: string;
  flag: string;
  origin: string;
  city: string;
  country: string;
  /** Countries the seller can supply/ship this product to. */
  supplyCountries: string[];
  /** A `DELIVERY_OPTIONS` id (legacy listings may still hold free text). */
  delivery: string;
  marketId: string;
  isOffer: boolean;
  isAuction: boolean;
  /** Escrow-protected sale vs. a direct deal between the two parties. */
  safeDeal: boolean;
  /** Seller will entertain offers on the listed price. */
  negotiable: boolean;
  startBid: string;
  auctionEndsAt: string;
  /** FLOW-04: on-hand stock. Empty = unmanaged (unlimited); a number = managed. */
  stock: string;
  /** Category/subcategory-specific attribute values, keyed by field key. */
  attributes: Record<string, unknown>;
  /** Anything else the buyer should know — packing, loading terms, remarks. */
  notes: string;
  /** Ordered gallery; `images[0]` becomes the cover. */
  images: string[];
}

export const blankProduct: ProductFormValues = {
  name: '', categoryId: '', subcategoryId: '', price: '', priceCurrency: 'USD', vatExtra: false, qty: '', unit: 'MT', moq: '',
  flag: '🌾', notes: '',
  origin: '', city: '', country: '', supplyCountries: [], delivery: 'delivery', marketId: '',
  isOffer: false, isAuction: false, safeDeal: true, negotiable: false, startBid: '', auctionEndsAt: '', stock: '',
  attributes: {},
  images: [],
};

/**
 * Every field the form prefills from. `ApiProduct` (seller console) and
 * `AdminProduct` (admin panel) both satisfy it — the admin list returns full
 * rows for exactly this reason.
 */
export interface EditableProduct {
  name?: string | null;
  category?: { id?: string } | string | null;
  subcategory?: { id?: string } | string | null;
  price?: string | null;
  priceCurrency?: string | null;
  vatExtra?: boolean | null;
  notes?: string | null;
  qty?: string | null;
  unit?: string | null;
  moq?: string | null;
  flag?: string | null;
  origin?: string | null;
  city?: string | null;
  country?: string | null;
  supplyCountries?: string[] | null;
  delivery?: string | null;
  market?: { id?: string } | null;
  isOffer?: boolean | null;
  isAuction?: boolean | null;
  safeDeal?: boolean | null;
  negotiable?: boolean | null;
  startBidCents?: number | null;
  startBidSrcCents?: number | null;
  auctionEndsAt?: string | null;
  stockQty?: number | null;
  attributes?: Record<string, unknown> | null;
  images?: string[] | null;
  imageUrl?: string | null;
  /**
   * Canonical English for the columns the API translates, sent by
   * `GET /products/mine`. The row itself carries the seller's language so the
   * list reads naturally; the form must edit the original or Save would write
   * the translation back over the source row.
   */
  source?: Partial<Pick<EditableProduct, 'name' | 'origin' | 'qty' | 'moq' | 'delivery' | 'attributes'>> | null;
}

/** Relations come back as objects here, but plain names on some list shapes. */
const relId = (v: { id?: string } | string | null | undefined) => (typeof v === 'object' && v ? v.id ?? '' : '');

/** Map an existing product back onto the form shape (for Edit). */
export function productToForm(p: EditableProduct | ApiProduct): ProductFormValues {
  const q = p as EditableProduct;
  // Admin rows and older payloads have no `source`; they are already canonical.
  const src = q.source ?? {};
  return {
    name: src.name ?? q.name ?? '',
    categoryId: relId(q.category),
    subcategoryId: relId(q.subcategory),
    // The API stores the display string ("₹70,000"); the form edits the bare number.
    price: bareNumber(q.price),
    priceCurrency: q.priceCurrency ?? 'USD',
    vatExtra: !!q.vatExtra,
    notes: q.notes ?? '',
    qty: bareNumber(src.qty ?? q.qty),
    // Listings created before units were a picker stored the display form ('/MT').
    unit: toUnit(q.unit),
    moq: bareNumber(src.moq ?? q.moq),
    flag: q.flag ?? '🌾',
    origin: src.origin ?? q.origin ?? '',
    city: q.city ?? '',
    country: q.country ?? '',
    supplyCountries: q.supplyCountries ?? [],
    // Only two answers exist now — the seller delivers, or the buyer arranges a
    // partner. Legacy free text ("Ready") and the retired "no_delivery" both
    // collapse onto one of them rather than showing a blank picker.
    delivery: (src.delivery ?? q.delivery) === 'self_pickup' || (src.delivery ?? q.delivery) === 'no_delivery' ? 'self_pickup' : 'delivery',
    marketId: q.market?.id ?? '',
    isOffer: !!q.isOffer,
    isAuction: !!q.isAuction,
    safeDeal: q.safeDeal ?? true,
    negotiable: !!q.negotiable,
    // Prefer the seller's typed amount (their currency); startBidCents is the
    // USD baseline and only right for legacy rows saved before the split.
    startBid: q.startBidSrcCents != null ? String(q.startBidSrcCents / 100) : q.startBidCents != null ? String(q.startBidCents / 100) : '',
    auctionEndsAt: q.auctionEndsAt ? new Date(q.auctionEndsAt).toISOString().slice(0, 16) : '',
    stock: q.stockQty != null ? String(q.stockQty) : '',
    // Stored attribute values are canonical English — the buyer facets match on
    // them, so the translated display copy must never be saved back.
    attributes: src.attributes ?? q.attributes ?? {},
    images: q.images?.length ? q.images : q.imageUrl ? [q.imageUrl] : [],
  };
}

/** Strip empties and shape the payload the products API expects. */
export function formToPayload(f: ProductFormValues) {
  return {
    name: f.name,
    categoryId: f.categoryId,
    ...(f.subcategoryId ? { subcategoryId: f.subcategoryId } : {}),
    price: f.price,
    priceCurrency: f.priceCurrency || 'USD',
    vatExtra: f.vatExtra,
    // Sent even when blank, so clearing the box actually clears the note.
    notes: f.notes.trim(),
    // Quantity/MOQ are stored with their metric so every render reads "500 MT"
    // without the seller ever typing the unit.
    ...(f.qty ? { qty: withUnit(f.qty, f.unit) } : {}),
    unit: toUnit(f.unit),
    ...(f.moq ? { moq: withUnit(f.moq, f.unit) } : {}),
    // The flag follows the origin country, so it is never hand-typed.
    ...(countryFlag(f.origin) || f.flag ? { flag: countryFlag(f.origin) || f.flag } : {}),
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
    safeDeal: f.safeDeal,
    negotiable: f.negotiable,
    images: f.images,
    // FLOW-04: send stockQty only when the seller entered a number; blank leaves
    // the listing unmanaged (unlimited). `null` explicitly clears managed stock.
    stockQty: f.stock.trim() === '' ? null : Math.max(0, Math.round(Number(f.stock))),
    ...(f.isAuction && f.startBid ? { startBidCents: Math.round(Number(f.startBid) * 100) } : {}),
    ...(f.isAuction && f.auctionEndsAt ? { auctionEndsAt: new Date(f.auctionEndsAt).toISOString() } : {}),
  };
}

/** The fields the form paints red when they block a save. */
export type ProductFormField = 'name' | 'categoryId' | 'price' | 'images';

/**
 * What is missing or wrong, so the seller SEES which field to fix instead of
 * staring at a dead Save button. A photo is part of "ready": the buyer grid has
 * nothing but an emoji placeholder without one, and the API rejects the write.
 */
export function productFormErrors(f: ProductFormValues): ProductFormField[] {
  const bad: ProductFormField[] = [];
  if (!f.name.trim()) bad.push('name');
  if (!f.categoryId) bad.push('categoryId');
  if (!f.price.trim() || !(Number(f.price) > 0)) bad.push('price');
  if (f.images.length === 0) bad.push('images');
  return bad;
}

export const productFormReady = (f: ProductFormValues) => productFormErrors(f).length === 0;

/* ── Gallery editor ──────────────────────────────────────────────── */

/**
 * Upload-on-pick image gallery. `upload` is injected because the routes are
 * role-scoped: products' is seller/admin-only, so a buyer attaching photos to a
 * requirement must pass `api.buyerBids.uploadImages` instead.
 */
export function GalleryEditor({
  images,
  onChange,
  onError,
  upload,
  assetUrl,
  max = MAX_IMAGES,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  onError: (msg: string) => void;
  upload: (files: File[]) => Promise<{ imageUrls: string[] }>;
  assetUrl: (path?: string | null) => string | undefined;
  max?: number;
}) {
  const { t } = useTranslation([...NS]);
  const [uploading, setUploading] = useState(false);
  const remaining = max - images.length;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same files
    if (!picked.length) return;
    if (picked.length > remaining) {
      onError(t('web:console.productForm.addMore', { count: remaining, max }));
      return;
    }
    onError('');
    setUploading(true);
    try {
      const { imageUrls } = await upload(picked);
      onChange([...images, ...imageUrls]);
    } catch (err) {
      onError(formErrMessage(err, t('web:console.productForm.uploadFailed')));
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
        {t('web:console.productForm.photos')} <span className="text-brand-mango">*</span>{' '}
        <span className="font-normal text-ink-soft">{t('web:console.productForm.coverHint', { count: images.length, max })}</span>
      </span>
      <p className="mb-2 text-xs text-ink-soft">{t('web:console.productForm.photoSizeHint')}</p>
      <div className="flex flex-wrap items-center gap-3">
        {images.map((src, i) => (
          <div key={src + i} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-surface-border bg-brand-surface">
            <img src={assetUrl(src)} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute start-1 top-1 rounded bg-brand-dark/85 px-1.5 py-0.5 text-[10px] font-bold text-white">{t('web:console.productForm.cover')}</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 opacity-0 transition group-hover:opacity-100">
              <button type="button" title={t('web:console.productForm.moveLeft')} disabled={i === 0} onClick={() => move(i, i - 1)} className="px-1.5 py-1 text-xs text-white disabled:opacity-30">←</button>
              {i !== 0 && (
                <button type="button" title={t('web:console.productForm.makeCover')} onClick={() => move(i, 0)} className="px-1.5 py-1 text-[10px] font-bold text-white">{t('web:console.productForm.cover')}</button>
              )}
              <button type="button" title={t('web:console.productForm.moveRight')} disabled={i === images.length - 1} onClick={() => move(i, i + 1)} className="px-1.5 py-1 text-xs text-white disabled:opacity-30">→</button>
            </div>
            <button
              type="button"
              title={t('web:console.productForm.remove')}
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
            <span className="text-[11px] font-semibold">{uploading ? t('web:console.productForm.uploading') : t('web:console.productForm.addPhoto')}</span>
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={onPick} />
          </label>
        )}
      </div>
    </div>
  );
}

/* ── Small shared controls ───────────────────────────────────────── */

const selectCls =
  'h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf';

/**
 * Country picker over the FULL ISO list — the curated trade-relevance head first,
 * then every other country. Free-text country fields never matched the directory
 * or catalog filters, which match on these exact names. Searchable, because a
 * native `<select>` only jumps to options starting with what you type.
 */
export function CountrySelect({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (name: string) => void;
  error?: string;
  /** Empty-state text, and the row that clears the choice. Filter bars want
   *  "Any country" where a listing form wants "Select…". */
  placeholder?: string;
}) {
  const { t, i18n } = useTranslation([...NS]);
  // The English name stays the stored VALUE — only the label is localized, and
  // both are searchable, since traders often know the English spelling.
  const options = useMemo(
    () => ALL_COUNTRIES.map((c) => ({ value: c.name, label: `${countryLabel(c.name, i18n.language)} ${c.flag}` })),
    [i18n.language],
  );
  return (
    <SearchSelect
      label={label}
      // Stored values are not always the bare name — most user rows hold the
      // legacy "🇮🇳 India" display form. Resolve before matching an option, or a
      // perfectly good country renders as an empty picker.
      value={findCountry(value)?.name ?? value}
      onChange={onChange}
      options={options}
      placeholder={placeholder ?? t('web:console.productForm.select')}
      searchPlaceholder={t('web:console.productForm.searchCountry')}
      emptyLabel={t('web:console.productForm.noCountry')}
      error={error}
    />
  );
}

/**
 * Who moves the goods: the seller delivers themselves, or the buyer arranges a
 * delivery partner. Replaces the "do you deliver?" / "can the buyer collect?"
 * pair — sellers only ever have these two answers, and the second question was
 * asking about collection when what the buyer actually needs to know is whether
 * they have to hire transport.
 */
function DeliverySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation([...NS]);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{t('web:console.productForm.delivery')}</span>
      <select
        value={value === 'delivery' ? 'delivery' : 'self_pickup'}
        onChange={(e) => onChange(e.target.value)}
        className={selectCls}
      >
        <option value="delivery">{t('enums:delivery.delivery')}</option>
        <option value="self_pickup">{t('enums:delivery.self_pickup')}</option>
      </select>
    </label>
  );
}

/* ── Market select, with inline "create a market" ────────────────── */

/** Read-only picker: only admins create markets, so there is nothing to add here. */
function MarketSelect({
  value,
  onChange,
  api,
}: {
  value: string;
  onChange: (id: string) => void;
  api: ProductFormApi;
}) {
  const { t } = useTranslation([...NS]);
  const { data: markets = [] } = useQuery<ApiMarket[]>({ queryKey: ['markets'], queryFn: () => api.markets.list() });

  // Thousands of markets: the list is only usable with a search box, and the
  // searchable text has to carry the city and country too, because that is how
  // a seller looks a market up ("Kandla", "Turkey").
  const options = useMemo(
    () =>
      markets.map((m) => ({
        value: m.id,
        label: `${m.name}${m.city ? ` · ${m.city}` : ''}${m.country ? ` · ${m.country}` : ''} ${m.flag ?? ''}`.trim(),
      })),
    [markets],
  );

  return (
    <SearchSelect
      label={t('web:console.productForm.market')}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={t('web:console.productForm.marketPlaceholder')}
      searchPlaceholder={t('web:console.productForm.searchMarket')}
    />
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
  const { t, i18n } = useTranslation([...NS]);
  const [query, setQuery] = useState('');
  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((c) => c !== name) : [...value, name]);

  const label = (name: string) => countryLabel(name, i18n.language);
  const q = query.trim().toLowerCase();
  // Searchable by either spelling — the reader sees the localized one but may
  // well type the English name they know from the rest of the trade.
  const shown = q
    ? ALL_COUNTRIES.filter(
        (c) => c.name.toLowerCase().includes(q) || label(c.name).toLowerCase().includes(q),
      )
    : ALL_COUNTRIES;

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {t('web:console.productForm.supplyCountries')}{' '}
        <span className="font-normal text-ink-soft">{t('web:console.productForm.supplyCountriesHint')}</span>
      </span>

      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((name) => {
            const c = ALL_COUNTRIES.find((x) => x.name === name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className="inline-flex items-center gap-1 rounded-pill bg-brand-leaf px-2.5 py-1 text-xs font-bold text-white hover:brightness-95"
              >
                {c?.flag} {label(name)} <span className="text-white/80">×</span>
              </button>
            );
          })}
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('web:console.productForm.searchCountry')}
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
              {c.flag} {label(c.name)}
            </button>
          );
        })}
        {shown.length === 0 && <span className="px-1 py-1 text-xs text-ink-soft">{t('web:console.productForm.noCountry')}</span>}
      </div>
    </div>
  );
}

/* ── Category/subcategory-specific attribute fields ──────────────── */

/**
 * Renders the dynamic detail fields for the chosen subcategory (grade codes,
 * sizes, processing, etc.). Values live under `attributes` keyed by each field's
 * `key`.
 *
 * `fields` arrives from the API already localized: `label` is translated, while
 * `options` stay canonical English because that is what gets STORED and what the
 * buyer facets match on. `optionLabel` bridges the two.
 */
function AttributeFields({
  fields,
  label,
  subcategory,
  value,
  onChange,
}: {
  fields: AttrField[];
  /** Localized subcategory label, for the section heading only. */
  label?: string | null;
  subcategory?: string | null;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation([...NS]);
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
        {t('web:console.productForm.attrSectionTitle', { name: label ?? subcategory })}{' '}
        <span className="font-normal text-ink-soft">{t('web:console.productForm.attrSectionHint')}</span>
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f: AttrField) => {
          const raw = value[f.key];
          const label = (
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              {f.label}
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
                  {(f.options ?? []).map((o) => <option key={o} value={o}>{optionLabel(f, o)}</option>)}
                </select>
              </label>
            );
          }
          if (f.type === 'boolean') {
            return (
              <label key={f.key} className="flex items-center justify-between gap-2 rounded-md border border-surface-border bg-white px-3 py-2.5 text-sm sm:mt-6">
                <span className="font-semibold text-ink">{f.label}</span>
                <input type="checkbox" checked={raw === true} onChange={(e) => setField(f.key, e.target.checked || undefined)} className="accent-[#249653]" />
              </label>
            );
          }
          // Percentages (moisture, oil content, admixture…) are a picker, not a
          // free number: 0.1–0.9 in tenths for trace values, then 1–100 whole.
          if (isPercentField(f)) {
            return (
              <label key={f.key} className="block">
                {label}
                <select value={(raw as string) ?? ''} onChange={(e) => setField(f.key, e.target.value)} className={selCls}>
                  <option value="">—</option>
                  {PERCENT_OPTIONS.map((o) => <option key={o} value={o}>{o}%</option>)}
                </select>
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
                        {optionLabel(f, o)}
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
 * One product form for every surface: the seller's Inventory add/edit modal,
 * the dedicated "Add Product" tab, and the admin panel's edit modal. Keeping a
 * single component is what stops them from drifting apart on market / gallery /
 * auction fields — and is why an admin can edit every part of a listing.
 */
export function ProductForm({
  value,
  onChange,
  error,
  onError,
  api,
  assetUrl,
  showErrors,
}: {
  value: ProductFormValues;
  onChange: (next: ProductFormValues) => void;
  error?: string;
  onError: (msg: string) => void;
  api: ProductFormApi;
  assetUrl: (path?: string | null) => string | undefined;
  /** Set once the seller has hit Save: turns every missing field red. */
  showErrors?: boolean;
}) {
  const { t } = useTranslation([...NS]);
  const missing = new Set(showErrors ? productFormErrors(value) : []);
  const required = t('web:console.productForm.required');
  // Tailwind emits border-surface-border after border-status-error, so appending
  // the red class would lose — the base class has to be swapped out, not added.
  const invalidCls = (bad: boolean) => (bad ? selectCls.replace('border-surface-border', 'border-status-error') : selectCls);
  const { data: categories = [] } = useQuery<ApiCategory[]>({ queryKey: ['categories'], queryFn: () => api.categories.list() });
  const set = <K extends keyof ProductFormValues>(k: K) => (v: ProductFormValues[K]) => onChange({ ...value, [k]: v });
  // City suggestions for wherever the goods sit, searched on the API per country
  // (the dataset is ~134k cities, so it never ships in the bundle).
  const { data: cities = [], isFetching: citiesLoading } = useQuery({
    queryKey: ['geo-cities', value.country, value.city],
    queryFn: () => api.geo.cities(value.country, value.city || undefined),
    enabled: Boolean(value.country),
    staleTime: 3600e3,
    retry: 1,
  });
  const selectedCategory = categories.find((c) => c.id === value.categoryId);
  // Memoised because `attrFields` derives from it and the prune effect below
  // keys on that — a fresh `[]` each render would re-run the effect forever.
  const subcategories = useMemo(() => selectedCategory?.subcategories ?? [], [selectedCategory]);
  const selectedSub = subcategories.find((s) => s.id === value.subcategoryId);
  // The auto-generated title should read in the seller's own language.
  const subcategoryLabel = selectedSub?.name ?? selectedCategory?.name ?? null;

  // Attribute fields come down on the tree, attached to whichever node OWNS
  // them; a node with none inherits, so resolve along the path rather than
  // reading the selected node directly.
  const subTree = useMemo(() => buildSubcategoryTree(subcategories), [subcategories]);
  const attrFields = useMemo(
    () => (value.subcategoryId ? resolveAttrFields(findSubcategoryPath(subTree, value.subcategoryId)) : []),
    [subTree, value.subcategoryId],
  );

  // Changing category invalidates any previously chosen subcategory.
  useEffect(() => {
    if (value.subcategoryId && !subcategories.some((s) => s.id === value.subcategoryId)) {
      onChange({ ...value, subcategoryId: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.categoryId, categories.length]);

  // Drop attribute values that don't belong to the current subcategory's fields.
  // The API sanitizes on save too — this is so the seller SEES what is dropped.
  useEffect(() => {
    const keys = new Set(attrFields.map((f) => f.key));
    const pruned = Object.fromEntries(Object.entries(value.attributes ?? {}).filter(([k]) => keys.has(k)));
    if (Object.keys(pruned).length !== Object.keys(value.attributes ?? {}).length) {
      onChange({ ...value, attributes: pruned });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrFields]);

  // The title is composed from the taxonomy leaf + the attributes the seller
  // picked ("Almond Nonpareil Roasted 20/22"), and keeps tracking their choices
  // until they type in the field themselves. Seeded from `value.name` so Edit
  // mode — which opens with a name the seller already chose — never overwrites.
  const [nameTouched, setNameTouched] = useState(() => !!value.name.trim());
  const suggestion = suggestProductName(subcategoryLabel, value.attributes);
  useEffect(() => {
    if (nameTouched || !suggestion || suggestion === value.name) return;
    onChange({ ...value, name: suggestion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion, nameTouched]);

  return (
    <div className="space-y-4">
      <div>
        <GalleryEditor images={value.images} onChange={set('images')} onError={onError} upload={api.products.uploadImages} assetUrl={assetUrl} />
        {missing.has('images') && <p className="mt-1 text-xs font-semibold text-status-error">{required}</p>}
      </div>

      <Input
        label={t('web:console.productForm.productName')}
        placeholder={t('web:console.productForm.phName')}
        value={value.name}
        onChange={(e) => { setNameTouched(true); set('name')(e.target.value); }}
        error={missing.has('name') ? required : undefined}
        hint={suggestion && suggestion !== value.name ? t('web:console.productForm.nameAuto', { name: suggestion }) : undefined}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('web:console.productForm.category')}</span>
          <select
            value={value.categoryId}
            onChange={(e) => onChange({ ...value, categoryId: e.target.value, subcategoryId: '' })}
            className={invalidCls(missing.has('categoryId'))}
          >
            <option value="">{t('web:console.productForm.select')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name} {c.emoji}</option>)}
          </select>
          {missing.has('categoryId') && <span className="mt-1 block text-xs text-status-error">{required}</span>}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('web:console.productForm.subcategory')}</span>
          <select
            value={value.subcategoryId}
            onChange={(e) => set('subcategoryId')(e.target.value)}
            disabled={subcategories.length === 0}
            className="h-11 w-full rounded-md border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-leaf disabled:cursor-not-allowed disabled:bg-brand-surface/40 disabled:text-ink-soft"
          >
            <option value="">{subcategories.length === 0 ? t('web:console.productForm.none') : t('web:console.productForm.optional')}</option>
            {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}{s.emoji ? ` ${s.emoji}` : ''}</option>)}
          </select>
        </label>
      </div>

      <AttributeFields
        fields={attrFields}
        label={subcategoryLabel}
        value={value.attributes}
        onChange={set('attributes')}
      />

      <MarketSelect value={value.marketId} onChange={set('marketId')} api={api} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Price is quoted in the seller's OWN currency; the API converts to a
            USD baseline so buyers still see it in whatever they picked. */}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('web:console.productForm.price')}</span>
          <div className="flex gap-2">
            <select
              value={value.priceCurrency}
              onChange={(e) => set('priceCurrency')(e.target.value)}
              aria-label={t('web:console.productForm.currency')}
              // w-full must be swapped out, not overridden — Tailwind emits w-full
              // after w-28, so appending w-28 loses and the select eats the row.
              className={selectCls.replace('w-full', 'w-28') + ' shrink-0'}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step="any"
              placeholder="840"
              value={value.price}
              onChange={(e) => set('price')(e.target.value)}
              className={invalidCls(missing.has('price')) + ' min-w-0'}
            />
          </div>
          {missing.has('price') && <span className="mt-1 block text-xs text-status-error">{required}</span>}
          {/* Sits with the price because that is the number it qualifies — the
              buyer reads "VAT extra" directly under it on the listing. */}
          <label className="mt-2 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={value.vatExtra} onChange={(e) => set('vatExtra')(e.target.checked)} className="accent-[#249653]" />
            {t('web:console.productForm.vatExtra')}
          </label>
        </label>
        {/* One metric drives quantity, MOQ and stock — sellers were typing
            "500 MT" / "500mt" / "500 tons" into free-text boxes. */}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('web:console.productForm.unit')}</span>
          <select value={toUnit(value.unit)} onChange={(e) => set('unit')(e.target.value)} className={selectCls}>
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>{t(`enums:unit.${u}`)}</option>
            ))}
          </select>
        </label>
        <Input
          label={`${t('web:console.productForm.quantity')} (${toUnit(value.unit)})`}
          type="number"
          min={0}
          step="any"
          placeholder="500"
          value={value.qty}
          onChange={(e) => set('qty')(e.target.value)}
        />
        <Input
          label={`${t('web:console.productForm.moq')} (${toUnit(value.unit)})`}
          type="number"
          min={0}
          step="any"
          placeholder="25"
          value={value.moq}
          onChange={(e) => set('moq')(e.target.value)}
        />
        {/* FLOW-04: managed stock. Blank = unlimited; a number caps orders and is
            enforced by the reservation machinery at checkout. */}
        <Input
          label={`${t('web:console.productForm.stock')} (${toUnit(value.unit)})`}
          type="number"
          min={0}
          placeholder={t('web:console.productForm.phStock')}
          value={value.stock}
          onChange={(e) => set('stock')(e.target.value)}
        />
        {/* Origin is a country, and it is what the listing flag is derived from. */}
        <CountrySelect
          label={t('web:console.productForm.origin')}
          value={value.origin}
          onChange={(origin) => onChange({ ...value, origin, flag: countryFlag(origin) || value.flag })}
        />
        <DeliverySelect value={value.delivery} onChange={set('delivery')} />
      </div>

      {/* Location: where the goods physically sit */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Country first — the city options are fetched per-country, and a city
            only means something inside its country, so it resets with it. */}
        <CountrySelect
          label={t('web:console.productForm.country')}
          value={value.country}
          onChange={(country) => onChange({ ...value, country, city: '' })}
        />
        <Combobox
          label={t('web:console.productForm.city')}
          placeholder={t('web:console.productForm.phCity')}
          value={value.city}
          onChange={set('city')}
          options={cities}
          loading={citiesLoading}
          // The API already filtered by the typed term.
          filterLocally={false}
        />
      </div>

      <SupplyCountriesSelect value={value.supplyCountries} onChange={set('supplyCountries')} />

      {/* Free-text remarks — packing, loading terms, anything the structured
          fields have no box for. Shown verbatim on the listing. */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          {t('web:console.productForm.notes')}{' '}
          <span className="font-normal text-ink-soft">{t('web:console.productForm.notesHint')}</span>
        </span>
        <textarea
          rows={3}
          maxLength={2000}
          value={value.notes}
          onChange={(e) => set('notes')(e.target.value)}
          placeholder={t('web:console.productForm.phNotes')}
          className="w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-leaf"
        />
      </label>

      {/* How the deal is settled and priced. Both are explicit two-way choices —
          "direct deal" and "fixed price" are as visible as their opposites, so a
          buyer is never left guessing which one a listing means. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('web:console.productForm.dealType')}</span>
          <select value={value.safeDeal ? 'safe' : 'direct'} onChange={(e) => set('safeDeal')(e.target.value === 'safe')} className={selectCls}>
            <option value="safe">{t('web:console.productForm.dealSafe')}</option>
            <option value="direct">{t('web:console.productForm.dealDirect')}</option>
          </select>
          <p className="mt-1 text-xs text-ink-soft">
            {value.safeDeal ? t('web:console.productForm.dealSafeHint') : t('web:console.productForm.dealDirectHint')}
          </p>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t('web:console.productForm.priceType')}</span>
          <select value={value.negotiable ? 'negotiable' : 'fixed'} onChange={(e) => set('negotiable')(e.target.value === 'negotiable')} className={selectCls}>
            <option value="fixed">{t('web:console.productForm.priceFixed')}</option>
            <option value="negotiable">{t('web:console.productForm.priceNegotiable')}</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4 pt-1">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={value.isOffer} onChange={(e) => set('isOffer')(e.target.checked)} className="accent-[#249653]" />
          {t('web:console.productForm.markOffer')}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={value.isAuction} onChange={(e) => set('isAuction')(e.target.checked)} className="accent-[#249653]" />
          {t('web:console.productForm.listAuction')}
        </label>
      </div>

      {value.isAuction && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-surface-border bg-brand-surface/40 p-3 sm:grid-cols-2">
          <Input label={`${t('web:console.seller.startingBid')} (${value.priceCurrency || 'USD'})`} type="number" placeholder="800" value={value.startBid} onChange={(e) => set('startBid')(e.target.value)} />
          <Input label={t('web:console.seller.auctionCloses')} type="datetime-local" value={value.auctionEndsAt} onChange={(e) => set('auctionEndsAt')(e.target.value)} />
        </div>
      )}

      {missing.size > 0 && <p className="text-sm font-semibold text-status-error">{t('web:console.productForm.fixFields')}</p>}
      {error && <p className="text-sm font-semibold text-status-error">{error}</p>}
    </div>
  );
}
