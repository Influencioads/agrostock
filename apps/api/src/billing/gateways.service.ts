import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PaymentProviderKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decryptJson, encryptJson, isMasked, maskSecret } from '../common/crypto';
import type { CredentialField, Creds, PaymentProvider } from './providers/provider';
import { RobokassaProvider } from './providers/robokassa';
import { YooKassaProvider } from './providers/yookassa';
import { TBankProvider } from './providers/tbank';

/** Registration order is the order the checkout offers them in. */
const PROVIDERS: PaymentProvider[] = [new YooKassaProvider(), new TBankProvider(), new RobokassaProvider()];

export interface GatewaySummary {
  provider: PaymentProviderKey;
  label: string;
  enabled: boolean;
  testMode: boolean;
  supportsRecurring: boolean;
  /** True once every required credential field holds a value. */
  configured: boolean;
}

export interface AdminGatewayView extends GatewaySummary {
  docsUrl: string;
  dashboardUrl: string;
  credentialFields: readonly CredentialField[];
  /** Field key → masked value (or null when unset). Never the real secret. */
  credentials: Record<string, string | null>;
  /** Copy-paste URLs the merchant must register in the provider's dashboard. */
  callbackUrls: { kind: string; url: string }[];
  updatedAt: Date | null;
}

const LABELS: Record<PaymentProviderKey, string> = {
  robokassa: 'Robokassa',
  yookassa: 'YooKassa',
  tbank: 'T-Bank',
};

/**
 * Owns gateway configuration: which acquirers are switched on, their (encrypted)
 * credentials, and the adapter instances.
 *
 * The one rule everything here protects: a decrypted credential never leaves
 * this service. Admin reads get masked values; only `credentialsFor()` — called
 * from the payment path — sees the real thing.
 */
@Injectable()
export class GatewaysService {
  private readonly logger = new Logger('GatewaysService');

  constructor(private prisma: PrismaService) {}

  /** The adapter for a provider key. Throws on an unknown key. */
  adapter(provider: PaymentProviderKey): PaymentProvider {
    const found = PROVIDERS.find((p) => p.key === provider);
    if (!found) throw new NotFoundException(`Unknown payment provider: ${provider}`);
    return found;
  }

  adapters(): PaymentProvider[] {
    return PROVIDERS;
  }

  /**
   * Rows are created on demand, so a fresh database (or a provider added in a
   * later release) never leaves the admin page with nothing to render.
   */
  private async row(provider: PaymentProviderKey) {
    return this.prisma.paymentGatewayConfig.upsert({
      where: { provider },
      update: {},
      create: { provider, enabled: false, testMode: true, sortOrder: PROVIDERS.findIndex((p) => p.key === provider) },
    });
  }

  private isConfigured(adapter: PaymentProvider, creds: Creds): boolean {
    return adapter.credentialFields.every((f) => Boolean(creds[f.key]?.trim()));
  }

  /**
   * Read the real credentials for a payment. Refuses when the gateway is off or
   * incomplete, so a half-configured provider fails here with a clear message
   * rather than at the acquirer with an opaque one.
   */
  async credentialsFor(provider: PaymentProviderKey): Promise<{ creds: Creds; testMode: boolean; adapter: PaymentProvider }> {
    const row = await this.row(provider);
    const adapter = this.adapter(provider);
    if (!row.enabled) throw new BadRequestException(`${LABELS[provider]} is not currently accepting payments.`);
    const creds = decryptJson(row.credentials);
    if (!this.isConfigured(adapter, creds)) {
      throw new BadRequestException(`${LABELS[provider]} is enabled but its API credentials are incomplete.`);
    }
    return { creds, testMode: row.testMode, adapter };
  }

  /**
   * Same as `credentialsFor` but tolerant of a disabled gateway — used by the
   * webhook path, because a payment started while a gateway was on must still be
   * confirmable after an admin switches it off.
   */
  async credentialsForCallback(provider: PaymentProviderKey): Promise<{ creds: Creds; testMode: boolean; adapter: PaymentProvider } | null> {
    const row = await this.row(provider);
    const adapter = this.adapter(provider);
    const creds = decryptJson(row.credentials);
    if (!this.isConfigured(adapter, creds)) return null;
    return { creds, testMode: row.testMode, adapter };
  }

