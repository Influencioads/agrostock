import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type { PaymentProviderKey } from '@prisma/client';
import { safeEqual } from '../../common/crypto';
import {
  minorToDecimal,
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
 * Robokassa — https://docs.robokassa.ru/
 *
 * The odd one out: starting a payment needs no server call at all. You build a
 * signed query string and redirect the browser to it. Everything is a hash over
 * colon-joined values.
 *
 *   payment signature : sha256(MerchantLogin:OutSum:InvId:Password1)
 *   result signature  : sha256(OutSum:InvId:Password2)
 *
 * Two different passwords on purpose: Password1 signs what we send the user,
 * Password2 signs what Robokassa sends back, so a leaked checkout URL cannot be
 * used to forge a payment confirmation.
 */

const PAY_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';
const RECURRING_URL = 'https://auth.robokassa.ru/Merchant/Recurring';

/**
 * Must match "Hash calculation algorithm" in the Robokassa merchant profile —
 * BOTH dropdowns, the live one and the one under "Parameters of the test fees".
 * A mismatch is silent: checkout URLs are rejected and callbacks fail to verify.
 *
 * ponytail: hardcoded, because one shop cannot have two live algorithms. Make it
 * a credential field if live and test ever need to differ.
 */
const sign = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

export class RobokassaProvider implements PaymentProvider {
  readonly key: PaymentProviderKey = 'robokassa';
  readonly docsUrl = 'https://docs.robokassa.ru/';
  readonly dashboardUrl = 'https://partner.robokassa.ru/';
  readonly supportsRecurring = true;
  // Robokassa reads Success/Fail URLs from the merchant profile, not per payment,
  // so all three have to be configured in its dashboard.
  readonly callbackKinds = ['notify', 'success', 'fail'] as const;

  readonly credentialFields = [
    { key: 'MerchantLogin', label: 'merchantLogin', secret: false, example: 'agrotraders' },
    { key: 'Password1', label: 'password1', secret: true },
    { key: 'Password2', label: 'password2', secret: true },
    /**
     * Recurring is a SEPARATE service Robokassa grants per shop, not something a
     * merchant can switch on themselves. Sending `Recurring=true` without it
     * fails the whole payment with error 34, so this stays off until support
     * confirms — otherwise every subscription checkout dies at the acquirer.
     */
    { key: 'RecurringEnabled', label: 'recurringEnabled', secret: false, optional: true, example: 'true — only after Robokassa grants рекуррентные платежи' },
  ] as const;

  /** Whether this merchant may send `Recurring=true`. Opt-in, never assumed. */
  private recurringAllowed(creds: Creds): boolean {
    return creds.RecurringEnabled?.trim().toLowerCase() === 'true';
  }

  private assert(creds: Creds): { login: string; p1: string; p2: string } {
    const login = creds.MerchantLogin?.trim();
    const p1 = creds.Password1?.trim();
    const p2 = creds.Password2?.trim();
    if (!login || !p1 || !p2) throw new BadRequestException('Robokassa is missing its merchant login or passwords.');
    return { login, p1, p2 };
  }

  create(input: CreatePaymentInput, creds: Creds): Promise<CreatedPayment> {
    const { login, p1 } = this.assert(creds);
    const outSum = minorToDecimal(input.amountMinor);
    const params = new URLSearchParams({
      MerchantLogin: login,
      OutSum: outSum,
      InvId: String(input.invId),
      Description: input.description.slice(0, 100),
      SignatureValue: sign(`${login}:${outSum}:${input.invId}:${p1}`),
      Culture: 'ru',
      Encoding: 'utf-8',
    });
    // Marks the payment as the first of a recurring series; the InvId of this
    // payment becomes the PreviousInvoiceID every renewal charges against.
    // Gated: a shop without the recurring service rejects the ENTIRE payment
    // with error 34, so an ungranted merchant silently takes a one-off payment
    // instead of failing checkout. The subscription still starts; only the
    // unattended renewal is unavailable, and `charge()` says so plainly.
    if (input.bindCard && this.recurringAllowed(creds)) params.set('Recurring', 'true');
    if (input.testMode) params.set('IsTest', '1');

    return Promise.resolve({ providerRef: String(input.invId), confirmationUrl: `${PAY_URL}?${params.toString()}` });
  }

  /**
   * Unattended renewal. Robokassa answers with plain text: `OK` on acceptance,
   * anything else is the error. Note this only means the charge was ACCEPTED —
   * the money is confirmed by the ResultURL callback like any other payment.
   */
  async charge(input: ChargeInput, creds: Creds): Promise<ChargeResult> {
    const { login, p1 } = this.assert(creds);
    if (!this.recurringAllowed(creds)) {
      return {
        providerRef: String(input.invId),
        status: 'failed',
        failureReason: 'Robokassa recurring payments are not enabled for this merchant (error 34). Request the service from Robokassa, then set RecurringEnabled.',
      };
    }
    const outSum = minorToDecimal(input.amountMinor);
    const body = new URLSearchParams({
      MerchantLogin: login,
      InvoiceID: String(input.invId),
      PreviousInvoiceID: input.bindingToken,
      Description: input.description.slice(0, 100),
      SignatureValue: sign(`${login}:${outSum}:${input.invId}:${p1}`),
      OutSum: outSum,
    });

    const res = await fetch(RECURRING_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const text = (await res.text()).trim();
    if (!res.ok || !text.toUpperCase().startsWith('OK')) {
      return { providerRef: String(input.invId), status: 'failed', failureReason: text.slice(0, 200) || `HTTP ${res.status}` };
    }
    // Accepted, not yet settled — the callback flips it to succeeded. The new
    // InvId becomes the binding for the charge after this one.
    return { providerRef: String(input.invId), status: 'pending', bindingToken: String(input.invId) };
  }

  /**
   * ResultURL callback. Robokassa posts OutSum/InvId/SignatureValue; the
   * signature is over Password2, which we never put in a checkout URL.
   */
  verify(body: Record<string, unknown>, creds: Creds): Promise<VerifiedEvent | null> {
    const p2 = creds.Password2?.trim();
    if (!p2) return Promise.resolve(null);

    const outSum = str(body, 'OutSum') ?? str(body, 'out_summ');
    const invIdRaw = str(body, 'InvId') ?? str(body, 'inv_id');
    const signature = str(body, 'SignatureValue') ?? str(body, 'crc');
    if (!outSum || !invIdRaw || !signature) return Promise.resolve(null);

    if (!safeEqual(sign(`${outSum}:${invIdRaw}:${p2}`), signature)) return Promise.resolve(null);

    const invId = Number(invIdRaw);
    if (!Number.isInteger(invId)) return Promise.resolve(null);

    return Promise.resolve({
      invId,
      providerRef: invIdRaw,
      status: 'succeeded',
      // "1234.00" → 123400 kopecks. Rounded because float maths on money lies.
      amountMinor: Math.round(Number(outSum) * 100),
      // A recurring-enabled payment's own InvId is what renewals charge against.
      bindingToken: invIdRaw,
    });
  }

  /** Robokassa requires exactly this, or it retries the callback forever. */
  ack(event: VerifiedEvent): string {
    return `OK${event.invId ?? ''}`;
  }

  /**
   * There is no credentials endpoint to call, so the check is local: confirm all
   * three values are present and that a signature can be produced. Honest about
   * what it proves — the first real payment is the true test.
   */
  test(creds: Creds): Promise<string> {
    const { login, p1 } = this.assert(creds);
    sign(`${login}:1.00:1:${p1}`);
    return Promise.resolve(`Credentials present for merchant "${login}". Robokassa has no verification endpoint, so this checks completeness only.`);
  }
}
