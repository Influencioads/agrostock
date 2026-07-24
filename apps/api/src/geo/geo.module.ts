import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';

/** A resolved place: the query we looked up, its coordinates and a display label. */
export interface GeoPoint {
  query: string;
  lat: number;
  lng: number;
  label: string;
}

export interface GeoRoute {
  from: GeoPoint;
  to: GeoPoint;
  /** Great-circle distance in km (straight line, not road distance). */
  distanceKm: number;
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/**
 * Geocoding proxy. The Google Maps API key stays on the server and is never shipped
 * to clients — the mobile/web apps call these endpoints instead of Google directly.
 * Results are cached in-memory (place names are stable) to keep quota usage low.
 */
@Injectable()
export class GeoService {
  private readonly cache = new Map<string, GeoPoint | null>();
  // API-16: bound the in-memory cache so an attacker probing many distinct queries
  // can't grow it without limit (memory DoS). Map preserves insertion order, so
  // evicting the first key drops the oldest entry (approx-LRU is fine here).
  private static readonly MAX_CACHE = 5_000;

  constructor(private readonly config: ConfigService) {}

  private cacheSet(key: string, value: GeoPoint | null): void {
    if (this.cache.size >= GeoService.MAX_CACHE) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }

  private apiKey(): string {
    const key = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!key) throw new ServiceUnavailableException('Geocoding is not configured');
    return key;
  }

  async geocode(rawQuery: string): Promise<GeoPoint> {
    const query = (rawQuery ?? '').trim();
    if (!query) throw new BadRequestException('A place query is required');

    const cacheKey = query.toLowerCase();
    if (this.cache.has(cacheKey)) {
      const hit = this.cache.get(cacheKey);
      if (hit) return hit;
      throw new NotFoundException(`Could not locate "${query}"`);
    }

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', query);
    url.searchParams.set('key', this.apiKey());

    let data: {
      status: string;
      results?: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }[];
    };
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      data = (await res.json()) as typeof data;
    } catch {
      throw new ServiceUnavailableException('Geocoding request failed');
    }

    if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
      this.cacheSet(cacheKey, null);
      throw new NotFoundException(`Could not locate "${query}"`);
    }
    if (data.status !== 'OK') {
      // REQUEST_DENIED / OVER_QUERY_LIMIT / INVALID_REQUEST — don't cache; may be transient.
      throw new ServiceUnavailableException(`Geocoding failed (${data.status})`);
    }

    const top = data.results[0];
    const point: GeoPoint = {
      query,
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
      label: top.formatted_address,
    };
    this.cacheSet(cacheKey, point);
    return point;
  }

  async route(from: string, to: string): Promise<GeoRoute> {
    const [a, b] = await Promise.all([this.geocode(from), this.geocode(to)]);
    return { from: a, to: b, distanceKm: haversineKm(a, b) };
  }
}

/**
 * City reference lists, split one file per ISO country by
 * `packages/geo/scripts/gen-geo.mjs`. The upstream dataset is a single 8 MB blob;
 * serving it from here means the clients bundle nothing and we still ship no
 * third-party geocoding call. Files are read lazily and kept in memory once
 * touched (the largest, US, is ~190 KB).
 */
@Injectable()
export class CityRefService {
  private readonly dataDir = join(__dirname, 'data');
  private codes: Record<string, string> | null = null;
  private readonly cache = new Map<string, string[]>();

  private async iso2(country: string): Promise<string | null> {
    this.codes ??= JSON.parse(await readFile(join(this.dataDir, 'country-codes.json'), 'utf8'));
    return this.codes![country.trim().toLowerCase()] ?? null;
  }

  /** City names for a country, optionally filtered by a prefix/substring query. */
  async cities(country: string, q?: string, limit = 200): Promise<string[]> {
    const iso = country ? await this.iso2(country) : null;
    if (!iso) return [];
    let all = this.cache.get(iso);
    if (!all) {
      try {
        all = JSON.parse(await readFile(join(this.dataDir, 'cities', `${iso}.json`), 'utf8')) as string[];
      } catch {
        all = []; // Country with no cities in the dataset — the picker falls back to free text.
      }
      this.cache.set(iso, all);
    }
    const term = q?.trim().toLowerCase();
    if (!term) return all.slice(0, limit);
    // Prefix matches first — typing "mum" should surface Mumbai above Kadi-Mumbai.
    const starts: string[] = [];
    const contains: string[] = [];
    for (const name of all) {
      const lower = name.toLowerCase();
      if (lower.startsWith(term)) starts.push(name);
      else if (lower.includes(term)) contains.push(name);
      if (starts.length >= limit) break;
    }
    return [...starts, ...contains].slice(0, limit);
  }
}

/**
 * Reference data — deliberately unauthenticated: the signup form needs the city
 * list before an account exists.
 */
@ApiTags('geo')
@Controller('geo')
export class GeoRefController {
  constructor(private readonly svc: CityRefService) {}

  /** City names for a country name, e.g. `/geo/cities?country=India&q=mum`. */
  @Get('cities')
  cities(@Query('country') country: string, @Query('q') q?: string) {
    return this.svc.cities(country ?? '', q);
  }
}

// API-16: geocode/route proxy Google Maps under the server's paid key. Even
// behind auth, an authenticated user could burn the quota in a loop — a tight
// per-user throttle caps the spend (cache hits don't count, this only bites the
// distinct-query flood that reaches Google).
@ApiTags('geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: { ttl: 60_000, limit: 30 } })
@Controller('geo')
export class GeoController {
  constructor(private readonly svc: GeoService) {}

  /** Resolve a single place name to coordinates. */
  @Get('geocode')
  geocode(@Query('q') q: string) {
    return this.svc.geocode(q);
  }

  /** Resolve two places and return both endpoints plus straight-line distance. */
  @Get('route')
  routeBetween(@Query('from') from: string, @Query('to') to: string) {
    if (!from || !to) throw new BadRequestException('Both "from" and "to" are required');
    return this.svc.route(from, to);
  }
}

@Module({
  controllers: [GeoRefController, GeoController],
  providers: [GeoService, CityRefService],
})
export class GeoModule {}
