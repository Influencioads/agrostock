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
import { CURRENCIES, CURRENCY_SYMBOLS, PRODUCT_UNITS, toUnit, type AttrField } from '@agrotraders/types';
import { commonWord } from '@agrotraders/i18n/notifications';
import { FxModule, FxService } from '../fx/fx.module';
import { CatalogModule, CategoriesService, MAX_TAXONOMY_DEPTH } from '../catalog/catalog.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { PRODUCT_UPSERTED, type ContentUpsertedEvent } from '../translation/translation.events';
import { Locale, localize } from '../common/locale';
import { sellableWhere } from './sellable';
import { MAX_QTY } from '../common/limits';
import type { Lang } from '@agrotraders/i18n';

/** Translatable Product columns folded from a ProductTranslation row. */
const PRODUCT_TR_FIELDS = ['name', 'grade', 'origin', 'qty', 'moq', 'delivery'] as const;

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

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);

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
  /** Seller's own remarks on the listing (packing, loading terms, …). */
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() grade?: string;
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
  ) {}

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

  private async subcategoryBranchIds(subcategoryId: string, categoryId?: string) {
    const rows = await this.prisma.subcategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      select: { id: true, parentId: true },
    });
    const picked = new Set([subcategoryId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) {
        if (row.parentId && picked.has(row.parentId) && !picked.has(row.id)) {
          picked.add(row.id);
          changed = true;
        }
      }
    }
    return [...picked];
  }

  /** Resolve a subcategory from either an id or a name scoped to the chosen category. */
  private async findSubcategory(q: Record<string, string | undefined>) {
    if (q.subcategoryId) {
      return this.prisma.subcategory.findUnique({
        where: { id: q.subcategoryId },
        select: { id: true, name: true, parentId: true, categoryId: true },
      });
    }
    if (!q.subcategory) return null;
    return this.prisma.subcategory.findFirst({
      where: {
        name: q.subcategory,
        ...(q.categoryId ? { categoryId: q.categoryId } : {}),
        ...(!q.categoryId && q.category ? { category: { name: q.category } } : {}),
      },
      select: { id: true, name: true, parentId: true, categoryId: true },
    });
  }

  /**
   * The attribute fields in force for whichever subcategory the query selected,
   * inheritance already applied. Empty when the query names no subcategory.
   */
  private async fieldsForQuery(q: Record<string, string | undefined>, locale: Lang): Promise<AttrField[]> {
    const node = await this.findSubcategory(q);
    if (!node) return [];
    return (await this.categories.fieldMap(locale)).get(node.id) ?? [];
  }

  async findAll(q: Record<string, string | undefined>, locale: Lang = 'en') {
    // API-11: use the ONE canonical sellable predicate rather than a hand-rolled
    // `approved: true`. `status` is the source of truth the detail read (404s
    // non-live) and order placement both use — filtering on `approved` here meant
    // a hidden/moderated listing could still appear in browse yet 404 on tap (or
    // the reverse), and it can't use the `@@index([status, categoryId])` either.
    // sellableWhere() also subsumes the finished-auction exclusion below: a lot
    // whose countdown ran out leaves the browse grid alongside the auction board
    // (the seller still sees it under `/auctions/selling`).
    const where: Prisma.ProductWhereInput = { ...sellableWhere() };
    if (q.categoryId) where.categoryId = q.categoryId;
    else if (q.category) where.category = { name: q.category };
    if (q.verified === 'true') where.verified = true;
    if (q.safe === 'true') where.safeDeal = true;
    // Explicitly browsable BOTH ways — "direct deal only" is a real buyer intent,
    // not just the absence of the safe-deal filter.
    if (q.safe === 'false') where.safeDeal = false;
    if (q.negotiable === 'true') where.negotiable = true;
    if (q.negotiable === 'false') where.negotiable = false;
    if (q.offer === 'true') where.isOffer = true;
    if (q.auction === 'true') where.isAuction = true;
    // Both the id and the name form are branch-inclusive: selecting a parent has
    // to return everything listed under its descendants, or picking anything but
    // a leaf would look empty on a deep tree.
    if (q.subcategoryId) {
      where.subcategoryId = { in: await this.subcategoryBranchIds(q.subcategoryId, q.categoryId) };
    } else if (q.subcategory) {
      const match = await this.findSubcategory(q);
      if (match) where.subcategoryId = { in: await this.subcategoryBranchIds(match.id, match.categoryId) };
      else where.subcategory = { name: q.subcategory };
    }
    if (q.grade) where.grade = { equals: q.grade, mode: 'insensitive' };
    // Search hits the English base row AND every translation of it. Matching
    // only `name` meant a Russian buyer typing "пшеница" got nothing back: the
    // Russian copy lives in ProductTranslation, and the base name is always
    // English. Deliberately NOT constrained to the request locale — someone
    // browsing in English may still type Russian, and vice versa.
    // The place is part of the search too: buyers look for "Mumbai" or "Turkey"
    // in the same box, and typing one used to return nothing because only the
    // dropdowns could filter on it.
    if (q.search) {
      const contains = { contains: q.search, mode: 'insensitive' } as const;
      where.OR = [
        { name: contains },
        { translations: { some: { name: contains } } },
        { city: contains },
        { country: contains },
        { market: { is: { city: contains } } },
        { market: { is: { country: contains } } },
      ];
    }
    // Buyers can narrow to products a seller ships to their country.
    if (q.supplyCountry) where.supplyCountries = { has: q.supplyCountry };

    // The market filter targets the related Market row. City/country do NOT:
    // a listing carries its own structured place (that is what the cards and the
    // product page display), and matching only the market hid every listing whose
    // seller never attached one. Either side matching is a hit.
    if (q.market) where.market = { slug: q.market };
    const placeConds: Prisma.ProductWhereInput[] = [];
    for (const [field, value] of [['city', q.city], ['country', q.country]] as const) {
      if (!value) continue;
      const equals = { equals: value, mode: 'insensitive' } as const;
      placeConds.push({ OR: [{ [field]: equals }, { market: { is: { [field]: equals } } }] });
    }

    // priceCents is the only reliably numeric price column; range-filter on it.
    const priceCents: Prisma.IntFilter = {};
    const min = Number(q.minPrice);
    const max = Number(q.maxPrice);
    if (q.minPrice != null && Number.isFinite(min)) priceCents.gte = Math.round(min);
    if (q.maxPrice != null && Number.isFinite(max)) priceCents.lte = Math.round(max);
    if (Object.keys(priceCents).length) where.priceCents = priceCents;

    // Category/subcategory-specific attribute filters arrive as ?attr_<key>=v1,v2.
    // The subcategory's field list tells us whether a field stores a scalar
    // (equals) or an array (array_contains); multiple selected values within one
    // field are OR-ed, and separate fields AND together.
    const attrConds: Prisma.ProductWhereInput[] = [];
    const hasAttrFilters = Object.entries(q).some(([k, v]) => k.startsWith('attr_') && v);
    // Resolved once — every facet in the query shares the same field list.
    const attrFields = hasAttrFilters ? await this.fieldsForQuery(q, locale) : [];
    for (const [rawKey, rawVal] of Object.entries(q)) {
      if (!rawKey.startsWith('attr_') || !rawVal) continue;
      const key = rawKey.slice(5);
      const values = rawVal.split(',').map((v) => v.trim()).filter(Boolean);
      if (!values.length) continue;
      const field = attrFields.find((f) => f.key === key);
      const isArray = field?.type === 'multiselect';
      const isBool = field?.type === 'boolean';
      const ors = values.map((v): Prisma.ProductWhereInput => {
        const value: Prisma.InputJsonValue = isBool ? v === 'true' : v;
        return isArray
          ? { attributes: { path: [key], array_contains: value } }
          : { attributes: { path: [key], equals: value } };
      });
      attrConds.push(ors.length === 1 ? ors[0] : { OR: ors });
    }
    // One AND bucket for both: each place filter is itself an OR, so they cannot
    // live at the top level next to the search OR without swallowing it.
    const and = [...placeConds, ...attrConds];
    if (and.length) where.AND = and;

    // Every sort key here has ties — a batch import shares a `createdAt` to the
    // millisecond, and price/rating repeat constantly. Postgres does not promise
    // a stable order within a tie, so page 2 could re-serve a row from page 1 and
    // silently drop another. `id` breaks every tie and makes paging total.
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      q.sort === 'price_asc'
        ? { priceCents: 'asc' }
        : q.sort === 'price_desc'
          ? { priceCents: 'desc' }
          : q.sort === 'rating'
            ? { ratingAvg: 'desc' }
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
        include: {
          ...productTaxonInclude(locale),
          seller: { select: { id: true, name: true } },
          market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } },
          translations: { where: { locale } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    const fields = await this.categories.fieldMap(locale);
    const similar = total === 0 && page === 1 ? await this.similarTo(q, where, locale, fields) : null;
    return {
      items: items.map((p) => localizeProductWithSpecs(p, fields, locale)),
      total,
      page,
      pageSize,
      ...(similar ?? {}),
    };
  }

  /**
   * What to show when a drill-down comes back empty.
   *
   * Sellers list at whatever depth describes their goods — often level 2 or 3 —
   * while a buyer can drill to level 5. Those two meeting on the exact same node
   * is the lucky case, not the normal one, and the unlucky case used to be a
   * blank grid. So: climb the selected node's ancestors until one has listings,
   * and hand those back as `similar`, labelled with how far up we had to go.
   *
   * Every other filter in the query is kept — a "similar" result the buyer
   * excluded on price or country is not similar, it is noise. Only the taxonomy
   * narrowing is relaxed, one level at a time, closest match first.
   */
  private async similarTo(
    q: Record<string, string | undefined>,
    where: Prisma.ProductWhereInput,
    locale: Lang,
    fields: Map<string, AttrField[]>,
  ) {
    const node = await this.findSubcategory(q);
    if (!node) return null;

    // Ancestors, nearest first. Bounded by the depth cap.
    let cursor: { id: string; name: string; parentId: string | null } | null = node;
    const chain: { id: string; name: string; parentId: string | null }[] = [];
    for (let hop = 0; cursor?.parentId && hop < MAX_TAXONOMY_DEPTH; hop++) {
      cursor = await this.prisma.subcategory.findUnique({
        where: { id: cursor.parentId },
        select: { id: true, name: true, parentId: true },
      });
      if (cursor) chain.push(cursor);
    }

    for (const ancestor of chain) {
      const relaxed: Prisma.ProductWhereInput = {
        ...where,
        subcategoryId: { in: await this.subcategoryBranchIds(ancestor.id, node.categoryId) },
      };
      const items = await this.prisma.product.findMany({
        where: relaxed,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 12,
        include: {
          ...productTaxonInclude(locale),
          seller: { select: { id: true, name: true } },
          market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } },
          translations: { where: { locale } },
        },
      });
      if (!items.length) continue;
      const label = await this.prisma.subcategory.findUnique({
        where: { id: ancestor.id },
        select: { name: true, translations: { where: { locale }, select: { name: true } } },
      });
      return {
        similar: items.map((p) => localizeProductWithSpecs(p, fields, locale)),
        similarFrom: { id: ancestor.id, name: label?.translations[0]?.name ?? label?.name ?? ancestor.name },
      };
    }
    return null;
  }

  async findOne(slug: string, locale: Lang = 'en') {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        ...productTaxonInclude(locale),
        seller: { select: { id: true, name: true, country: true, kycStatus: true } },
        market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } },
        translations: { where: { locale } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    // F04: this is the public, unauthenticated detail route — a moderated,
    // hidden or rejected listing must not be readable by slug just because it
    // can't be browsed. 404 (not 403) so we don't confirm the listing exists.
    // (Expired auctions keep status 'live', so result pages still resolve.)
    if (product.status !== 'live') throw new NotFoundException('Product not found');
    return localizeProductWithSpecs(product, await this.categories.fieldMap(locale), locale);
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
    const subcategoryId = await this.validSubcategory(dto.categoryId, dto.subcategoryId);
    const marketId = await this.validMarket(sellerId, dto.marketId);
    const price = await this.pricePatch(dto.price, dto.priceCurrency);
    const images = dto.images ?? [];
    const attributes = dto.attributes ? await this.cleanAttributes(subcategoryId, dto.attributes) : null;
    const product = await this.prisma.product.create({
      data: {
        slug: slugify(dto.name),
        name: dto.name,
        ...price,
        // Legacy rows hold the display form ('/MT'); new writes are canonical.
        unit: toUnit(dto.unit),
        vatExtra: dto.vatExtra ?? false,
        notes: dto.notes,
        grade: dto.grade,
        qty: dto.qty,
        moq: dto.moq,
        flag: dto.flag,
        emoji: dto.emoji ?? '🌾',
        images,
        imageUrl: images[0] ?? dto.imageUrl,
        origin: dto.origin ?? dto.flag,
        city: dto.city,
        country: dto.country,
        supplyCountries: dto.supplyCountries ?? [],
        delivery: dto.delivery ?? 'Ready',
        ...(attributes ? { attributes: attributes as Prisma.InputJsonValue } : {}),
        isOffer: dto.isOffer ?? false,
        isAuction: dto.isAuction ?? false,
        safeDeal: dto.safeDeal ?? true,
        negotiable: dto.negotiable ?? false,
        // FLOW-04: managed inventory when the seller sets it; null = unlimited.
        stockQty: dto.stockQty ?? null,
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
    const { categoryId, subcategoryId, auctionEndsAt, price, priceCurrency, startBidCents, images, marketId, attributes, ...rest } = data;
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
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...pricePatch,
        ...bidPatch,
        ...(categoryId ? { categoryId } : {}),
        ...subPatch,
        ...marketPatch,
        ...imagePatch,
        ...attrPatch,
        ...(auctionEndsAt !== undefined ? { auctionEndsAt: auctionEndsAt ? new Date(auctionEndsAt) : null } : {}),
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

  @Get()
  findAll(@Query() q: Record<string, string>, @Locale() locale: Lang) {
    return this.products.findAll(q, locale);
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
