import { Controller, Get, Injectable, Module, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import type { Lang } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { Locale } from '../common/locale';
import { TextTranslationService } from '../translation/text-translation.service';
import { maskEmail, maskPhone } from '../common/sanitize';

/**
 * Public read-only directories of sellers / transporters / loader companies /
 * workers, plus public profile pages. PRIVACY RULE: the private Profile fields
 * (`phone`, `whatsapp`, `contactEmail`) are NEVER selected here — the public
 * payload only ever carries masked hints. Full contact is admin-only
 * (GET /admin/users/:id) or shared voluntarily via chat.
 */

const PUBLIC_PROFILE_SELECT = {
  bio: true,
  location: true,
  availableFrom: true,
  availableTo: true,
  timezone: true,
  languages: true,
  avatarUrl: true,
  avatarEmoji: true,
  originCity: true,
  originCountry: true,
  operatingCities: true,
  operatingCountries: true,
  supplyingCities: true,
  supplyingCountries: true,
  minWorkHours: true,
  minDistanceKm: true,
  minLoaders: true,
  market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } },
} satisfies Prisma.ProfileSelect;

export interface DirectoryQuery {
  country?: string;
  market?: string; // market slug
  verified?: string;
  search?: string;
  sort?: string;
  // Operational filters (free-text, matched case-insensitively). operating*/supplying*
  // are matched exactly against the stored tag arrays (dropdown options are derived
  // from the result set, so exact match is the right semantics).
  originCity?: string;
  originCountry?: string;
  operatingCity?: string;
  operatingCountry?: string;
  supplyingCity?: string;
  supplyingCountry?: string;
  // Numeric thresholds: match providers whose stated minimum is <= the requested
  // value (or who set no minimum). Sent as strings on the query string.
  minWorkHours?: string;
  minDistanceKm?: string;
  minLoaders?: string;
}

/** Parse a numeric query param; returns undefined for missing/invalid values. */
function num(v?: string): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** A threshold filter: provider's minimum is unset (null) OR <= the requested value. */
function atMost(field: string, v?: number): Prisma.ProfileWhereInput | null {
  if (v == null) return null;
  return { OR: [{ [field]: null }, { [field]: { lte: v } }] } as Prisma.ProfileWhereInput;
}

/** Profile-ish object carrying the free-text fields worth translating on read. */
interface Translatable {
  bio?: string | null;
  market?: { name?: string | null } | null;
}

@Injectable()
export class DirectoryService {
  constructor(
    private prisma: PrismaService,
    private text: TextTranslationService,
  ) {}

  /**
   * Localize the free-text of a batch of profiles in ONE round-trip. `bio` is a
   * provider's blurb and `market.name` its mandi/hub — both are English in the
   * DB and have no per-type translation table, so they go through the generic
   * translate-on-read cache. Mutates the passed profile objects in place (they
   * are the same references held by the response rows). No-op for English.
   */
  private async localizeProfiles(profiles: (Translatable | null | undefined)[], locale: Lang): Promise<void> {
    if (locale === 'en' || !this.text.enabled) return;
    const texts: (string | null | undefined)[] = [];
    const slots: { obj: Record<string, unknown>; key: string }[] = [];
    for (const p of profiles) {
      if (!p) continue;
      if (typeof p.bio === 'string') {
        texts.push(p.bio);
        slots.push({ obj: p as Record<string, unknown>, key: 'bio' });
      }
      if (p.market && typeof p.market.name === 'string') {
        texts.push(p.market.name);
        slots.push({ obj: p.market as Record<string, unknown>, key: 'name' });
      }
    }
    if (!texts.length) return;
    const out = await this.text.localizeMany(texts, locale);
    out.forEach((v, i) => {
      if (typeof v === 'string') slots[i].obj[slots[i].key] = v;
    });
  }

