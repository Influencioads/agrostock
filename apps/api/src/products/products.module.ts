import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { uploadLimits } from '../uploads/upload-limits';
import { ApiBearerAuth, ApiConsumes, ApiTags, PartialType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CURRENCIES, CURRENCY_SYMBOLS, PRODUCT_UNITS, filterFields, parseQtyIn, splitFilterValues, stockQtyText, toUnit, type AttrField } from '@agrotraders/types';
import { requireSafeDeal, resolveListingSafeDeal } from './safe-deal';
import { commonWord } from '@agrotraders/i18n/notifications';
import { FxModule, FxService } from '../fx/fx.module';
import { EntitlementsService } from '../billing/entitlements.service';
import { CatalogModule, CategoriesService, MAX_TAXONOMY_DEPTH } from '../catalog/catalog.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, OptionalJwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { PRODUCT_UPSERTED, type ContentUpsertedEvent } from '../translation/translation.events';
import { Locale, localize } from '../common/locale';
import { TextTranslationService } from '../translation/text-translation.service';
import { browsableWhere } from './sellable';
import { MAX_QTY } from '../common/limits';
import type { Lang } from '@agrotraders/i18n';

/** Translatable Product columns folded from a ProductTranslation row. */
// `qty` is NOT translatable: it is a derived "<number> <unit-code>" string
// mirroring `stockQty`, so a per-locale copy of it is a second quantity that
// can drift from the canonical one — and machine-translating it only ever
// produced "500 МТ". The migration clears the rows this used to write.
const PRODUCT_TR_FIELDS = ['name', 'grade', 'origin', 'moq', 'delivery'] as const;

interface ProductTranslationRow {
  name: string;
  grade: string | null;
  origin: string | null;
  qty: string | null;
  moq: string | null;
  delivery: string | null;
  attributes: Prisma.JsonValue | null;
}

/** A joined category/subcategory carrying just its locale label. */
type TaxonRel = { name: string; translations?: { name: string }[] } | null | undefined;

/**
 * Include clause for the category/subcategory a product hangs off, joined with
 * their locale label. Without this the breadcrumb ("Nuts › Almond") stayed
 * English on every surface, translated product name and all.
 */
export function productTaxonInclude(locale: Lang) {
  const label = { include: { translations: { where: { locale }, select: { name: true } } } };
  return { category: label, subcategory: label } as const;
}

/** Fold a joined taxon's translation over its name. Undefined relations pass through. */
function localizeTaxon<T extends TaxonRel>(rel: T): T {
  if (!rel) return rel;
  return localize(rel, ['name']) as T;
}

/**
 * Fold a product's single locale-matched translation over its base fields, and
 * merge translated attribute values on top of the base attributes JSON. English
 * (no translation row) passes through unchanged.
 */
export function localizeProduct<
  T extends {
    name: string;
    grade: string | null;
    origin: string | null;
    qty: string | null;
    moq: string | null;
    delivery: string | null;
    attributes: Prisma.JsonValue | null;
    translations?: ProductTranslationRow[];
    category?: TaxonRel;
    subcategory?: TaxonRel;
    market?: { name: string; city?: string | null; translations?: { name?: string; city?: string | null }[] } | null;
  },
>(row: T): T {
  const tr = row.translations?.[0];
  const localized = localize(row, [...PRODUCT_TR_FIELDS]);
  if (tr?.attributes && localized.attributes && typeof localized.attributes === 'object') {
    (localized as { attributes: Prisma.JsonValue }).attributes = {
      ...(localized.attributes as Record<string, unknown>),
      ...(tr.attributes as Record<string, unknown>),
    } as Prisma.JsonValue;
  }
  if (localized.category) localized.category = localizeTaxon(localized.category);
  if (localized.subcategory) localized.subcategory = localizeTaxon(localized.subcategory);
  // The market carries its own translation row and /api/markets already folds
  // it; every product endpoint selected the market WITHOUT one, so a Russian
  // card read "Ваши APMC" in the picker and "Vashi APMC" on the listing.
  // `city` travels with `name` for the reason the markets module gives: half a
  // translated place name reads worse than either language alone.
  if (localized.market) {
    localized.market = localize(localized.market, ['name', 'city']) as typeof localized.market;
  }
  return localized;
}

/** The canonical English values an edit form must write back, never the display text. */
const PRODUCT_SOURCE_FIELDS = [...PRODUCT_TR_FIELDS, 'attributes'] as const;

/**
 * Attach the untranslated originals under `source` so the seller/admin edit form
 * round-trips English.
 *
 * `productToForm` → `formToPayload` writes these columns straight back, so a
 * localized `name` reaching the form means the next Save overwrites the canonical
 * row with Russian — and the translate-on-write source hash then hashes Russian,
 * poisoning every future translation of that listing. Display gets the localized
 * row; the form reads `source`.
 */
function withSource<T extends Record<string, unknown>>(row: T, localized: T): T {
  const source: Record<string, unknown> = {};
  for (const field of PRODUCT_SOURCE_FIELDS) source[field] = row[field];
  return { ...localized, source } as T;
}

/** One rendered attribute row: what the spec table and the card chips display. */
export interface AttributeSpec {
  key: string;
  label: string;
  value: string;
}

/**
 * Render a listing's attribute values into display rows.
 *
 * This lives on the server because the field definitions do: the product card,
 * the product page and the mobile detail screen have no category tree loaded,
 * and shipping them one would mean shipping the whole schema again. They each
 * used to re-implement this formatting against the bundled schema — three copies
 * that drifted.
 *
 * Empty values are skipped, but `false` is NOT empty: a seller who answered "no"
 * said something. Callers that only want positive facts (the card chips) filter
 * on the raw value they already hold.
 */
export function buildAttributeSpecs(
  attributes: Prisma.JsonValue | null | undefined,
  fields: AttrField[],
  locale: Lang,
): AttributeSpec[] {
  const vals = (attributes ?? {}) as Record<string, unknown>;
  const specs: AttributeSpec[] = [];
  for (const f of fields) {
    const v = vals[f.key];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    // Options are stored in English; `optionLabels` carries the display text.
    const opt = (s: string) => {
      const i = f.options?.indexOf(s) ?? -1;
      return i >= 0 ? (f.optionLabels?.[i] ?? s) : s;
    };
    const value = Array.isArray(v)
      ? v.map((x) => opt(String(x))).join(', ')
      : f.type === 'boolean'
        ? commonWord(locale, v ? 'yes' : 'no')
        : f.type === 'select'
          ? opt(String(v))
          : f.unit
            ? `${String(v)}${f.unit === '%' ? '' : ' '}${f.unit}`
            : String(v);
    specs.push({ key: f.key, label: f.label, value });
  }
  return specs;
}

/** A product row plus the rendered spec rows for its subcategory's fields. */
export function localizeProductWithSpecs<
  T extends Parameters<typeof localizeProduct>[0] & { subcategoryId: string | null },
>(row: T, fields: Map<string, AttrField[]>, locale: Lang) {
  const p = localizeProduct(row);
  const defs = row.subcategoryId ? fields.get(row.subcategoryId) : undefined;
  if (!defs?.length) return p;
  const attributeSpecs = buildAttributeSpecs(p.attributes, defs, locale);
  return attributeSpecs.length ? { ...p, attributeSpecs } : p;
}

/**
 * Drop anything from a seller's `attributes` payload that the subcategory's
 * field list does not define, and any choice that is not one of the field's
 * options.
 *
 * Sanitize, never reject: an admin can retire a field or an option at any time,
 * and a listing created under the old set must stay editable rather than 400 on
 * every save. `required` is only ever *suggested*-required, so it is not
 * enforced here either. Free text/number/date pass through as the seller typed
 * them — those have no closed value set to check against.
 */
export function sanitizeAttributes(input: Record<string, unknown>, fields: AttrField[]): Record<string, unknown> {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(input)) {
    const f = byKey.get(key);
    if (!f) continue;
    if (f.type === 'boolean') {
      if (typeof v === 'boolean') out[key] = v;
    } else if (f.type === 'select') {
      if (typeof v === 'string' && f.options?.includes(v)) out[key] = v;
    } else if (f.type === 'multiselect') {
      const picked = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!f.options?.includes(x)) : [];
      if (picked.length) out[key] = picked;
    } else if (v !== null && v !== '') {
      out[key] = v;
    }
  }
  return out;
}

/**
 * Free-text columns the browse filters match by (case-insensitive) EQUALITY,
 * so they are stored trimmed: " Premium" was counted under Premium by its facet
 * yet never matched when that box was ticked.
 */
const FILTER_TEXT = ['grade', 'city', 'country'] as const;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);

/**
 * Split a browse facet into its selected values.
 *
 * Every multi-select facet travels as one comma-separated param
 * (`?country=India,Turkey`) rather than a repeated key, so a URL stays readable
 * and `Record<string, string>` query parsing keeps working. A single value is
 * just a list of one, which is what makes every pre-existing deep link
 * (`/market?market=kandla`) still mean exactly what it meant before.
 *
 * Splits with `splitFilterValues` — commas inside parentheses belong to the
 * value ("Mature (brown, husked)") — and accepts a repeated key's array too.
 */
