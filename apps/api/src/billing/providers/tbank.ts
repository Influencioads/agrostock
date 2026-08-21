import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type { PaymentProviderKey, PaymentStatus } from '@prisma/client';
import { safeEqual } from '../../common/crypto';
import {
  str,
  type ChargeInput,
  type ChargeResult,
  type CreatePaymentInput,
  type CreatedPayment,
  type Creds,
  type PaymentProvider,
  type VerifiedEvent,
} from './provider';

/**
 * T-Bank (formerly Tinkoff) e-commerce acquiring — https://developer.tbank.ru/eacq/
 *
 * REST over `securepay.tinkoff.ru/v2/`, authenticated per request by a `Token`:
 * take the ROOT-LEVEL scalar parameters, add the terminal Password, sort by key,
 * concatenate the values, SHA-256. Nested objects (DATA, Receipt) and the Token
 * itself are excluded. The same algorithm verifies incoming notifications, which
 * makes T-Bank the only one of the three whose callback is self-authenticating.
 *
 * Amounts are integer kopecks, which happens to be exactly how we store them.
 */

const API = 'https://securepay.tinkoff.ru/v2';

type Scalar = string | number | boolean;

interface InitResponse {
  Success: boolean;
  ErrorCode?: string;
  Message?: string;
  Details?: string;
  PaymentId?: string;
  PaymentURL?: string;
  Status?: string;
}

interface ChargeResponse extends InitResponse {
  RebillId?: string;
}

/**
 * Token = sha256(values of root-level scalar params + Password, sorted by key).
 * Exported because the notification handler runs the identical computation.
 */
export function tbankToken(params: Record<string, Scalar>, password: string): string {
  const withPassword: Record<string, Scalar> = { ...params, Password: password };
  const concatenated = Object.keys(withPassword)
    .sort()
    .map((k) => String(withPassword[k]))
    .join('');
  return createHash('sha256').update(concatenated, 'utf8').digest('hex');
}

/** Keep only root-level scalars — nested objects are excluded from the token. */
function scalarsOf(body: Record<string, unknown>, drop: string[] = []): Record<string, Scalar> {
  const out: Record<string, Scalar> = {};
  for (const [k, v] of Object.entries(body)) {
    if (drop.includes(k)) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/** T-Bank statuses → ours. Anything mid-flight stays pending. */
function mapStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case 'CONFIRMED':
    case 'AUTHORIZED':
      return 'succeeded';
    case 'REJECTED':
    case 'DEADLINE_EXPIRED':
    case 'ATTEMPTS_EXPIRED':
      return 'failed';
    case 'CANCELED':
    case 'REVERSED':
    case 'REFUNDED':
    case 'PARTIAL_REFUNDED':
      return 'canceled';
    default:
      return 'pending';
  }
}

export class TBankProvider implements PaymentProvider {
  readonly key: PaymentProviderKey = 'tbank';
  readonly docsUrl = 'https://developer.tbank.ru/eacq/intro';
  readonly dashboardUrl = 'https://www.tbank.ru/kassa/';
  readonly supportsRecurring = true;
  // Success/Fail URLs are sent per payment; only the notification URL needs to
  // be registered on the terminal (and even that can be overridden per request).
  readonly callbackKinds = ['notify'] as const;

  readonly credentialFields = [
    { key: 'TerminalKey', label: 'terminalKey', secret: false, example: '1700000000000DEMO' },
    { key: 'Password', label: 'terminalPassword', secret: true },
  ] as const;

  private assert(creds: Creds): { terminal: string; password: string } {
    const terminal = creds.TerminalKey?.trim();
    const password = creds.Password?.trim();
    if (!terminal || !password) throw new BadRequestException('T-Bank is missing its terminal key or password.');
    return { terminal, password };
  }