  /** What the public checkout is allowed to know: names, not secrets. */
  async publicList(): Promise<GatewaySummary[]> {
    const rows = await this.prisma.paymentGatewayConfig.findMany({ orderBy: { sortOrder: 'asc' } });
    return PROVIDERS.flatMap((adapter) => {
      const row = rows.find((r) => r.provider === adapter.key);
      if (!row?.enabled) return [];
      const creds = decryptJson(row.credentials);
      if (!this.isConfigured(adapter, creds)) return [];
      return [
        {
          provider: adapter.key,
          label: LABELS[adapter.key],
          enabled: true,
          testMode: row.testMode,
          supportsRecurring: adapter.supportsRecurring,
          configured: true,
        },
      ];
    });
  }

  /** The admin view: everything except the credential values themselves. */
  async adminList(apiBaseUrl: string): Promise<AdminGatewayView[]> {
    const views: AdminGatewayView[] = [];
    for (const adapter of PROVIDERS) {
      const row = await this.row(adapter.key);
      const creds = decryptJson(row.credentials);
      views.push({
        provider: adapter.key,
        label: LABELS[adapter.key],
        enabled: row.enabled,
        testMode: row.testMode,
        supportsRecurring: adapter.supportsRecurring,
        configured: this.isConfigured(adapter, creds),
        docsUrl: adapter.docsUrl,
        dashboardUrl: adapter.dashboardUrl,
        credentialFields: adapter.credentialFields,
        credentials: Object.fromEntries(adapter.credentialFields.map((f) => [f.key, maskSecret(creds[f.key])])),
        callbackUrls: adapter.callbackKinds.map((kind) => ({ kind, url: this.callbackUrl(apiBaseUrl, adapter.key, kind) })),
        updatedAt: row.updatedAt,
      });
    }
    return views;
  }

  /**
   * The URLs a merchant pastes into the provider's own dashboard. Built from the
   * API's public base URL so staging and production each show their own.
   */
  callbackUrl(apiBaseUrl: string, provider: PaymentProviderKey, kind: string): string {
    const base = apiBaseUrl.replace(/\/+$/, '');
    if (kind === 'notify') return `${base}/api/billing/webhook/${provider}`;
    return `${base}/api/billing/return?provider=${provider}&outcome=${kind}`;
  }

  /**
   * Save admin changes. Credentials are merged, not replaced: a field left at
   * its masked placeholder means "unchanged", so an admin can flip `testMode`
   * without re-typing every secret.
   */
  async update(
    provider: PaymentProviderKey,
    patch: { enabled?: boolean; testMode?: boolean; credentials?: Record<string, string> },
  ): Promise<void> {
    const adapter = this.adapter(provider);
    const row = await this.row(provider);
    const current = decryptJson(row.credentials);

    let credentials = row.credentials;
    if (patch.credentials) {
      const next = { ...current };
      for (const field of adapter.credentialFields) {
        const value = patch.credentials[field.key];
        if (value === undefined) continue;
        // An empty string is an explicit clear; the mask means "leave it alone".
        if (isMasked(value)) continue;
        if (value.trim() === '') delete next[field.key];
        else next[field.key] = value.trim();
      }
      credentials = encryptJson(next);
    }

    // Refuse to arm a gateway that cannot actually take a payment — otherwise
    // the first customer to pick it gets an error at checkout.
    const effective = patch.credentials ? decryptJson(credentials) : current;
    if (patch.enabled && !this.isConfigured(adapter, effective)) {
      const missing = adapter.credentialFields.filter((f) => !effective[f.key]?.trim()).map((f) => f.key);
      throw new BadRequestException(`Cannot enable ${LABELS[provider]}: missing ${missing.join(', ')}.`);
    }

    await this.prisma.paymentGatewayConfig.update({
      where: { provider },
      data: {
        ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
        ...(patch.testMode === undefined ? {} : { testMode: patch.testMode }),
        credentials,
      },
    });
  }

  /** The admin "Test connection" button. Never reveals the credentials on failure. */
  async test(provider: PaymentProviderKey): Promise<{ ok: boolean; message: string }> {
    const row = await this.row(provider);
    const adapter = this.adapter(provider);
    const creds = decryptJson(row.credentials);
    if (!this.isConfigured(adapter, creds)) {
      const missing = adapter.credentialFields.filter((f) => !creds[f.key]?.trim()).map((f) => f.key);
      return { ok: false, message: `Missing credentials: ${missing.join(', ')}.` };
    }
    try {
      return { ok: true, message: await adapter.test(creds, row.testMode) };
    } catch (e) {
      this.logger.warn(`Gateway test failed for ${provider}: ${(e as Error).message}`);
      return { ok: false, message: (e as Error).message };
    }
  }
}
