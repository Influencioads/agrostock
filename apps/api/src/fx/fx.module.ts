import { Controller, Get, Injectable, Logger, Module, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

const UPSTREAM = 'https://open.er-api.com/v6/latest/USD';
const TTL_MS = 12 * 3600e3;

/**
 * Last-known-good ECB-ish rates so price conversion never renders blank even
 * on a cold start with no network. Overwritten by the first successful fetch.
 */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.86, GBP: 0.74, AED: 3.67, INR: 86.2, CNY: 7.2, TRY: 40.1,
  RUB: 78.5, BRL: 5.5, PKR: 284, BDT: 122, VND: 26100, THB: 32.5, EGP: 49.6,
  KZT: 519, UAH: 41.8, SAR: 3.75, QAR: 3.64, NGN: 1530, KES: 129, JPY: 147, IDR: 16200,
};

interface FxSnapshot {
  base: 'USD';
  fetchedAt: string;
  stale: boolean;
  rates: Record<string, number>;
}

@Injectable()
export class FxService {
  private readonly logger = new Logger('FxService');
  private cache: FxSnapshot = { base: 'USD', fetchedAt: new Date(0).toISOString(), stale: true, rates: FALLBACK_RATES };
  private inflight: Promise<void> | null = null;

  /** Serve from cache; refresh in the background when the TTL lapses (stale-while-revalidate). */
  async rates(symbols?: string): Promise<FxSnapshot> {
    const age = Date.now() - new Date(this.cache.fetchedAt).getTime();
    if (age > TTL_MS && !this.inflight) {
      this.inflight = this.refresh().finally(() => (this.inflight = null));
      // First-ever request: wait for the fetch so clients don't start on fallbacks.
      if (this.cache.stale) await this.inflight;
    }
    if (!symbols) return this.cache;
    const wanted = new Set(symbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
    return {
      ...this.cache,
      rates: Object.fromEntries(Object.entries(this.cache.rates).filter(([k]) => wanted.has(k))),
    };
  }

  private async refresh() {
    try {
      const res = await fetch(UPSTREAM, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (data.result !== 'success' || !data.rates) throw new Error('unexpected payload');
      this.cache = { base: 'USD', fetchedAt: new Date().toISOString(), stale: false, rates: data.rates };
    } catch (err) {
      // Keep serving whatever we have — a stale rate beats a broken dashboard.
      this.logger.warn(`FX refresh failed, serving cached rates: ${(err as Error).message}`);
    }
  }
}

@ApiTags('fx')
@Controller('fx')
export class FxController {
  constructor(private fx: FxService) {}

  @Get('rates')
  rates(@Query('symbols') symbols?: string) {
    return this.fx.rates(symbols);
  }
}

@Module({ controllers: [FxController], providers: [FxService] })
export class FxModule {}