  private roleWhere(role: 'seller' | 'transporter' | 'loaderco', q: DirectoryQuery): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {
      active: true,
      OR: [{ role }, { roles: { has: role } }],
    };
    if (q.country) where.country = { contains: q.country, mode: 'insensitive' };
    if (q.verified === 'true') where.kycStatus = 'verified';
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    const profileWhere: Prisma.ProfileWhereInput = {};
    if (q.market) profileWhere.market = { slug: q.market };
    // Transporters & loader companies only appear once an admin approves the listing
    // (the seller directory is not gated on this flag).
    if (role === 'transporter' || role === 'loaderco') profileWhere.listApproved = true;
    // Location filters.
    if (q.originCity) profileWhere.originCity = { contains: q.originCity, mode: 'insensitive' };
    if (q.originCountry) profileWhere.originCountry = { contains: q.originCountry, mode: 'insensitive' };
    if (q.operatingCity) profileWhere.operatingCities = { has: q.operatingCity };
    if (q.operatingCountry) profileWhere.operatingCountries = { has: q.operatingCountry };
    if (q.supplyingCity) profileWhere.supplyingCities = { has: q.supplyingCity };
    if (q.supplyingCountry) profileWhere.supplyingCountries = { has: q.supplyingCountry };
    // Threshold filters (null minimum = accepts anything, so always included).
    const thresholds = [
      atMost('minWorkHours', num(q.minWorkHours)),
      atMost('minDistanceKm', num(q.minDistanceKm)),
      atMost('minLoaders', num(q.minLoaders)),
    ].filter(Boolean) as Prisma.ProfileWhereInput[];
    if (thresholds.length) profileWhere.AND = thresholds;
    if (Object.keys(profileWhere).length > 0) where.profile = profileWhere;
    return where;
  }

  async sellers(q: DirectoryQuery, locale: Lang = 'en') {
    const users = await this.prisma.user.findMany({
      where: this.roleWhere('seller', q),
      orderBy: q.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        country: true,
        kycStatus: true,
        createdAt: true,
        profile: { select: PUBLIC_PROFILE_SELECT },
        _count: { select: { products: { where: { approved: true } }, sellerOrders: true } },
      },
    });
    await this.localizeProfiles(users.map((u) => u.profile), locale);
    return users.map((u) => ({ ...u, type: 'seller' as const }));
  }

  async transporters(q: DirectoryQuery, locale: Lang = 'en') {
    const users = await this.prisma.user.findMany({
      where: this.roleWhere('transporter', q),
      orderBy: q.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        country: true,
        kycStatus: true,
        createdAt: true,
        profile: { select: PUBLIC_PROFILE_SELECT },
        routes: { where: { active: true }, take: 3, select: { name: true, fromCity: true, toCity: true } },
        _count: { select: { vehicles: true, trips: { where: { status: 'delivered' } } } },
      },
    });
    await this.localizeProfiles(users.map((u) => u.profile), locale);
    return users.map((u) => ({ ...u, type: 'transporter' as const }));
  }

  async loaders(q: DirectoryQuery, locale: Lang = 'en') {
    const users = await this.prisma.user.findMany({
      where: this.roleWhere('loaderco', q),
      orderBy: q.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        country: true,
        kycStatus: true,
        createdAt: true,
        profile: { select: PUBLIC_PROFILE_SELECT },
        _count: {
          select: {
            workers: true,
            teams: true,
            loaderJobsManaged: { where: { status: 'completed' } },
          },
        },
      },
    });
    await this.localizeProfiles(users.map((u) => u.profile), locale);
    return users.map((u) => ({ ...u, type: 'loaderco' as const }));
  }

  async workers(q: DirectoryQuery & { status?: string }, locale: Lang = 'en') {
    const where: Prisma.WorkerWhereInput = { userId: { not: null } };
    if (q.status && ['available', 'on_site', 'off'].includes(q.status)) where.status = q.status as never;
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    if (q.country) where.user = { country: { contains: q.country, mode: 'insensitive' } };
    // Worker location filters (stored on the Worker row so crew are filterable too).
    if (q.originCity) where.originCity = { contains: q.originCity, mode: 'insensitive' };
    if (q.originCountry) where.originCountry = { contains: q.originCountry, mode: 'insensitive' };
    if (q.operatingCity) where.operatingCities = { has: q.operatingCity };
    if (q.operatingCountry) where.operatingCountries = { has: q.operatingCountry };
    const minHrs = num(q.minWorkHours);
    if (minHrs != null) where.OR = [{ minWorkHours: null }, { minWorkHours: { lte: minHrs } }];
    const workers = await this.prisma.worker.findMany({
      where,
      orderBy: { rating: 'desc' },
      select: {
        id: true,
        name: true,
        rating: true,
        status: true,
        createdAt: true,
        originCity: true,
        originCountry: true,
        operatingCities: true,
        operatingCountries: true,
        minWorkHours: true,
        loaderco: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            country: true,
            kycStatus: true,
            profile: { select: PUBLIC_PROFILE_SELECT },
          },
        },
        _count: { select: { assignments: { where: { status: 'completed' } } } },
      },
    });
    await this.localizeProfiles(workers.map((w) => w.user?.profile), locale);
    return workers.map((w) => ({ ...w, type: 'worker' as const, independent: !w.loaderco }));
  }

  async profile(userId: string, locale: Lang = 'en') {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, active: true },
      select: {
        id: true,
        name: true,
        role: true,
        roles: true,
        country: true,
        kycStatus: true,
        createdAt: true,
        profile: {
          select: {
            ...PUBLIC_PROFILE_SELECT,
            // Selected ONLY to compute masked hints below; stripped before return.
            phone: true,
            contactEmail: true,
          },
        },
        products: {
          where: { approved: true },
          take: 6,
          orderBy: { createdAt: 'desc' },
          select: { id: true, slug: true, name: true, emoji: true, imageUrl: true, price: true, priceCents: true, unit: true, flag: true, rating: true },
        },
        routes: { where: { active: true }, take: 5, select: { name: true, fromCity: true, toCity: true, distanceKm: true } },
        workerProfile: {
          select: {
            id: true,
            rating: true,
            status: true,
            originCity: true,
            originCountry: true,
            operatingCities: true,
            operatingCountries: true,
            minWorkHours: true,
            loaderco: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            products: { where: { approved: true } },
            sellerOrders: true,
            vehicles: true,
            trips: { where: { status: 'delivered' } },
            workers: true,
            teams: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { profile, ...rest } = user;
    const { phone, contactEmail, ...publicProfile } = profile ?? ({} as never);
    // Localize the blurb + market name, and the featured product names shown on
    // the public profile card, in one batched translate-on-read pass.
    await this.localizeProfiles([publicProfile as Translatable], locale);
    if (locale !== 'en' && this.text.enabled && rest.products?.length) {
      const names = await this.text.localizeMany(rest.products.map((p) => p.name), locale);
      rest.products.forEach((p, i) => {
        if (typeof names[i] === 'string') p.name = names[i] as string;
      });
    }
    return {
      ...rest,
      profile: profile ? publicProfile : null,
      // Masked hints only — the real values never leave the admin endpoints.
      contactMasked: {
        phone: maskPhone(phone),
        email: maskEmail(contactEmail),
      },
    };
  }
}

@ApiTags('directory')
@Controller('directory')
export class DirectoryController {
  constructor(private directory: DirectoryService) {}

  @Get('sellers')
  sellers(@Query() q: DirectoryQuery, @Locale() locale: Lang) {
    return this.directory.sellers(q, locale);
  }

  @Get('transporters')
  transporters(@Query() q: DirectoryQuery, @Locale() locale: Lang) {
    return this.directory.transporters(q, locale);
  }

  @Get('loaders')
  loaders(@Query() q: DirectoryQuery, @Locale() locale: Lang) {
    return this.directory.loaders(q, locale);
  }

  @Get('workers')
  workers(@Query() q: DirectoryQuery & { status?: string }, @Locale() locale: Lang) {
    return this.directory.workers(q, locale);
  }

  @Get('profile/:userId')
  profile(@Param('userId') userId: string, @Locale() locale: Lang) {
    return this.directory.profile(userId, locale);
  }
}

@Module({ controllers: [DirectoryController], providers: [DirectoryService] })
export class DirectoryModule {}
