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
import { ConfigService } from '@nestjs/config';
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

  constructor(private readonly config: ConfigService) {}

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
      this.cache.set(cacheKey, null);
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
    this.cache.set(cacheKey, point);
    return point;
  }

  async route(from: string, to: string): Promise<GeoRoute> {
    const [a, b] = await Promise.all([this.geocode(from), this.geocode(to)]);
    return { from: a, to: b, distanceKm: haversineKm(a, b) };
  }
}

@ApiTags('geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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

@Module({ controllers: [GeoController], providers: [GeoService] })
export class GeoModule {}
