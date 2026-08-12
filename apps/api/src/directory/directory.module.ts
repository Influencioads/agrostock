import { Controller, Get, Injectable, Module, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import type { Lang } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_VEHICLE_SELECT, toPublicVehicle } from '../transport/vehicle-public';
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
  // "Serves this place" — comma-separated, so one param carries both legs of a
  // route (`servesCity=Mundra,Dubai`). Matched as an OR across the provider's
  // origin / operating / supplying tags, unlike the single-value filters above
  // which AND. This is what an order's provider picker sends.
  servesCity?: string;
  servesCountry?: string;
  // Numeric thresholds: match providers whose stated minimum is <= the requested
  // value (or who set no minimum). Sent as strings on the query string.
  minWorkHours?: string;
  minDistanceKm?: string;
  minLoaders?: string;
  // PERF-01: pagination for the public directory lists.
  page?: string;
  pageSize?: string;
}

/** Default and hard-cap page sizes for the public directory lists (PERF-01). */
const DIR_PAGE_SIZE = 24;
const DIR_MAX_PAGE_SIZE = 60;

/** Resolve `{ take, skip }` from the query — these lists were unbounded full-table scans. */
function pageArgs(q: DirectoryQuery): { take: number; skip: number } {
  const size = Math.min(Math.max(1, num(q.pageSize) ?? DIR_PAGE_SIZE), DIR_MAX_PAGE_SIZE);
  const page = Math.max(1, Math.floor(num(q.page) ?? 1));
  return { take: size, skip: (page - 1) * size };
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

/**
 * Split a comma-separated param into trimmed, de-duplicated values.
 *
 * Every browse facet the directory panel lets you tick more than one box in
 * travels this way, so a filter with one value is indistinguishable from the
 * single-value param it used to be — which is what keeps every existing deep
 * link working unchanged.
 */
function csv(v?: string): string[] {
  return [...new Set((v ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
}

/** `['a']` → `'a'`, `['a','b']` → `{ in: [...] }`; a single value stays an equality. */
function eqOrIn(values: string[]): string | { in: string[] } {
  return values.length === 1 ? values[0] : { in: values };
}

/** An insensitive `contains` over one or several values, OR-ed. */
function containsAny<T>(field: string, values: string[]): T | null {
  if (!values.length) return null;
  if (values.length === 1) return { [field]: { contains: values[0], mode: 'insensitive' } } as T;
  return { OR: values.map((v) => ({ [field]: { contains: v, mode: 'insensitive' } })) } as T;
}

/** Array-tag match: `has` for one value, `hasSome` (an OR) for several. */
function tagMatch(values: string[]): { has: string } | { hasSome: string[] } | null {
  if (!values.length) return null;
  return values.length === 1 ? { has: values[0] } : { hasSome: values };
}

/**
 * "Does this provider serve this place?" — used by an order's provider picker,
 * which passes both legs of the route at once.
 *
 * Semantics differ from the single-value `operatingCity`/`supplyingCity` filters
 * deliberately: those AND together to narrow a browse, this ORs so a transporter
 * covering EITHER end of Mundra→Dubai is a candidate. A provider who declared no
 * areas at all is treated as unrestricted — the same convention as `atMost`, and
 * the reason an order in an uncovered region still gets a usable list instead of
 * an empty picker.
 *
 * `supplying` is false for workers: the Worker row has no supplying* columns.
 */
function serves(q: DirectoryQuery, opts: { supplying: boolean }): { OR: Record<string, unknown>[] } | null {
  const cities = csv(q.servesCity);
  const countries = csv(q.servesCountry);
  if (!cities.length && !countries.length) return null;

  // ponytail: Postgres array containment is case-sensitive and Prisma has no
  // insensitive mode for it, so match a few spellings of the same tag. Upgrade
  // path if this ever misses: store the tags lower-cased and add a GIN index
  // (there is no index on any of these columns today).
  const variants = (v: string) => [...new Set([v, v.toLowerCase(), v.replace(/\b\w/g, (c) => c.toUpperCase())])];

  const or: Record<string, unknown>[] = [];
  const arrays = (kind: 'Cities' | 'Countries') =>
    ['operating', ...(opts.supplying ? ['supplying'] : [])].map((p) => `${p}${kind}`);

  for (const c of cities) {
    or.push({ originCity: { contains: c, mode: 'insensitive' } });
    for (const f of arrays('Cities')) or.push({ [f]: { hasSome: variants(c) } });
  }
  for (const c of countries) {
    or.push({ originCountry: { contains: c, mode: 'insensitive' } });
    for (const f of arrays('Countries')) or.push({ [f]: { hasSome: variants(c) } });
  }
  // Declared nothing = no stated restriction = still a candidate.
  or.push({
    AND: [
      { originCity: null },
      { originCountry: null },
      ...[...arrays('Cities'), ...arrays('Countries')].map((f) => ({ [f]: { isEmpty: true } })),
    ],
  });
  return { OR: or };
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
    // One country stays a plain column match. Several are their own OR, and the
    // role match above already owns the top-level `OR` — assigning a second one
    // would silently drop the first, returning every user on the platform.
    const countries = csv(q.country);
    if (countries.length === 1) where.country = { contains: countries[0], mode: 'insensitive' };
    else if (countries.length > 1) {
      where.AND = [containsAny<Prisma.UserWhereInput>('country', countries)!];
    }
    if (q.verified === 'true') where.kycStatus = 'verified';
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    const profileWhere: Prisma.ProfileWhereInput = {};
    const marketSlugs = csv(q.market);
    if (marketSlugs.length) profileWhere.market = { slug: eqOrIn(marketSlugs) };
    // Transporters & loader companies only appear once an admin approves the listing
    // (the seller directory is not gated on this flag).
    if (role === 'transporter' || role === 'loaderco') profileWhere.listApproved = true;
    // Location filters. The `operating*`/`supplying*` pairs are stored tag arrays,
    // so several picks are a `hasSome` — "works in any of these", not "in all".
    const operatingCities = tagMatch(csv(q.operatingCity));
    if (operatingCities) profileWhere.operatingCities = operatingCities;
    const operatingCountries = tagMatch(csv(q.operatingCountry));
    if (operatingCountries) profileWhere.operatingCountries = operatingCountries;
    const supplyingCities = tagMatch(csv(q.supplyingCity));
    if (supplyingCities) profileWhere.supplyingCities = supplyingCities;
    const supplyingCountries = tagMatch(csv(q.supplyingCountry));
    if (supplyingCountries) profileWhere.supplyingCountries = supplyingCountries;
    // Threshold filters (null minimum = accepts anything, so always included), the
    // free-text origin match and the route filter. All live under AND: each brings
    // its own OR and would clobber (or be clobbered by) a sibling OR on the same
    // object.
    const profileAnd = [
      containsAny<Prisma.ProfileWhereInput>('originCity', csv(q.originCity)),
      containsAny<Prisma.ProfileWhereInput>('originCountry', csv(q.originCountry)),
      atMost('minWorkHours', num(q.minWorkHours)),
      atMost('minDistanceKm', num(q.minDistanceKm)),
      atMost('minLoaders', num(q.minLoaders)),
      serves(q, { supplying: true }) as Prisma.ProfileWhereInput | null,
    ].filter(Boolean) as Prisma.ProfileWhereInput[];
    if (profileAnd.length) profileWhere.AND = profileAnd;
    if (Object.keys(profileWhere).length > 0) where.profile = profileWhere;
    return where;
  }

  async sellers(q: DirectoryQuery, locale: Lang = 'en') {
    const users = await this.prisma.user.findMany({
      where: this.roleWhere('seller', q),
      orderBy: q.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
      ...pageArgs(q),
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
      ...pageArgs(q),
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
      ...pageArgs(q),
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
    // "Availability" is a checkbox group: ticking Available and On site means
    // either, so the statuses OR together.
    const statuses = csv(q.status).filter((s) => ['available', 'on_site', 'off'].includes(s));
    if (statuses.length) where.status = eqOrIn(statuses) as never;
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    const countries = csv(q.country);
    if (countries.length === 1) where.user = { country: { contains: countries[0], mode: 'insensitive' } };
    else if (countries.length > 1) {
      where.user = { OR: countries.map((c) => ({ country: { contains: c, mode: 'insensitive' as const } })) };
    }
    // Worker location filters (stored on the Worker row so crew are filterable too).
    const operatingCities = tagMatch(csv(q.operatingCity));
    if (operatingCities) where.operatingCities = operatingCities;
    const operatingCountries = tagMatch(csv(q.operatingCountry));
    if (operatingCountries) where.operatingCountries = operatingCountries;
    // Every one of these carries its own OR, so they go under AND — a bare
    // `where.OR` for one would silently drop the others.
    const minHrs = num(q.minWorkHours);
    const workerAnd = [
      containsAny<Prisma.WorkerWhereInput>('originCity', csv(q.originCity)),
      containsAny<Prisma.WorkerWhereInput>('originCountry', csv(q.originCountry)),
      minHrs != null ? { OR: [{ minWorkHours: null }, { minWorkHours: { lte: minHrs } }] } : null,
      serves(q, { supplying: false }),
    ].filter(Boolean) as Prisma.WorkerWhereInput[];
    if (workerAnd.length) where.AND = workerAnd;
    const workers = await this.prisma.worker.findMany({
      where,
      orderBy: { rating: 'desc' },
      ...pageArgs(q),
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
        // THE fix: a transporter profile used to carry only `_count.vehicles`,
        // so the page could render "Vehicles: 5" and nothing else. The actual
        // fleet now travels with the profile, through the same masked public
        // projection the standalone vehicle endpoints use.
        vehicles: {
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          select: PUBLIC_VEHICLE_SELECT,
        },
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
    const { profile, vehicles, ...rest } = user;
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
      // Masked plates, derived temp range, gallery normalised — never raw rows.
      vehicles: (vehicles ?? []).map(toPublicVehicle),
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