function csv(v?: string | string[]): string[] {
  return [...new Set([v ?? []].flat().flatMap(splitFilterValues))];
}

/** A browse query exactly as Nest parsed it — a repeated key arrives as an array. */
type RawQuery = Record<string, unknown>;
/** One string per param: what every predicate in this file reads. */
type BrowseQuery = Record<string, string | undefined>;

/** Params that take several comma-separated values (besides every `attr_<key>`). */
const MULTI_PARAMS = new Set(['categoryId', 'category', 'market', 'city', 'country', 'supplyCountry', 'grade']);

/**
 * Fold the raw query into one string per param. `?grade=A&grade=B` reaches us
 * as an array (and `?search[x]=1` as an object) — the old `.split` on either
 * was a 500. A multi-value param keeps every value; a single-valued one
 * (`search`, `sort`, `subcategoryId`…) keeps its first; anything else is dropped.
 */
function normalizeQuery(raw: RawQuery): BrowseQuery {
  const out: BrowseQuery = {};
  for (const [key, v] of Object.entries(raw)) {
    const values = (Array.isArray(v) ? v : [v]).filter((s): s is string => typeof s === 'string');
    if (!values.length) continue;
    out[key] = key.startsWith('attr_') || MULTI_PARAMS.has(key) ? values.join(',') : values[0];
  }
  return out;
}

/** Every param `buildWhere` reads. Anything else in a query narrows nothing. */
const FILTER_PARAMS = [
  ...MULTI_PARAMS, 'subcategoryId', 'subcategory', 'search', 'minPrice', 'maxPrice',
  'verified', 'safe', 'negotiable', 'offer', 'auction',
];
const filtersIn = (q: BrowseQuery) => Object.keys(q).filter((k) => q[k] && (k.startsWith('attr_') || FILTER_PARAMS.includes(k)));

// Each word costs a 12-way OR with EXISTS joins, and facets() rebuilds it a dozen
// times: a pasted paragraph blew Postgres's 32767 bind-param cap (500) on a public
// route. Eight distinct words is more than anyone types into a product search.
const searchTokens = (search?: string) =>
  [...new Set((search ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean))].slice(0, 8);

/**
 * Prisma compiles an insensitive `equals` to a bare `ILIKE $1`, so `%` and `_`
 * in a picked value were wildcards: ticking "5% broken" also matched "50%
 * broken", and `grade=%` matched everything. Backslash is ILIKE's default escape.
 */
const likeLiteral = (v: string) => v.replace(/[\\%_]/g, '\\$&');

/** priceCents is INT4 — a larger bound made Prisma throw and the request 500. */
const INT4_MAX = 2147483647;
const clampCents = (n: number) => Math.min(INT4_MAX, Math.max(0, Math.round(n)));

/**
 * Where one search word may land. Every word has to land somewhere (AND), so
 * "rice basmati" finds "Premium Basmati Rice 1121" in either word order, and a
 * word may name the taxonomy or the grade, not just the title — a listing in
 * the Rice subcategory is rice even when its seller never wrote the word.
 *
 * Names match the English base row AND every translation of it: a Russian buyer
 * typing "пшеница" has to hit the ProductTranslation copy, and someone browsing
 * in English may still type Russian, so it is not constrained to the locale.
 * The place is in here too — buyers type "Mumbai" or "Turkey" in the same box.
 */
function searchTokenWhere(token: string): Prisma.ProductWhereInput {
  const c = { contains: token, mode: 'insensitive' } as const;
  const named = { OR: [{ name: c }, { translations: { some: { name: c } } }] };
  return {
    OR: [
      ...named.OR,
      { city: c },
      { country: c },
      { grade: c },
      { market: { is: { OR: [{ city: c }, { country: c }, { name: c }] } } },
      { category: { is: named } },
      { subcategory: { is: named } },
    ],
  };
}

/**
 * The option values one stored attribute answers to — the in-memory twin of
 * buildWhere's `attr_*` predicate, and it must stay exactly that, or a facet
 * promises listings the grid never returns. Prisma's `array_contains` also
 * checks `jsonb_typeof = 'array'`, so a multiselect matches ONLY an array
 * holding the string; every other type is JSON equality, so a boolean field
 * answers only to a real boolean and a select only to a string.
 */
function attrValuesHeld(field: AttrField | undefined, raw: unknown): string[] {
  if (field?.type === 'multiselect') return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
  if (field?.type === 'boolean') return typeof raw === 'boolean' ? [String(raw)] : [];
  return typeof raw === 'string' ? [raw] : [];
}

/** The JSON value an `attr_<key>` pick is compared with: a boolean field stores `true`/`false`. */
function attrPickValue(field: AttrField | undefined, pick: string): string | boolean {
  return field?.type === 'boolean' ? pick === 'true' : pick;
}

/**
 * Tally free-text values the way their filter matches them: trimmed and
 * case-insensitive, a row counted once per distinct value it answers to. The
 * commonest spelling becomes the option, which is also what the box sends back.
 */
function textFacet(rows: { values: (string | null | undefined)[]; n: number }[]): FacetOption[] {
  const byKey = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const { values, n } of rows) {
    const counted = new Set<string>();
    for (const raw of values) {
      const text = raw?.trim();
      if (!text) continue;
      const key = text.toLowerCase();
      const entry = byKey.get(key) ?? { count: 0, spellings: new Map<string, number>() };
      if (!counted.has(key)) {
        entry.count += n;
        counted.add(key);
      }
      entry.spellings.set(text, (entry.spellings.get(text) ?? 0) + n);
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()].map(({ count, spellings }) => {
    const label = [...spellings].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    return { value: label, label, count };
  });
}

/** What a browse card needs joined on — the grid and `similar` render the same card. */
function browseInclude(locale: Lang) {
  return {
    ...productTaxonInclude(locale),
    seller: { select: { id: true, name: true } },
    market: {
      select: {
        id: true, slug: true, name: true, city: true, country: true, flag: true,
        translations: { where: { locale }, select: { name: true, city: true } },
      },
    },
    translations: { where: { locale } },
  } as const;
}

/** Per-request inputs every predicate of one browse request shares. */
interface BrowseCtx {
  locale: Lang;
  /** Sellers hidden from this viewer (a block in either direction). */
  blocked: string[];
  /**
   * Attribute fields of the ORIGINAL query's node. A facet pass that lifts
   * `subcategoryId` out must still compare a multiselect with array_contains and
   * a boolean as a boolean, or its attr_* conditions silently match nothing.
   */
  fields: AttrField[];
  /** The similar ladder's loosest search: any word may match, not every word. */
  anyToken?: boolean;
}

/** One rung of the similar-products ladder (mirrors the api-client's `ProductRelaxStep`). */
type RelaxStep = 'attributes' | 'grade' | 'price' | 'place' | 'flags' | 'taxonomy' | 'search' | 'all';

/** How many `similar` listings an empty result is padded with. */
const SIMILAR_LIMIT = 12;

/** How long the in-memory taxonomy links are trusted (see `taxonTree`). */
const TAXON_TREE_TTL_MS = 60_000;

/**
 * `['a']` → `'a'`, `['a','b']` → `{ in: [...] }`.
 *
 * The scalar form for the common single-value case is deliberate: `categoryId`
 * is covered by `@@index([status, categoryId])`, and an `in` of one would ask
 * the planner to re-derive what an equality already states.
 */
function eqOrIn(values: string[]): string | { in: string[] } {
  return values.length === 1 ? values[0] : { in: values };
}

/** One tickable box: `value` is what the URL carries, `label` what a human reads. */
export interface FacetOption {
  value: string;
  label: string;
  emoji?: string;
  hint?: string;
  /** Listings this option would match, with every other filter still applied. */
  count: number;
}

/** How many listings sit on each side of the on/off filter groups. */
export interface FacetFlagCounts {
  safe: number;
  direct: number;
  negotiable: number;
  fixed: number;
  offer: number;
  auction: number;
  verified: number;
}

/** Every option the browse panel can offer, derived from the live catalog. */
export interface ProductFacets {
  /** Listings matching the WHOLE query — the "Show N results" number. */
  total: number;
  categories: FacetOption[];
  /** Branch-inclusive: a node counts every listing beneath it, as selecting it returns. */
  subcategories: (FacetOption & { parentId: string | null })[];
  markets: FacetOption[];
  countries: FacetOption[];
  cities: FacetOption[];
  grades: FacetOption[];
  supplyCountries: FacetOption[];
  attributes: { key: string; label: string; type: string; options: FacetOption[] }[];
  flags: FacetFlagCounts;
  priceRange: { minCents: number | null; maxCents: number | null };
}

/** `?attr_<key>=v1,v2` → `{ key: ['v1','v2'] }`. */
function attrSelectionsOf(q: BrowseQuery): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(q)) {
    if (!key.startsWith('attr_') || !value) continue;
    const picked = csv(value);
    if (picked.length) out[key.slice(5)] = picked;
  }
  return out;
}

