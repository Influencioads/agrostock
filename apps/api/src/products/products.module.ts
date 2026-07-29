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
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  getAttributeField,
  getAttributeFields,
  PRODUCT_UNITS,
  toUnit,
} from '@agrotraders/types';
import { FxModule, FxService } from '../fx/fx.module';
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
  return localized;
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
   * ATTRIBUTE_SCHEMA is keyed by (category name, LEVEL-2 subcategory name), but
   * buyers can now select a node five levels down. Walk up the ancestor chain to
   * the nearest name the schema actually knows, so a deep selection still gets
   * its facets — without this, `getAttributeField` returns undefined and every
   * `multiselect` filter silently degrades to a scalar `equals` that can never
   * match a stored JSON array.
   */
  private async attributeSchemaNames(q: Record<string, string | undefined>) {
    // Resolve by ID FIRST. `q.category` is whatever the client had on screen,
    // which in a non-English locale is the translated label — and the schema is
    // keyed by the canonical English name, so trusting it silently degraded
    // every multiselect facet to a scalar `equals` that can never match.
    let categoryName = q.categoryId
      ? (await this.prisma.category.findUnique({ where: { id: q.categoryId }, select: { name: true } }))?.name
      : undefined;
    categoryName ??= q.category;
    if (!categoryName) return { category: undefined, subcategory: undefined };

    let node = await this.findSubcategory(q);
    if (!node && !q.subcategoryId && q.subcategory) {
      // Name given but no matching row (stale link) — fall back to the raw name.
      return { category: categoryName, subcategory: q.subcategory };
    }
    for (let hops = 0; node && hops <= 8; hops++) {
      if (getAttributeFields(categoryName, node.name).length > 0) {
        return { category: categoryName, subcategory: node.name };
      }
      node = node.parentId
        ? await this.prisma.subcategory.findUnique({
            where: { id: node.parentId },
            select: { id: true, name: true, parentId: true, categoryId: true },
          })
        : null;
    }
    return { category: categoryName, subcategory: undefined };
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
    if (q.search) {
      const contains = { contains: q.search, mode: 'insensitive' } as const;
      where.OR = [
        { name: contains },
        { translations: { some: { name: contains } } },
      ];
    }
    // Buyers can narrow to products a seller ships to their country.
    if (q.supplyCountry) where.supplyCountries = { has: q.supplyCountry };

    // City/country/market all target the related Market row. Merge them into a
    // single `market` filter so combining, say, ?city= and ?market= still ANDs.
    const market: Prisma.MarketWhereInput = {};
    if (q.market) market.slug = q.market;
    if (q.city) market.city = { equals: q.city, mode: 'insensitive' };
    if (q.country) market.country = { equals: q.country, mode: 'insensitive' };
    if (Object.keys(market).length) where.market = market;

    // priceCents is the only reliably numeric price column; range-filter on it.
    const priceCents: Prisma.IntFilter = {};
    const min = Number(q.minPrice);
    const max = Number(q.maxPrice);
    if (q.minPrice != null && Number.isFinite(min)) priceCents.gte = Math.round(min);
    if (q.maxPrice != null && Number.isFinite(max)) priceCents.lte = Math.round(max);
    if (Object.keys(priceCents).length) where.priceCents = priceCents;

    // Category/subcategory-specific attribute filters arrive as ?attr_<key>=v1,v2.
    // The shared schema (needs the chosen subcategory) tells us whether a field
    // stores a scalar (equals) or an array (array_contains); multiple selected
    // values within one field are OR-ed, and separate fields AND together.
    const attrConds: Prisma.ProductWhereInput[] = [];
    const hasAttrFilters = Object.entries(q).some(([k, v]) => k.startsWith('attr_') && v);
    // Resolved once: the walk costs a query per level, and every facet shares it.
    const attrNames = hasAttrFilters
      ? await this.attributeSchemaNames(q)
      : { category: undefined, subcategory: undefined };
    for (const [rawKey, rawVal] of Object.entries(q)) {
      if (!rawKey.startsWith('attr_') || !rawVal) continue;
      const key = rawKey.slice(5);
      const values = rawVal.split(',').map((v) => v.trim()).filter(Boolean);
      if (!values.length) continue;
      const field = getAttributeField(attrNames.category, attrNames.subcategory, key);
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
    if (attrConds.length) where.AND = attrConds;

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      q.sort === 'price_asc'
        ? { priceCents: 'asc' }
        : q.sort === 'price_desc'
          ? { priceCents: 'desc' }
          : q.sort === 'rating'
            ? { ratingAvg: 'desc' }
            : { createdAt: 'desc' };

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
          category: { select: { name: true } },
          subcategory: { select: { name: true } },
          seller: { select: { id: true, name: true } },
          market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } },
          translations: { where: { locale } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: items.map(localizeProduct), total, page, pageSize };
  }

  async findOne(slug: string, locale: Lang = 'en') {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        subcategory: true,
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
    return localizeProduct(product);
  }

  findMine(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        _count: { select: { orders: true, auctionBids: true } },
      },
    });
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
    const product = await this.prisma.product.create({
      data: {
        slug: slugify(dto.name),
        name: dto.name,
        ...price,
        // Legacy rows hold the display form ('/MT'); new writes are canonical.
        unit: toUnit(dto.unit),
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
        ...(dto.attributes ? { attributes: dto.attributes as Prisma.InputJsonValue } : {}),
        isOffer: dto.isOffer ?? false,
        isAuction: dto.isAuction ?? false,
        safeDeal: dto.safeDeal ?? true,
        negotiable: dto.negotiable ?? false,
        // FLOW-04: managed inventory when the seller sets it; null = unlimited.
        stockQty: dto.stockQty ?? null,
        startBidCents: dto.isAuction ? dto.startBidCents ?? price.priceCents : null,
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
    const { categoryId, subcategoryId, auctionEndsAt, price, priceCurrency, images, marketId, attributes, ...rest } = data;
    const effectiveCategoryId = categoryId ?? existing.categoryId;
    // Re-validate the subcategory whenever category or subcategory is touched.
    const subPatch =
      categoryId !== undefined || subcategoryId !== undefined
        ? { subcategoryId: await this.validSubcategory(effectiveCategoryId, subcategoryId) }
        : {};
    const marketPatch = marketId !== undefined ? { marketId: await this.validMarket(sellerId, marketId) } : {};
    // Re-price whenever either half changes: switching currency alone still
    // moves the USD baseline every buyer-facing number is derived from.
    const pricePatch =
      price !== undefined || priceCurrency !== undefined
        ? await this.pricePatch(price ?? existing.price, priceCurrency ?? existing.priceCurrency)
        : {};
    // Reordering the gallery re-elects the cover; clearing it falls back to any
    // explicitly-supplied imageUrl, else null.
    const cover = this.coverOf(images, rest.imageUrl ?? null);
    const imagePatch = images !== undefined ? { images, imageUrl: cover } : {};
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...pricePatch,
        ...(categoryId ? { categoryId } : {}),
        ...subPatch,
        ...marketPatch,
        ...imagePatch,
        ...(attributes !== undefined ? { attributes: attributes as Prisma.InputJsonValue } : {}),
        ...(auctionEndsAt !== undefined ? { auctionEndsAt: auctionEndsAt ? new Date(auctionEndsAt) : null } : {}),
      },
    });
    this.events.emit(PRODUCT_UPSERTED, { id: product.id } satisfies ContentUpsertedEvent);
    return product;
  }

  async remove(id: string, sellerId: string) {
    await this.owned(id, sellerId);
    await this.prisma.product.delete({ where: { id } });
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
  mine(@CurrentUser() user: AuthUser) {
    return this.products.findMine(user.id);
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
  imports: [FxModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  // The admin panel edits listings through this same service (see AdminService).
  exports: [ProductsService],
})
export class ProductsModule {}