  private async call<T extends InitResponse>(path: string, params: Record<string, Scalar>, password: string, extra?: object): Promise<T> {
    const body = { ...params, Token: tbankToken(params, password), ...(extra ?? {}) };
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    const text = await res.text();
    let parsed: T;
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      throw new BadRequestException(`T-Bank returned a non-JSON response (HTTP ${res.status}).`);
    }
    if (!parsed.Success) {
      // Details is the operator-facing explanation; Message is the short code.
      throw new BadRequestException(`T-Bank: ${parsed.Details ?? parsed.Message ?? parsed.ErrorCode ?? 'request rejected'}`);
    }
    return parsed;
  }

  async create(input: CreatePaymentInput, creds: Creds): Promise<CreatedPayment> {
    const { terminal, password } = this.assert(creds);
    const params: Record<string, Scalar> = {
      TerminalKey: terminal,
      // Already kopecks — no conversion, and no float ever touches the amount.
      Amount: input.amountMinor,
      OrderId: String(input.invId),
      Description: input.description.slice(0, 250),
      SuccessURL: input.returnUrl,
      FailURL: input.returnUrl,
      NotificationURL: input.notifyUrl,
    };
    if (input.bindCard) {
      // Recurrent + CustomerKey together are what produce a RebillId on the
      // first successful notification; without CustomerKey the card is not bound.
      params.Recurrent = 'Y';
      params.CustomerKey = input.customerKey ?? input.paymentId;
    }

    const res = await this.call<InitResponse>('/Init', params, password);
    if (!res.PaymentURL || !res.PaymentId) throw new BadRequestException('T-Bank did not return a payment URL.');
    return { providerRef: res.PaymentId, confirmationUrl: res.PaymentURL };
  }

  /**
   * Renewal is two calls: Init opens a payment, Charge settles it against the
   * stored RebillId without the cardholder present.
   */
  async charge(input: ChargeInput, creds: Creds): Promise<ChargeResult> {
    const { terminal, password } = this.assert(creds);

    const init = await this.call<InitResponse>(
      '/Init',
      {
        TerminalKey: terminal,
        Amount: input.amountMinor,
        OrderId: String(input.invId),
        Description: input.description.slice(0, 250),
        NotificationURL: input.notifyUrl,
        ...(input.customerKey ? { CustomerKey: input.customerKey } : {}),
      },
      password,
    );
    if (!init.PaymentId) throw new BadRequestException('T-Bank did not return a payment id for the renewal.');

    try {
      const charged = await this.call<ChargeResponse>(
        '/Charge',
        { TerminalKey: terminal, PaymentId: init.PaymentId, RebillId: input.bindingToken },
        password,
      );
      return {
        providerRef: init.PaymentId,
        status: mapStatus(charged.Status),
        bindingToken: charged.RebillId ?? input.bindingToken,
      };
    } catch (e) {
      // An Init that succeeded but a Charge that did not is a failed renewal,
      // not an exception the cron should crash on — dunning handles it.
      return { providerRef: init.PaymentId, status: 'failed', failureReason: (e as Error).message.slice(0, 200) };
    }
  }

  /**
   * Notification. Self-authenticating: recompute the token over the payload's
   * own root-level scalars (minus Token) and compare.
   */
  verify(body: Record<string, unknown>, creds: Creds): Promise<VerifiedEvent | null> {
    const password = creds.Password?.trim();
    const terminal = creds.TerminalKey?.trim();
    if (!password || !terminal) return Promise.resolve(null);

    const claimed = str(body, 'Token');
    if (!claimed) return Promise.resolve(null);
    // A notification for someone else's terminal is not ours to act on.
    if (str(body, 'TerminalKey') !== terminal) return Promise.resolve(null);

    if (!safeEqual(tbankToken(scalarsOf(body, ['Token']), password), claimed)) return Promise.resolve(null);

    const orderId = str(body, 'OrderId');
    const paymentId = str(body, 'PaymentId');
    if (!paymentId) return Promise.resolve(null);

    const amount = str(body, 'Amount');
    return Promise.resolve({
      invId: orderId && Number.isInteger(Number(orderId)) ? Number(orderId) : undefined,
      providerRef: paymentId,
      status: mapStatus(str(body, 'Status')),
      amountMinor: amount ? Number(amount) : undefined,
      bindingToken: str(body, 'RebillId'),
      failureReason: str(body, 'ErrorCode') === '0' ? undefined : str(body, 'Message'),
    });
  }

  /** T-Bank retries until it sees exactly this. */
  ack(): string {
    return 'OK';
  }

  /**
   * `GetState` on an order that cannot exist. Wrong credentials fail on the
   * token check (an auth error); correct credentials fail on "unknown payment",
   * which is the answer we are actually looking for.
   */
  async test(creds: Creds, testMode: boolean): Promise<string> {
    const { terminal, password } = this.assert(creds);
    try {
      await this.call<InitResponse>('/GetState', { TerminalKey: terminal, PaymentId: '0' }, password);
    } catch (e) {
      const message = (e as Error).message;
      if (/token/i.test(message) || /терминал/i.test(message) || /terminal/i.test(message)) throw e;
      // Any other rejection means the terminal accepted our signature.
      return `Terminal ${terminal} accepted our signature (${testMode ? 'test' : 'live'}).`;
    }
    return `Terminal ${terminal} reachable (${testMode ? 'test' : 'live'}).`;
  }
}