/** A copy of the query without the given params. */
function stripKeys(q: BrowseQuery, keys: string[]): BrowseQuery {
  const out = { ...q };
  for (const key of keys) delete out[key];
  return out;
}

/** Does this listing ship to any of the requested countries? (`hasSome`, like the filter.) */
function rowMatchesSupply(stored: string[], wanted: Set<string>): boolean {
  return stored.some((c) => wanted.has(c));
}

/**
 * Does a listing satisfy every attribute selection, bar `exceptKey`? Counting a
 * field without its own picks is what keeps its sibling options addable — they
 * OR together, so ticking one more widens the result.
 */
function attrRowMatches(
  values: Record<string, unknown>,
  selections: Record<string, string[]>,
  fields: AttrField[],
  exceptKey?: string,
): boolean {
  for (const [key, picks] of Object.entries(selections)) {
    if (key === exceptKey) continue;
    const field = fields.find((f) => f.key === key);
    const held = attrValuesHeld(field, values[key]);
    if (!picks.some((p) => held.includes(String(attrPickValue(field, p))))) return false;
  }
  return true;
}

/** Display text for one option value, honouring the field's locale overlay. */
function optionLabelOf(field: AttrField, value: string): string {
  const i = field.options?.indexOf(value) ?? -1;
  return i >= 0 ? (field.optionLabels?.[i] ?? value) : value;
}

/** Max images per product gallery. Enforced by the DTO and the upload interceptor. */
export const MAX_PRODUCT_IMAGES = 6;

/** Every catalog photo is stored as an exact square at this edge length. */
export const PRODUCT_IMAGE_PX = 1080;

