import { BadRequestException, Logger } from '@nestjs/common';
import type { PaymentProviderKey, PaymentStatus } from '@prisma/client';
import {
  minorToDecimal,
  type ChargeInput,
  type ChargeResult,
  type CreatePaymentInput,
  type CreatedPayment,
  type Creds,
  type PaymentProvider,
  type VerifiedEvent,
} from './provider';

/**
 * YooKassa — https://yookassa.ru/developers/api
 *
 * REST + HTTP Basic (shopId as user, secret key as password), with an
 * `Idempotence-Key` header on every POST.
 *
 * The important security property: YooKassa notifications are NOT signed. The
 * webhook body alone proves nothing, so `verify()` deliberately ignores the
 * amounts and status in the payload and RE-FETCHES the payment from the API.
 * Anyone can POST us a "payment.succeeded"; only YooKassa can make
 * `GET /v3/payments/{id}` agree with it.
 */

const API = 'https://api.yookassa.ru/v3';

interface YooAmount {
  value: string;
  currency: string;
}

interface YooPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid?: boolean;
  amount?: YooAmount;
  description?: string;
  confirmation?: { type: string; confirmation_url?: string };
  payment_method?: { id?: string; saved?: boolean; type?: string };
  cancellation_details?: { party?: string; reason?: string };
  metadata?: Record<string, string>;
}

/** YooKassa states → ours. `waiting_for_capture` cannot occur: we always capture. */
function mapStatus(status: YooPayment['status']): PaymentStatus {
  if (status === 'succeeded') return 'succeeded';
  if (status === 'canceled') return 'canceled';
  return 'pending';
}

export class YooKassaProvider implements PaymentProvider {
  private readonly logger = new Logger('YooKassaProvider');

  readonly key: PaymentProviderKey = 'yookassa';
  readonly docsUrl = 'https://yookassa.ru/developers/api';
  readonly dashboardUrl = 'https://yookassa.ru/my';
  readonly supportsRecurring = true;
  // `return_url` is set per payment, so only the notification URL is configured
  // in the YooKassa dashboard.
  readonly callbackKinds = ['notify'] as const;

  readonly credentialFields = [
    { key: 'shopId', label: 'shopId', secret: false, example: '123456' },
    { key: 'secretKey', label: 'secretKey', secret: true, example: 'live_… / test_…' },
  ] as const;

  private auth(creds: Creds): string {
    const shopId = creds.shopId?.trim();
    const secretKey = creds.secretKey?.trim();
    if (!shopId || !secretKey) throw new BadRequestException('YooKassa is missing its shop id or secret key.');
    return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`;
  }

  private async call<T>(
    path: string,
    creds: Creds,
    init: { method: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string },
  ): Promise<T> {
    const headers: Record<string, string> = { Authorization: this.auth(creds), 'Content-Type': 'application/json' };
    // Required on POST/DELETE. Any unique value up to 64 chars; identical
    // requests within 24h replay the original response instead of charging twice.
    if (init.idempotencyKey) headers['Idempotence-Key'] = init.idempotencyKey.slice(0, 64);

    const res = await fetch(`${API}${path}`, {
      method: init.method,
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(25_000),
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      throw new BadRequestException(`YooKassa returned a non-JSON response (HTTP ${res.status}).`);
    }
    if (!res.ok) {
      const err = parsed as { description?: string; code?: string };
      throw new BadRequestException(`YooKassa: ${err.description ?? err.code ?? `HTTP ${res.status}`}`);
    }
    return parsed as T;
  }

  async create(input: CreatePaymentInput, creds: Creds): Promise<CreatedPayment> {
    const payment = await this.call<YooPayment>('/payments', creds, {
      method: 'POST',
      idempotencyKey: input.idempotencyKey,
      body: {
        amount: { value: minorToDecimal(input.amountMinor), currency: input.currency },
        // One-stage payment: authorize and capture together. Two-stage would
        // leave subscriptions in `waiting_for_capture` needing a second call.
        capture: true,
        confirmation: { type: 'redirect', return_url: input.returnUrl },
        description: input.description.slice(0, 128),
        // Echoed back on the webhook, so we can find our row even if the
        // provider ref were somehow lost.
        metadata: { paymentId: input.paymentId, invId: String(input.invId) },
        // Asks YooKassa to keep the card for unattended renewals.
        save_payment_method: input.bindCard ?? false,
      },
    });

    return { providerRef: payment.id, confirmationUrl: payment.confirmation?.confirmation_url ?? null };
  }

  /** Renewal: same endpoint, but a stored method and no confirmation step. */
  async charge(input: ChargeInput, creds: Creds): Promise<ChargeResult> {
    const payment = await this.call<YooPayment>('/payments', creds, {
      method: 'POST',
      idempotencyKey: input.idempotencyKey,
      body: {
        amount: { value: minorToDecimal(input.amountMinor), currency: input.currency },
        capture: true,
        payment_method_id: input.bindingToken,
        description: input.description.slice(0, 128),
        metadata: { paymentId: input.paymentId, invId: String(input.invId) },
      },
    });

    return {
      providerRef: payment.id,
      status: mapStatus(payment.status),
      failureReason: payment.cancellation_details?.reason,
      bindingToken: payment.payment_method?.id,
    };
  }

  /**
   * Webhook. The body is untrusted input — it carries no signature — so the only
   * thing taken from it is the payment id. Everything that matters is read back
   * from the API under our own credentials.
   */
  async verify(body: Record<string, unknown>, creds: Creds): Promise<VerifiedEvent | null> {
    const object = body.object as YooPayment | undefined;
    const id = object?.id;
    if (!id || typeof id !== 'string') return null;

    let payment: YooPayment;
    try {
      payment = await this.call<YooPayment>(`/payments/${encodeURIComponent(id)}`, creds, { method: 'GET' });
    } catch (e) {
      // A payment we cannot read back is a payment we will not act on.
      this.logger.warn(`Rejecting YooKassa notification for ${id}: ${(e as Error).message}`);
      return null;
    }

    return {
      paymentId: payment.metadata?.paymentId,
      invId: payment.metadata?.invId ? Number(payment.metadata.invId) : undefined,
      providerRef: payment.id,
      status: mapStatus(payment.status),
      amountMinor: payment.amount ? Math.round(Number(payment.amount.value) * 100) : undefined,
      // Only present when save_payment_method was honoured.
      bindingToken: payment.payment_method?.saved ? payment.payment_method.id : undefined,
      failureReason: payment.cancellation_details?.reason,
    };
  }

  /** YooKassa ignores the body; a 200 is the acknowledgement. */
  ack(): string {
    return '';
  }

  /** A cheap authenticated read — proves the shopId/secretKey pair is live. */
  async test(creds: Creds, testMode: boolean): Promise<string> {
    await this.call<{ items?: unknown[] }>('/payments?limit=1', creds, { method: 'GET' });
    return `Authenticated with YooKassa (${testMode ? 'test' : 'live'} credentials).`;
  }
}