/** Bare amount out of whatever the seller typed ("₹ 70,000" → 70000). */
const parseAmount = (price: string): number => {
  const n = parseFloat(price.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

/** Display string in the seller's own currency — "₹70,000", "$840". */
const displayPrice = (amount: number, currency: string): string =>
  `${CURRENCY_SYMBOLS[currency] ?? `${currency} `}${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export class CreateProductDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() categoryId!: string;
  @IsOptional() @IsString() subcategoryId?: string;
  @IsString() price!: string;
  /** Currency the seller quoted `price` in. `priceCents` is derived in USD. */
  @IsOptional() @IsIn(CURRENCIES as unknown as string[]) priceCurrency?: string;
  @IsOptional() @IsIn(PRODUCT_UNITS as unknown as string[]) unit?: string;
  /** The listed price is net of VAT; buyers see "VAT extra" beside it. */
  @IsOptional() @IsBoolean() vatExtra?: boolean;
  /** Seller delivers, but the delivery fee is billed on top of the price. */
  @IsOptional() @IsBoolean() deliveryFeeExtra?: boolean;
  /** Seller's own remarks on the listing (packing, loading terms, …). */
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() grade?: string;
  /**
   * Legacy display quantity ("500 MT"). DERIVED from `stockQty` server-side and
   * never trusted from the client: it used to be an independently-authored
   * figure, which is how a listing ended up advertising one number as "stock"
   * and a different one as "available". Kept on the model (and accepted here)
   * only so older clients and the translation pipeline keep working.
   */
  @IsOptional() @IsString() qty?: string;
  @IsOptional() @IsString() moq?: string;
  @IsOptional() @IsString() flag?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() imageUrl?: string;
  /** At least one photo — a listing with no picture does not sell and the
   *  buyer grid has nothing to render but an emoji placeholder. */
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(MAX_PRODUCT_IMAGES) @IsString({ each: true }) images!: string[];
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  /** Countries the seller can supply to (multi-select). */
  @IsOptional() @IsArray() @IsString({ each: true }) supplyCountries?: string[];
  @IsOptional() @IsString() delivery?: string;
  /** Category/subcategory-specific attribute values, keyed by field key. */
  @IsOptional() @IsObject() attributes?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isOffer?: boolean;
  @IsOptional() @IsBoolean() isAuction?: boolean;
  /** Escrow-protected sale vs. a direct deal between the two parties. */
  @IsOptional() @IsBoolean() safeDeal?: boolean;
  /** Seller will entertain offers on the listed price. */
  @IsOptional() @IsBoolean() negotiable?: boolean;
  @IsOptional() @IsString() marketId?: string;
  /**
   * FLOW-04: optional managed inventory. `null`/omitted = unmanaged (unlimited,
   * legacy behaviour); a number is the on-hand whole-unit count the F10
   * reservation machinery enforces. This is the write surface that was missing —
   * the reservation logic existed but nothing could set the stock it guarded.
   */
  @IsOptional() @IsInt() @Min(0) @Max(MAX_QTY) stockQty?: number;
  // Auction settings (used when isAuction=true)
  @IsOptional() @IsInt() @Min(0) startBidCents?: number;
  @IsOptional() @IsDateString() auctionEndsAt?: string;
}

/**
 * A real class, not `Partial<CreateProductDto>`: a mapped type is erased at
 * runtime, so Nest would hand ValidationPipe a bare `Object` and every rule
 * (including the images cap and `whitelist`) would be silently skipped.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
    private fx: FxService,
    private categories: CategoriesService,
    private entitlements: EntitlementsService,
    private text: TextTranslationService,
  ) {}

  /**
   * `Product.city` is free text picked from the geo dataset, which ships English
   * names only — so a Russian card read "Karnal, Индия", half translated. There
   * is no per-product translation row for it, which is exactly the case the
   * generic translate-on-read cache exists for; identical city strings share one
   * cached row across every content type, so this costs one lookup, not a call
   * per listing.
   */
  private localizeCities<T extends { city?: string | null }>(rows: T[], locale: Lang): Promise<T[]> {
    return this.text.localizeRows(rows as unknown as Record<string, unknown>[], ['city'], locale) as unknown as Promise<T[]>;
  }

  /**
   * A seller quotes in their own currency; every comparison downstream (price
   * sort, min/max filters, the buyer's display currency) runs on ONE baseline,
   * so convert to USD cents here and keep the seller's own string for display.
   */
  private async pricePatch(rawPrice: string, currency?: string) {
    const priceCurrency = currency && (CURRENCIES as readonly string[]).includes(currency) ? currency : 'USD';
    const amount = parseAmount(rawPrice);
    if (!Number.isFinite(amount)) {
      // Unparseable ("POA", a range) — keep the seller's text, no baseline.
      return { price: rawPrice, priceCents: null, priceCurrency };
    }
    return {
      price: displayPrice(amount, priceCurrency),
      priceCents: await this.fx.toUsdCents(amount, priceCurrency),
      priceCurrency,
    };
  }

  /**
   * The taxonomy's parent/child links, loaded once and shared for a minute.
   *
   * Every branch-inclusive filter needs a node's descendants, and one facets
   * request builds a dozen predicates — each used to re-read up to all 14k
   * nodes. The PROMISE is cached, so the concurrent predicates of one request
   * share a single load.
   * ponytail: a taxonomy edit reaches browse up to a minute late; wire an
   * invalidate from CategoriesService if admins ever need it instant.
   */
  private treeCache?: { at: number; tree: Promise<{ parent: Map<string, string | null>; children: Map<string, string[]> }> };
  private taxonTree() {
    if (this.treeCache && Date.now() - this.treeCache.at < TAXON_TREE_TTL_MS) return this.treeCache.tree;
    const tree = this.prisma.subcategory.findMany({ select: { id: true, parentId: true } }).then((rows) => {
      const parent = new Map<string, string | null>();
      const children = new Map<string, string[]>();
      for (const { id, parentId } of rows) {
        parent.set(id, parentId);
        if (!parentId) continue;
        const siblings = children.get(parentId);
        if (siblings) siblings.push(id);
        else children.set(parentId, [id]);
      }
      return { parent, children };
    });
    this.treeCache = { at: Date.now(), tree };
    // A failed load must not poison the cache for the whole window.
    tree.catch(() => {
      if (this.treeCache?.tree === tree) this.treeCache = undefined;
    });
    return tree;
  }

  /** The node and every descendant — what selecting it has to return. */
  private async subcategoryBranchIds(subcategoryId: string) {
    const { children } = await this.taxonTree();
    const picked = new Set([subcategoryId]);
    // A Set visits what is added while iterating it, so this walks the whole branch.
    for (const id of picked) for (const child of children.get(id) ?? []) picked.add(child);
    return [...picked];
  }

  /** The node's ancestors, nearest first. Bounded by the depth cap. */
  private async ancestorIds(subcategoryId: string) {
    const { parent } = await this.taxonTree();
    const out: string[] = [];
    for (let id = parent.get(subcategoryId); id && out.length < MAX_TAXONOMY_DEPTH; id = parent.get(id)) out.push(id);
    return out;
  }

  /**
   * Resolve a subcategory from either an id or a name scoped to the chosen
   * category. The drill-down stays single-select even though `categoryId` is
   * now multi — a name lookup is therefore scoped to whichever of the selected
   * categories owns a node by that name.
   */
  private async findSubcategory(q: BrowseQuery) {
    if (q.subcategoryId) {
      return this.prisma.subcategory.findUnique({
        where: { id: q.subcategoryId },
        select: { id: true, name: true, parentId: true, categoryId: true },
      });
    }
    if (!q.subcategory) return null;
    const categoryIds = csv(q.categoryId);
    const categoryNames = csv(q.category);
    return this.prisma.subcategory.findFirst({
      where: {
        name: q.subcategory,
        ...(categoryIds.length ? { categoryId: eqOrIn(categoryIds) } : {}),
        ...(!categoryIds.length && categoryNames.length ? { category: { name: eqOrIn(categoryNames) } } : {}),
      },
      select: { id: true, name: true, parentId: true, categoryId: true },
    });
  }

  /**
   * The attribute fields in force for whichever subcategory the query selected,
   * inheritance already applied. Empty when the query names no subcategory.
   */
  private async fieldsForQuery(q: BrowseQuery, locale: Lang): Promise<AttrField[]> {
    const node = await this.findSubcategory(q);
    if (!node) return [];
    return (await this.categories.fieldMap(locale)).get(node.id) ?? [];
  }

  /** Resolved once per request, then handed to every predicate it builds. */
  private async browseCtx(q: BrowseQuery, locale: Lang, viewerId?: string): Promise<BrowseCtx> {
    const [blocked, fields] = await Promise.all([
      viewerId ? this.blockedSellerIds(viewerId) : [],
      this.fieldsForQuery(q, locale),
    ]);
    return { locale, blocked, fields };
  }

  /**
   * The browse predicate for a query — shared by the listing read and the facet
   * counts, so a facet can never disagree with the grid it filters.
   *
   * API-11: uses the ONE canonical browse predicate rather than a hand-rolled
   * `approved: true`. `status` is the source of truth the detail read (404s
   * non-live) uses — filtering on `approved` here meant a hidden/moderated
   * listing could still appear in browse yet 404 on tap (or the reverse), and it
   * can't use the `@@index([status, categoryId])` either.
   *
   * Browse is deliberately the BROWSABLE predicate, not the sellable one. Auction
   * lots are products and belong in their category's grid; running the purchase
   * predicate here made every auction vanish from browse, so a category with six
   * listings showed four. Buying is still blocked on the order path itself.
   */
  private async buildWhere(q: BrowseQuery, ctx: BrowseCtx): Promise<Prisma.ProductWhereInput> {
    const where: Prisma.ProductWhereInput = { ...browsableWhere() };
    // Conditions that are themselves an OR (a multi-select facet, a place match,
    // a search word) cannot share the top-level `OR` — a later assignment would
    // silently replace an earlier one. They all collect here.
    const and: Prisma.ProductWhereInput[] = [];
    // Blocking is a Guideline 1.2 obligation: "I stop seeing this person" on
    // every surface. It lives HERE so the grid, its facet counts and the similar
    // fallback all apply it — the facets used to count blocked sellers' stock.
    if (ctx.blocked.length) where.sellerId = { notIn: ctx.blocked };

    const categoryIds = csv(q.categoryId);
    const categoryNames = csv(q.category);
    if (categoryIds.length) where.categoryId = eqOrIn(categoryIds);
    else if (categoryNames.length) where.category = { name: eqOrIn(categoryNames) };
    if (q.verified === 'true') where.verified = true;
    if (q.safe === 'true') where.safeDeal = true;
    // Explicitly browsable BOTH ways — "direct deal only" is a real buyer intent,
    // not just the absence of the safe-deal filter.
    if (q.safe === 'false') where.safeDeal = false;
    if (q.negotiable === 'true') where.negotiable = true;
    if (q.negotiable === 'false') where.negotiable = false;
    // Offers and auctions are two boxes in one "listing type" group, so ticking
    // both has to mean "either". AND-ing them (the old behaviour) asked for a
    // listing that is simultaneously a discount and a live lot — nearly always
    // nothing, which read as a broken filter rather than an empty niche.
    const listingConds: Prisma.ProductWhereInput[] = [];
    if (q.offer === 'true') listingConds.push({ isOffer: true });
    if (q.auction === 'true') listingConds.push({ isAuction: true });
    if (listingConds.length === 1) Object.assign(where, listingConds[0]);
    else if (listingConds.length > 1) and.push({ OR: listingConds });
    // Both the id and the name form are branch-inclusive: selecting a parent has
    // to return everything listed under its descendants, or picking anything but
    // a leaf would look empty on a deep tree.
    if (q.subcategoryId) {
      where.subcategoryId = { in: await this.subcategoryBranchIds(q.subcategoryId) };
    } else if (q.subcategory) {
      const match = await this.findSubcategory(q);
      if (match) where.subcategoryId = { in: await this.subcategoryBranchIds(match.id) };
      else where.subcategory = { name: q.subcategory };
    }
    // Grade is free text on the listing, so each pick is an insensitive equality;
    // several picks OR together.
    const grades = csv(q.grade);
    if (grades.length === 1) where.grade = { equals: likeLiteral(grades[0]), mode: 'insensitive' };
    else if (grades.length > 1) {
      and.push({ OR: grades.map((g) => ({ grade: { equals: likeLiteral(g), mode: 'insensitive' as const } })) });
    }
    // Every search word must land somewhere (see searchTokenWhere); only the
    // similar ladder's loosest rung lets any one word do.
    const words = searchTokens(q.search).map(searchTokenWhere);
    if (words.length && ctx.anyToken) and.push({ OR: words });
    else and.push(...words);
    // Buyers can narrow to products a seller ships to their country. Several
    // picks are an OR — "ships to anywhere I asked about", not "to all of them".
    const supplyCountries = csv(q.supplyCountry);
    if (supplyCountries.length === 1) where.supplyCountries = { has: supplyCountries[0] };
    else if (supplyCountries.length > 1) where.supplyCountries = { hasSome: supplyCountries };

    // The market filter targets the related Market row. City/country do NOT:
    // a listing carries its own structured place (that is what the cards and the
    // product page display), and matching only the market hid every listing whose
    // seller never attached one. Either side matching is a hit.
    const marketSlugs = csv(q.market);
    if (marketSlugs.length) where.market = { slug: eqOrIn(marketSlugs) };
    const placeConds: Prisma.ProductWhereInput[] = [];
    for (const [field, raw] of [['city', q.city], ['country', q.country]] as const) {
      const values = csv(raw);
      if (!values.length) continue;
      const ors: Prisma.ProductWhereInput[] = [];
      for (const value of values) {
        const equals = { equals: likeLiteral(value), mode: 'insensitive' } as const;
        ors.push({ [field]: equals }, { market: { is: { [field]: equals } } });
      }
      placeConds.push({ OR: ors });
    }

    // priceCents is the only reliably numeric price column; range-filter on it.
    const priceCents: Prisma.IntFilter = {};
    const min = Number(q.minPrice);
    const max = Number(q.maxPrice);
    // A blank param is no filter — `Number('')` is 0, and `gte: 0` hid every POA listing.
    if (q.minPrice && Number.isFinite(min)) priceCents.gte = clampCents(min);
    if (q.maxPrice && Number.isFinite(max)) priceCents.lte = clampCents(max);
    if (Object.keys(priceCents).length) where.priceCents = priceCents;

    // Category/subcategory-specific attribute filters arrive as ?attr_<key>=v1,v2.
    // The subcategory's field list tells us whether a field stores a scalar
    // (equals) or an array (array_contains); multiple selected values within one
    // field are OR-ed, and separate fields AND together. `attrValuesHeld` is the
    // in-memory twin the facet counts use — change one, change both.
    const attrConds: Prisma.ProductWhereInput[] = [];
    for (const [key, values] of Object.entries(attrSelectionsOf(q))) {
      const field = ctx.fields.find((f) => f.key === key);
      const ors = values.map((v): Prisma.ProductWhereInput => {
        const value = attrPickValue(field, v);
        return field?.type === 'multiselect'
          ? { attributes: { path: [key], array_contains: value } }
          : { attributes: { path: [key], equals: value } };
      });
      attrConds.push(ors.length === 1 ? ors[0] : { OR: ors });
    }
    // One AND bucket for every OR-shaped condition. Place/attribute order is
    // preserved for the existing specs.
    and.unshift(...placeConds);
    and.push(...attrConds);
    if (and.length) where.AND = and;
    return where;
  }

  /**
   * Sellers the viewer has blocked (or who blocked them). Blocking is a
   * Guideline 1.2 obligation and it has to mean "I stop seeing this person" on
   * every surface, not just in the community feed — a blocked seller's listings
   * would otherwise still fill the catalog.
   */
  private async blockedSellerIds(viewerId: string): Promise<string[]> {
    const rows = await this.prisma.communityUserBlock.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    });
    return [...new Set(rows.map((r) => (r.blockerId === viewerId ? r.blockedId : r.blockerId)))];
  }

  async findAll(raw: RawQuery, locale: Lang = 'en', viewerId?: string) {
    const q = normalizeQuery(raw);
    const ctx = await this.browseCtx(q, locale, viewerId);
    const where = await this.buildWhere(q, ctx);

    // Every sort key here has ties — a batch import shares a `createdAt` to the
    // millisecond, and price/rating repeat constantly. Postgres does not promise
    // a stable order within a tie, so page 2 could re-serve a row from page 1 and
    // silently drop another. `id` breaks every tie and makes paging total.
    // Unpriced (POA) and unrated listings sort LAST: Postgres puts NULLs first
    // on DESC, so "best rated" used to open on ten listings nobody had rated.
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      q.sort === 'price_asc'
        ? { priceCents: { sort: 'asc', nulls: 'last' } }
        : q.sort === 'price_desc'
          ? { priceCents: { sort: 'desc', nulls: 'last' } }
          : q.sort === 'rating'
            ? { ratingAvg: { sort: 'desc', nulls: 'last' } }
            : { createdAt: 'desc' },
      { id: 'desc' },
    ];

    // Pagination: default 24/page, hard-capped at 60 so a rogue pageSize can't
    // ask Postgres for the entire table.
    const page = Math.max(1, Math.trunc(Number(q.page)) || 1);
    const pageSize = Math.min(60, Math.max(1, Math.trunc(Number(q.pageSize)) || 24));

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: browseInclude(locale),
      }),
      this.prisma.product.count({ where }),
    ]);
    const fields = await this.categories.fieldMap(locale);
    const similar = total === 0 && page === 1 ? await this.similarLadder(q, ctx, orderBy, fields) : null;
    return {
      items: await this.localizeCities(items.map((p) => localizeProductWithSpecs(p, fields, locale)), locale),
      total,
      page,
      pageSize,
      ...(similar ?? {}),
    };
  }

  /**
   * Every option a buyer can actually tick, counted against the real listings.
   *
   * This exists because the panel used to invent its own options: five hardcoded
   * grades, and a 250-entry static country list. A seller who typed "Sortex
   * Clean" as a grade, or listed from a country the geo dataset spells
   * differently, produced a listing no filter could reach — invisible stock.
   * Everything here is derived from the catalog instead, so what the panel
   * offers and what the catalog holds cannot drift.
   *
   * Standard faceted-search semantics: a facet's options are counted with every
   * OTHER filter applied but NOT its own. Counting a facet against itself
   * collapses it to the one value already picked, and a second value could never
   * be added.
   */
  async facets(raw: RawQuery, locale: Lang = 'en', viewerId?: string): Promise<ProductFacets> {
    const q = normalizeQuery(raw);
    // Same viewer and same field typing as the grid: blocked sellers' stock is
    // not counted, and attr_* picks compare exactly as the list compares them.
    const ctx = await this.browseCtx(q, locale, viewerId);
    const attrKeys = Object.keys(q).filter((k) => k.startsWith('attr_'));
    // Each facet is counted with its own params lifted out. The id params travel
    // with a human-readable twin; lifting one without the other would leave the
    // filter applied under its other name.
    const without = (...keys: string[]) => this.buildWhere(stripKeys(q, keys), ctx);
    const [
      baseWhere, categoryWhere, subcategoryWhere, marketWhere, cityWhere, countryWhere, gradeWhere, scanWhere, priceWhere,
    ] = await Promise.all([
      without(),
      // Picking another category clears the node and its attribute picks on both
      // clients, so the category counts must not carry them either — with
      // Nuts › Almond selected, every other category used to read 0.
      without('categoryId', 'category', 'subcategoryId', 'subcategory', ...attrKeys),
      // Likewise a different node clears the attribute picks; the category stays.
      without('subcategoryId', 'subcategory', ...attrKeys),
      without('market'),
      // City and country are separate facets, each keeping the OTHER's filter —
      // lifting both together offered Paris under Netherlands, and ticking it
      // returned nothing.
      without('city'),
      without('country'),
      without('grade'),
      // The JSON/array columns Prisma cannot group by. Ships-to and every
      // attribute pick are applied to the scan in memory, per facet, below.
      without('supplyCountry', ...attrKeys),
      // The price hint shows where a buyer can move to, not what they typed.
      without('minPrice', 'maxPrice'),
    ]);

    const [total, catRows, subRows, marketRows, cityRows, countryRows, gradeRows, priceAgg, flagCounts, scanRows] =
      await Promise.all([
        this.prisma.product.count({ where: baseWhere }),
        this.prisma.product.groupBy({ by: ['categoryId'], where: categoryWhere, _count: { _all: true } }),
        this.prisma.product.groupBy({ by: ['subcategoryId'], where: subcategoryWhere, _count: { _all: true } }),
        this.prisma.product.groupBy({ by: ['marketId'], where: marketWhere, _count: { _all: true } }),
        this.prisma.product.groupBy({ by: ['city', 'marketId'], where: cityWhere, _count: { _all: true } }),
        this.prisma.product.groupBy({ by: ['country', 'marketId'], where: countryWhere, _count: { _all: true } }),
        this.prisma.product.groupBy({ by: ['grade'], where: gradeWhere, _count: { _all: true } }),
        this.prisma.product.aggregate({ where: priceWhere, _min: { priceCents: true }, _max: { priceCents: true } }),
        this.flagFacetCounts(q, ctx),
        this.prisma.product.findMany({
          where: scanWhere,
          select: { id: true, supplyCountries: true, attributes: true },
        }),
      ]);

    // Branch-inclusive: selecting a node returns everything beneath it, so a
    // listing counts for its own node AND every ancestor. Direct counts left a
    // parent whose stock sits on its children at 0 — yet clicking it returned rows.
    const { parent } = await this.taxonTree();
    const branchCounts = new Map<string, number>();
    for (const row of subRows) {
      let id: string | null | undefined = row.subcategoryId;
      for (let hops = 0; id && hops <= MAX_TAXONOMY_DEPTH; hops++, id = parent.get(id)) {
        branchCounts.set(id, (branchCounts.get(id) ?? 0) + row._count._all);
      }
    }

    const marketCountById = new Map(marketRows.map((r) => [r.marketId ?? '', r._count._all]));
    const placeMarketIds = [
      ...new Set([...cityRows, ...countryRows].map((r) => r.marketId).filter((id): id is string => !!id)),
    ];
    const [markets, placeMarkets, categories, subcategories] = await Promise.all([
      // Every browsable market (an admin-created one with nothing in it yet is
      // still a real choice) PLUS any other market a matching listing sits in —
      // a seller may list on their own pending market, and a panel that omitted
      // it left that listing reachable by URL only.
      this.prisma.market.findMany({
        where: { OR: [{ active: true, status: 'approved' }, { id: { in: [...marketCountById.keys()] } }] },
        select: { id: true, slug: true, name: true, city: true, country: true, flag: true, translations: { where: { locale }, select: { name: true } } },
      }),
      this.prisma.market.findMany({
        where: { id: { in: placeMarketIds } },
        select: { id: true, city: true, country: true },
      }),
      this.prisma.category.findMany({
        orderBy: [{ sort: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, emoji: true, translations: { where: { locale }, select: { name: true } } },
      }),
      this.prisma.subcategory.findMany({
        where: { id: { in: [...branchCounts.keys()] } },
        select: { id: true, name: true, emoji: true, parentId: true, translations: { where: { locale }, select: { name: true } } },
      }),
    ]);
    const placeMarketById = new Map(placeMarkets.map((m) => [m.id, m]));
    const categoryCountById = new Map(catRows.map((r) => [r.categoryId, r._count._all]));

    // A listing's place is its own city/country OR its market's — the filter
    // matches either side, so it is tallied under both (once when they agree).
    const cities = textFacet(
      cityRows.map((r) => ({ values: [r.city, r.marketId ? placeMarketById.get(r.marketId)?.city : null], n: r._count._all })),
    );
    const countries = textFacet(
      countryRows.map((r) => ({ values: [r.country, r.marketId ? placeMarketById.get(r.marketId)?.country : null], n: r._count._all })),
    );
    // Grade is free text matched case-insensitively — "Premium" and "premium"
    // are ONE option.
    const grades = textFacet(gradeRows.map((r) => ({ values: [r.grade], n: r._count._all })));

    // Ships-to and attribute values, tallied from the scan with the list's own
    // semantics: each facet sees every OTHER pick, never its own.
    const selectedAttrs = attrSelectionsOf(q);
    // Only the discrete types make sensible checkbox facets; a free number or
    // date field has no closed option set to tick.
    const attrFields = filterFields(ctx.fields);
    const supplySelected = new Set(csv(q.supplyCountry));
    const supplyCounts = new Map<string, number>();
    const attrCounts = new Map<string, Map<string, number>>();
    for (const row of scanRows) {
      const values = (row.attributes ?? {}) as Record<string, unknown>;
      // Ships-to: under every attribute pick, without its own (picks OR, so a
      // new country widens the result by exactly the rows counted here).
      if (attrRowMatches(values, selectedAttrs, ctx.fields)) {
        for (const c of new Set(row.supplyCountries)) {
          if (c?.trim()) supplyCounts.set(c, (supplyCounts.get(c) ?? 0) + 1);
        }
      }
      // Attributes: under ships-to and every OTHER attribute pick.
      if (supplySelected.size && !rowMatchesSupply(row.supplyCountries, supplySelected)) continue;
      for (const field of attrFields) {
        if (!attrRowMatches(values, selectedAttrs, ctx.fields, field.key)) continue;
        const bucket = attrCounts.get(field.key) ?? new Map<string, number>();
        for (const option of new Set(attrValuesHeld(field, values[field.key]))) {
          bucket.set(option, (bucket.get(option) ?? 0) + 1);
        }
        attrCounts.set(field.key, bucket);
      }
    }

    const byCountDesc = (a: FacetOption, b: FacetOption) => b.count - a.count || a.label.localeCompare(b.label, locale);
    const fromCounts = (counts: Map<string, number>): FacetOption[] =>
      [...counts.entries()].map(([value, count]) => ({ value, label: value, count })).sort(byCountDesc);

    return {
      total,
      categories: categories
        .map((c) => ({
          value: c.id,
          label: c.translations[0]?.name ?? c.name,
          emoji: c.emoji ?? undefined,
          count: categoryCountById.get(c.id) ?? 0,
        }))
        .sort(byCountDesc),
      subcategories: subcategories
        .map((s) => ({
          value: s.id,
          label: s.translations[0]?.name ?? s.name,
          emoji: s.emoji ?? undefined,
          parentId: s.parentId,
          count: branchCounts.get(s.id) ?? 0,
        }))
        .sort(byCountDesc),
      markets: markets
        .map((m) => ({
          value: m.slug,
          label: m.translations[0]?.name ?? m.name,
          emoji: m.flag ?? undefined,
          hint: m.city ?? undefined,
          count: marketCountById.get(m.id) ?? 0,
        }))
        .sort(byCountDesc),
      countries: countries.sort(byCountDesc),
      cities: cities.sort(byCountDesc),
      grades: grades.sort(byCountDesc),
      supplyCountries: fromCounts(supplyCounts),
      // Schema options FIRST (they are the canonical closed set, and an option
      // nothing carries yet is still a real choice), then any value listings
      // actually hold that the schema no longer lists — an admin can retire an
      // option at any time, and the listings that used it must stay reachable.
      attributes: attrFields.map((f) => {
        const counts = attrCounts.get(f.key) ?? new Map<string, number>();
        const schema = (f.type === 'boolean' ? ['true', 'false'] : (f.options ?? [])).map((value) => ({
          value,
          label: f.type === 'boolean' ? value : optionLabelOf(f, value),
          count: counts.get(value) ?? 0,
        }));
        const known = new Set(schema.map((o) => o.value));
        const orphans = [...counts.entries()]
          .filter(([value]) => !known.has(value))
          .map(([value, count]) => ({ value, label: value, count }));
        return { key: f.key, label: f.label, type: f.type, options: [...schema, ...orphans.sort(byCountDesc)] };
      }),
      flags: flagCounts,
      priceRange: {
        minCents: priceAgg._min.priceCents ?? null,
        maxCents: priceAgg._max.priceCents ?? null,
      },
    };
  }

  /** Counts for the on/off groups, each measured without its own constraint. */
  private async flagFacetCounts(q: BrowseQuery, ctx: BrowseCtx): Promise<FacetFlagCounts> {
    const without = (...keys: string[]) => this.buildWhere(stripKeys(q, keys), ctx);
    const [safeBase, negotiableBase, listingBase, verifiedBase] = await Promise.all([
      without('safe'),
      without('negotiable'),
      without('offer', 'auction'),
      without('verified'),
    ]);
    const count = (where: Prisma.ProductWhereInput, extra: Prisma.ProductWhereInput) =>
      this.prisma.product.count({ where: { AND: [where, extra] } });
    const [safe, direct, negotiable, fixed, offer, auction, verified] = await Promise.all([
      count(safeBase, { safeDeal: true }),
      count(safeBase, { safeDeal: false }),
      count(negotiableBase, { negotiable: true }),
      count(negotiableBase, { negotiable: false }),
      count(listingBase, { isOffer: true }),
      count(listingBase, { isAuction: true }),
      count(verifiedBase, { verified: true }),
    ]);
    return { safe, direct, negotiable, fixed, offer, auction, verified };
  }

  /**
   * What to show when page 1 comes back empty — the search must never just stop.
   *
   * Loosen the query one filter group at a time, cumulatively, from the most
   * specific ask to the broadest: attribute picks (the size nobody lists),
   * grade, price, place, flags; then the taxonomy — up the node's ancestors,
   * nearest first, then the whole category; then the search words (any word,
   * then none); finally the newest listings at all. The first rung that finds
   * anything wins, and `relaxed` names every group it had to drop so the client
   * can say so. Visibility and blocked sellers are never loosened — `buildWhere`
   * applies them from `ctx` on every rung.
   */
  private async similarLadder(
    q: BrowseQuery,
    ctx: BrowseCtx,
    orderBy: Prisma.ProductOrderByWithRelationInput[],
    fields: Map<string, AttrField[]>,
  ) {
    // No filter to loosen: the catalog itself is empty for this viewer.
    if (!filtersIn(q).length) return null;

    type From = { id: string; kind: 'subcategory' | 'category' };
    const attempts: { step: RelaxStep; q: BrowseQuery; anyToken?: boolean; from?: From }[] = [];
    let cur = q;
    const lift = (step: RelaxStep, keys: string[]) => {
      if (!keys.some((k) => cur[k])) return; // a rung whose params are absent is skipped
      cur = stripKeys(cur, keys);
      attempts.push({ step, q: cur });
    };
    // Closest first: with several picks, drop ONE at a time (the last picked
    // first) before all of them — Roasted 23/25 almonds beat the 12 newest
    // almonds of any processing, which is all the all-at-once rung could offer.
    const attrKeys = Object.keys(cur).filter((k) => k.startsWith('attr_') && cur[k]);
    if (attrKeys.length > 1) {
      for (const k of [...attrKeys].reverse()) attempts.push({ step: 'attributes', q: stripKeys(cur, [k]) });
    }
    lift('attributes', attrKeys);
    lift('grade', ['grade']);
    lift('price', ['minPrice', 'maxPrice']);
    lift('place', ['market', 'city', 'country', 'supplyCountry']);
    lift('flags', ['verified', 'safe', 'negotiable', 'offer', 'auction']);

    let from: From | undefined;
    if (cur.subcategoryId || cur.subcategory) {
      const node = await this.findSubcategory(cur);
      const rest = stripKeys(cur, ['subcategoryId', 'subcategory']);
      for (const id of node ? await this.ancestorIds(node.id) : []) {
        attempts.push({ step: 'taxonomy', q: { ...rest, subcategoryId: id }, from: { id, kind: 'subcategory' } });
      }
      // A level-2 node has no ancestor to climb — its category is the next
      // widest thing that is still "like" what was asked for.
      cur = node && !rest.categoryId ? { ...rest, categoryId: node.categoryId } : rest;
      from = node ? { id: node.categoryId, kind: 'category' } : undefined;
      attempts.push({ step: 'taxonomy', q: cur, from });
    }

    const words = searchTokens(cur.search);
    if (words.length > 1) attempts.push({ step: 'search', q: cur, anyToken: true, from });
    if (words.length) {
      cur = stripKeys(cur, ['search']);
      attempts.push({ step: 'search', q: cur, from });
    }
    attempts.push({ step: 'all', q: {} });

    for (const [i, attempt] of attempts.entries()) {
      // A rung that left no filter at all IS the last rung — let 'all' run it once.
      if (attempt.step !== 'all' && !filtersIn(attempt.q).length) continue;
      const items = await this.prisma.product.findMany({
        where: await this.buildWhere(attempt.q, { ...ctx, anyToken: attempt.anyToken }),
        orderBy,
        take: SIMILAR_LIMIT,
        include: browseInclude(ctx.locale),
      });
      if (!items.length) continue;
      return {
        similar: await this.localizeCities(items.map((p) => localizeProductWithSpecs(p, fields, ctx.locale)), ctx.locale),
        relaxed: [...new Set(attempts.slice(0, i + 1).map((a) => a.step))],
        ...(attempt.from ? { similarFrom: await this.similarFromLabel(attempt.from, ctx.locale) } : {}),
      };
    }
    return null;
  }

  /** `similarFrom` for the "showing X instead" line, in the viewer's language. */
  private async similarFromLabel(from: { id: string; kind: 'subcategory' | 'category' }, locale: Lang) {
    const select = { name: true, translations: { where: { locale }, select: { name: true } } } as const;
    const row =
      from.kind === 'subcategory'
        ? await this.prisma.subcategory.findUnique({ where: { id: from.id }, select })
        : await this.prisma.category.findUnique({ where: { id: from.id }, select });
    return { ...from, name: row?.translations[0]?.name ?? row?.name ?? '' };
  }

  async findOne(slug: string, locale: Lang = 'en') {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        ...productTaxonInclude(locale),
        seller: { select: { id: true, name: true, country: true, kycStatus: true } },
        market: {
            select: {
              id: true, slug: true, name: true, city: true, country: true, flag: true,
              translations: { where: { locale }, select: { name: true, city: true } },
            },
          },
        translations: { where: { locale } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    // F04: this is the public, unauthenticated detail route — a moderated,
    // hidden or rejected listing must not be readable by slug just because it
    // can't be browsed. 404 (not 403) so we don't confirm the listing exists.
    // (Expired auctions keep status 'live', so result pages still resolve.)
    if (product.status !== 'live') throw new NotFoundException('Product not found');
    const one = localizeProductWithSpecs(product, await this.categories.fieldMap(locale), locale);
    return (await this.localizeCities([one], locale))[0];
  }

  /**
   * The seller's own listings, localized like every public surface.
   *
   * This list also hydrates the Edit form, so each row carries `source` with the
   * canonical English — see `withSource`. Everything the seller *reads* is in
   * their language; everything they save stays English.
   */
  async findMine(sellerId: string, locale: Lang = 'en') {
    const rows = await this.prisma.product.findMany({
      where: { sellerId, status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
      include: {
        ...productTaxonInclude(locale),
        translations: { where: { locale } },
        _count: { select: { orders: true, auctionBids: true } },
      },
    });
    return rows.map((p) => withSource(p, localizeProduct(p)));
  }

  /**
   * The seller's attribute payload, trimmed to what the subcategory's fields
   * actually define. Until now nothing on the server checked this — the only
   * guard was a client-side effect, so any JSON reached the column.
   */
  private async cleanAttributes(subcategoryId: string | null, attributes: Record<string, unknown>) {
    if (!subcategoryId) return {};
    const fields = (await this.categories.fieldMap('en')).get(subcategoryId) ?? [];
    return sanitizeAttributes(attributes, fields);
  }

  /** Keep a subcategory only if it actually belongs to the chosen category. */
  private async validSubcategory(categoryId: string, subcategoryId?: string | null) {
    if (!subcategoryId) return null;
    const sub = await this.prisma.subcategory.findUnique({ where: { id: subcategoryId } });
    return sub && sub.categoryId === categoryId ? subcategoryId : null;
  }

  /**
   * A seller may only attach an approved market, or a pending one they created
   * themselves — otherwise a pending market would leak onto a public listing.
   */
  private async validMarket(sellerId: string | null, marketId?: string | null) {
    if (!marketId) return null;
    const m = await this.prisma.market.findUnique({ where: { id: marketId } });
    if (!m) throw new NotFoundException('Market not found');
    // Admins (`sellerId: null`) may attach any market, including pending ones.
    const usable = sellerId === null || m.status === 'approved' || m.createdById === sellerId;
    if (!usable) throw new ForbiddenException('That market is awaiting approval.');
    return marketId;
  }

  /**
   * The single rule that keeps every existing single-image render working:
   * when a gallery is supplied, its first entry IS the cover.
   */
  private coverOf(images?: string[], fallback?: string | null) {
    if (!images) return undefined; // gallery untouched — leave imageUrl alone
    return images.length > 0 ? images[0] : (fallback ?? null);
  }

  async create(sellerId: string, dto: CreateProductDto) {
    // Plan quotas are enforced at WRITE time. Checking on read instead would let
    // a downgraded seller keep publishing and quietly teach everyone that the
    // plan is optional. An auction lot IS a Product, so both quotas apply here.
    //
    // Auctions ship UNLIMITED on every plan (`auctionLotsPerMonth` is null in the
    // seed and on the live rows), so this costs a seller nothing today — but the
    // check stays wired up, because the number is editable per plan in the admin
    // console and a knob that is not enforced is a lie. The platform is paid on
    // SUCCESS instead, by the seller's 1% raised when the lot sells.
    await this.entitlements.assertWithin(sellerId, 'seller', 'activeListings');
    if (dto.isAuction) await this.entitlements.assertWithin(sellerId, 'seller', 'auctionLotsPerMonth');

    const subcategoryId = await this.validSubcategory(dto.categoryId, dto.subcategoryId);
    const marketId = await this.validMarket(sellerId, dto.marketId);
    const price = await this.pricePatch(dto.price, dto.priceCurrency);
    const photoLimit = await this.entitlements.photoLimit(sellerId, 'seller');
    // A per-listing cap, so trim to the allowance instead of rejecting the whole
    // listing — the seller gets their listing, just not the extra photos.
    const images = photoLimit === null ? (dto.images ?? []) : (dto.images ?? []).slice(0, photoLimit);
    const attributes = dto.attributes ? await this.cleanAttributes(subcategoryId, dto.attributes) : null;
    const product = await this.prisma.product.create({
      data: {
        slug: slugify(dto.name),
        name: dto.name,
        ...price,
        // Legacy rows hold the display form ('/MT'); new writes are canonical.
        unit: toUnit(dto.unit),
        vatExtra: dto.vatExtra ?? false,
        deliveryFeeExtra: dto.deliveryFeeExtra ?? false,
        notes: dto.notes,
        // Stored trimmed (see FILTER_TEXT): the filter is an exact equality.
        grade: dto.grade?.trim(),
        moq: dto.moq,
        flag: dto.flag,
        emoji: dto.emoji ?? '🌾',
        images,
        imageUrl: images[0] ?? dto.imageUrl,
        origin: dto.origin ?? dto.flag,
        city: dto.city?.trim(),
        country: dto.country?.trim(),
        supplyCountries: dto.supplyCountries ?? [],
        delivery: dto.delivery ?? 'Ready',
        ...(attributes ? { attributes: attributes as Prisma.InputJsonValue } : {}),
        isOffer: dto.isOffer ?? false,
        isAuction: dto.isAuction ?? false,
        // An auction lot is always escrow-protected — see products/safe-deal.ts.
        safeDeal: resolveListingSafeDeal(dto.safeDeal, dto.isAuction ?? false),
        negotiable: dto.negotiable ?? false,
        // FLOW-04 + the single-stock rule: `stockQty` is the one figure, and the
        // legacy `qty` display column is derived from it here so the two can
        // never diverge. null = the seller does not track stock.
        ...this.stockPatch(dto)!,
        // The client sends the bid in the seller's own currency; convert to the
        // USD baseline like the price, and keep the raw entry for the edit form.
        startBidCents: dto.isAuction
          ? dto.startBidCents != null
            ? await this.fx.toUsdCents(dto.startBidCents / 100, price.priceCurrency)
            : price.priceCents
          : null,
        startBidSrcCents: dto.isAuction ? dto.startBidCents ?? null : null,
        auctionEndsAt: dto.isAuction && dto.auctionEndsAt ? new Date(dto.auctionEndsAt) : null,
        verified: false,
        approved: false, // new listings await admin approval before going live
        status: 'pending', // moderation source of truth — kept in sync with `approved`
        categoryId: dto.categoryId,
        subcategoryId,
        sellerId,
        marketId,
      },
    });
    this.events.emit(PRODUCT_UPSERTED, { id: product.id } satisfies ContentUpsertedEvent);
    return product;
  }

  /**
   * Reconcile the two quantity columns onto ONE figure.
   *
   * `stockQty` (whole units, in the listing's own unit) is the source of truth.
   * `qty` is a display string kept in step with it so everything still reading
   * that column — order snapshots, invoice lines, the translation pipeline,
   * seeded rows — sees the same number the buyer does. Nothing may set the two
   * independently: that is what produced a listing showing "300 MT in stock"
   * next to "500 MT available".
   *
   * A client that sends only the legacy `qty` (an older web build, the seeder,
   * an admin edit) has its number PROMOTED into `stockQty` rather than quietly
   * becoming a second, unmanaged quantity.
   *
   * Returns `null` on update when the caller touched neither column, so an
   * unrelated edit leaves stock exactly as it was.
   */
  private stockPatch(
    dto: Partial<CreateProductDto>,
    existing?: { stockQty: number | null; qty: string | null; unit: string | null },
  ): { stockQty: number | null; qty: string | null } | null {
    const touched = dto.stockQty !== undefined || dto.qty !== undefined || dto.unit !== undefined;
    if (existing && !touched) return null;

    const unit = toUnit(dto.unit ?? existing?.unit);
    let stockQty: number | null;
    if (dto.stockQty !== undefined) {
      stockQty = dto.stockQty ?? null;
    } else if (dto.qty !== undefined) {
      // Legacy write: read the number back out of the free text ("25000 kg"),
      // restated in the listing's unit.
      const parsed = parseQtyIn(dto.qty, unit);
      stockQty = parsed === undefined ? null : Math.min(MAX_QTY, Math.max(0, Math.round(parsed)));
    } else {
      stockQty = existing?.stockQty ?? null;
    }
    return { stockQty, qty: stockQtyText(stockQty, unit) };
  }

  /** `sellerId: null` means an admin is acting — ownership is not theirs to have. */
  private async owned(id: string, sellerId: string | null) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Product not found');
    if (sellerId !== null && p.sellerId !== sellerId) throw new ForbiddenException('Not your product');
    return p;
  }

  /**
   * Edit a listing. Admins pass `sellerId: null` and go through this exact path
   * rather than a parallel one, so an admin edit gets the same currency
   * conversion, subcategory/market validation and cover-image election a seller
   * edit does — the admin panel used to write raw columns and could not touch
   * most of the product at all.
   */
  async update(id: string, sellerId: string | null, data: Partial<CreateProductDto>) {
    const existing = await this.owned(id, sellerId);
    for (const k of FILTER_TEXT) if (typeof data[k] === 'string') data = { ...data, [k]: data[k]!.trim() };
    // `qty`/`stockQty` are pulled out of `rest` deliberately: they are never
    // written straight through. `stockPatch` below decides both from the one
    // figure, so an update cannot set them to different numbers.
    const { categoryId: rawCategoryId, subcategoryId, auctionEndsAt, price, priceCurrency, startBidCents, images, marketId, attributes, qty: _qty, stockQty: _stockQty, ...rest } = data;
    void _qty;
    void _stockQty;
    // An empty string is "not supplied", not "move to category ''". The write
    // below already treats it that way (`categoryId ? …`); without normalising
    // here, `touchedSub` fired on a blank and `validSubcategory('', sub)` could
    // never match, so the listing lost its subcategory AND — via
    // `cleanAttributes(null, …)` returning {} — every attribute value with it.
    const categoryId = rawCategoryId || undefined;
    const effectiveCategoryId = categoryId ?? existing.categoryId;
    // Re-validate the subcategory whenever category or subcategory is touched.
    // `nextSubcategoryId` is wherever the listing ENDS UP — attribute cleaning
    // below must validate against it, not where the listing started.
    const touchedSub = categoryId !== undefined || subcategoryId !== undefined;
    const nextSubcategoryId = touchedSub
      ? await this.validSubcategory(effectiveCategoryId, subcategoryId)
      : existing.subcategoryId;
    const subPatch = touchedSub ? { subcategoryId: nextSubcategoryId } : {};
    const marketPatch = marketId !== undefined ? { marketId: await this.validMarket(sellerId, marketId) } : {};
    // Re-price whenever either half changes: switching currency alone still
    // moves the USD baseline every buyer-facing number is derived from.
    const priceInfo =
      price !== undefined || priceCurrency !== undefined
        ? await this.pricePatch(price ?? existing.price, priceCurrency ?? existing.priceCurrency)
        : null;
    const pricePatch = priceInfo ?? {};
    // Like the price, the bid arrives in the seller's own currency — convert to
    // the USD baseline against wherever the currency ENDS UP this update.
    const bidPatch =
      startBidCents !== undefined
        ? {
            startBidSrcCents: startBidCents,
            startBidCents: await this.fx.toUsdCents(
              startBidCents / 100,
              priceInfo?.priceCurrency ?? existing.priceCurrency ?? 'USD',
            ),
          }
        : {};
    // Reordering the gallery re-elects the cover; clearing it falls back to any
    // explicitly-supplied imageUrl, else null.
    const cover = this.coverOf(images, rest.imageUrl ?? null);
    const imagePatch = images !== undefined ? { images, imageUrl: cover } : {};
    // Validate against wherever the listing ENDS UP, not where it started — a
    // move to another subcategory retires the old field set with it.
    const attrPatch =
      attributes !== undefined
        ? {
            attributes: (await this.cleanAttributes(nextSubcategoryId, attributes)) as Prisma.InputJsonValue,
          }
        : {};
    // Both quantity columns move together, or neither moves at all.
    const stockPatch = this.stockPatch(data, existing) ?? {};
    // Safe Deal is mandatory on auctions, and the check has to run against
    // wherever the listing ENDS UP: flipping an existing direct-deal listing to
    // `isAuction` must force escrow on, not inherit the old opt-out.
    // Turning an existing direct-deal listing into an auction forces escrow ON
    // rather than failing: only an EXPLICIT `safeDeal: false` is an opt-out to
    // reject, and the seller flipping the auction switch never sent one.
    const willBeAuction = data.isAuction ?? existing.isAuction;
    const safeDealPatch =
      data.safeDeal !== undefined || data.isAuction !== undefined
        ? { safeDeal: willBeAuction ? requireSafeDeal(data.safeDeal) : data.safeDeal ?? existing.safeDeal }
        : {};
    // Creation holds a listing at approved:false/status:'pending', but an edit
    // wrote neither — so an approved listing could be rewritten into anything
    // and stay live, walking through the human review that is our only control
    // on regulated goods. Any edit to a MODERATED field returns it to the queue;
    // price, stock and auction timing are not moderated and stay published.
    const remoderate = ['name', 'description', 'notes', 'images', 'categoryId', 'subcategoryId', 'attributes'].some(
      (f) => (data as Record<string, unknown>)[f] !== undefined,
    )
      ? { approved: false, status: 'pending' as const }
      : {};
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...stockPatch,
        ...safeDealPatch,
        ...pricePatch,
        ...bidPatch,
        ...(categoryId ? { categoryId } : {}),
        ...subPatch,
        ...marketPatch,
        ...imagePatch,
        ...attrPatch,
        ...(auctionEndsAt !== undefined ? { auctionEndsAt: auctionEndsAt ? new Date(auctionEndsAt) : null } : {}),
        ...remoderate,
      },
    });
    this.events.emit(PRODUCT_UPSERTED, { id: product.id } satisfies ContentUpsertedEvent);
    return product;
  }

  /**
   * Seller-side delete. A listing that has been traded on is archived rather
   * than destroyed; only a pristine one is really deleted.
   *
   * Both halves of that matter, because the FKs pointing at Product split two
   * ways and each half broke differently:
   *
   * - AuctionBid / AuctionAutoBid / AdCampaign are RESTRICT, so deleting a lot
   *   that had ever been bid on raised a raw FK error the seller saw as a 500 —
   *   they simply could not remove it. That's the reported bug.
   * - Order / Review / BuyerBid are SET NULL, so a delete "succeeded" while
   *   quietly severing a buyer's order and any review from the product they
   *   refer to. Silent history loss, which is the worse of the two.
   *
   * Hence the explicit history check ahead of the delete: the RESTRICT half
   * would throw anyway, but nothing except this stops the SET NULL half. The
   * catch stays as the backstop for the RESTRICT relations (and any future one)
   * so this can never 500 again if the check misses something.
   *
   * Archived leaves every public surface for free — `sellableWhere()` matches
   * only `live` — and `findMine` drops it from the seller's own list, so it
   * reads as deleted on both sides. `hidden` stays the admin takedown state.
   */
  async remove(id: string, sellerId: string) {
    await this.owned(id, sellerId);
    const counts = await this.prisma.product.findUnique({
      where: { id },
      select: { _count: { select: { orders: true, reviews: true, buyerBids: true } } },
    });
    const traded = Object.values(counts?._count ?? {}).some((n) => n > 0);
    if (!traded) {
      try {
        await this.prisma.product.delete({ where: { id } });
        return { ok: true };
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003')) throw e;
      }
    }
    await this.prisma.product.update({ where: { id }, data: { status: 'archived', approved: false } });
    return { ok: true };
  }
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private products: ProductsService,
    private uploads: UploadsService,
  ) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Query() q: Record<string, unknown>, @Locale() locale: Lang, @CurrentUser() user?: AuthUser) {
    return this.products.findAll(q, locale, user?.id);
  }

  /**
   * Every option the browse panel can offer, counted against the live catalog.
   *
   * Declared BEFORE `@Get(':slug')` — Nest matches in declaration order, so the
   * slug route would otherwise swallow `/products/facets` and 404 looking for a
   * listing by that name. Same optional viewer as the grid: a signed-in buyer's
   * blocked sellers must drop out of the counts exactly as they drop out of it.
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('facets')
  facets(@Query() q: Record<string, unknown>, @Locale() locale: Lang, @CurrentUser() user?: AuthUser) {
    return this.products.facets(q, locale, user?.id);
  }

  /** Upload a single product image; converted to WebP and stored locally. */
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // Admins upload too — they can edit any part of a listing, photos included.
  @Roles('seller', 'admin')
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file', uploadLimits()))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    const imageUrl = await this.uploads.saveImage(file, 'products', { square: PRODUCT_IMAGE_PX });
    return { imageUrl };
  }

  /** Upload up to MAX_PRODUCT_IMAGES gallery images. Order in = order out. */
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('files', MAX_PRODUCT_IMAGES, uploadLimits(MAX_PRODUCT_IMAGES)))
  async uploadImages(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No images were uploaded.');
    // Sequential: sharp is CPU-bound, so parallelising 6 encodes just thrashes.
    const imageUrls: string[] = [];
    for (const file of files) {
      imageUrls.push(await this.uploads.saveImage(file, 'products', { square: PRODUCT_IMAGE_PX }));
    }
    return { imageUrls };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Get('mine')
  mine(@CurrentUser() user: AuthUser, @Locale() locale: Lang) {
    return this.products.findMine(user.id, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.products.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.remove(id, user.id);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string, @Locale() locale: Lang) {
    return this.products.findOne(slug, locale);
  }
}

@Module({
  imports: [FxModule, CatalogModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  // The admin panel edits listings through this same service (see AdminService).
  exports: [ProductsService],
})
export class ProductsModule {}
