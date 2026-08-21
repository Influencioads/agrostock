import type { PaymentProviderKey, PaymentStatus } from '@prisma/client';

/**
 * The contract every acquirer adapter implements.
 *
 * Three genuinely different protocols sit behind this: Robokassa signs a query
 * string with MD5 and needs no server call to start a payment, YooKassa is a
 * REST API with idempotency headers and unsigned webhooks, T-Bank is a REST API
 * with a SHA-256 token over sorted parameters. The interface exists because
 * there are three real implementations, not on the chance there might be.
 */

/** Decrypted credential map for one gateway, straight from the admin form. */
export type Creds = Record<string, string>;

export interface CreatePaymentInput {
  /** Our `Payment.id` — round-tripped in provider metadata where supported. */
  paymentId: string;
  /** Our `Payment.invId`. Robokassa's protocol requires a numeric invoice id. */
  invId: number;
  /** Minor units (kopecks for RUB). */
  amountMinor: number;
  currency: string;
  description: string;
  /** Where the provider sends the buyer's browser when it is done. */
  returnUrl: string;
  /** Server-to-server callback. */
  notifyUrl: string;
  /**
   * Ask the provider to remember the card so renewals can be charged
   * unattended. Only set for the first payment of a subscription.
   */
  bindCard?: boolean;
  /** Stable per-customer key some providers require for card binding. */
  customerKey?: string;
  /** Idempotency key; providers that support one receive it verbatim. */
  idempotencyKey: string;
  testMode: boolean;
}

export interface ChargeInput {
  paymentId: string;
  invId: number;
  amountMinor: number;
  currency: string;
  description: string;
  notifyUrl: string;
  /** The stored card binding: YooKassa payment_method_id, T-Bank RebillId, Robokassa InvId. */
  bindingToken: string;
  customerKey?: string;
  idempotencyKey: string;
  testMode: boolean;
}

export interface CreatedPayment {
  /** The provider's own identifier for this payment. */
  providerRef: string;
  /** Where to send the user. Null when the provider settles without a redirect. */
  confirmationUrl: string | null;
}

export interface ChargeResult {
  providerRef: string;
  status: PaymentStatus;
  failureReason?: string;
  /** A refreshed binding, when the provider rotates it per charge. */
  bindingToken?: string;
}

/** The normalized outcome of a verified callback. */
export interface VerifiedEvent {
  /** Our `Payment.invId`, when the provider echoes it. */
  invId?: number;
  /** Our `Payment.id`, when the provider carries metadata. */
  paymentId?: string;
  providerRef: string;
  status: PaymentStatus;
  /** Minor units as the provider reports them — checked against our intent. */
  amountMinor?: number;
  /** Card binding to store for renewals, if this payment produced one. */
  bindingToken?: string;
  failureReason?: string;
}

export interface CredentialField {
  key: string;
  /** i18n key suffix under `gateways.field.*`; the admin UI translates it. */
  label: string;
  /** Masked on read and write-only on save. */
  secret: boolean;
  /** Shown under the input as a hint; already-translated copy is not expected here. */
  example?: string;
}

export interface PaymentProvider {
  readonly key: PaymentProviderKey;
  /** Official integration documentation, linked from the admin page. */
  readonly docsUrl: string;
  /** Where the merchant gets credentials. */
  readonly dashboardUrl: string;
  /** What the admin form asks for. */
  readonly credentialFields: readonly CredentialField[];
  /**
   * Which callback URLs this provider needs configured in ITS dashboard.
   * Rendered on the admin page as copy-paste values so nobody has to guess.
   */
  readonly callbackKinds: readonly ('notify' | 'success' | 'fail')[];
  /** True when the provider can charge a stored card without the user present. */
  readonly supportsRecurring: boolean;

  /** Start a payment. Throws with a human-readable message on a provider error. */
  create(input: CreatePaymentInput, creds: Creds): Promise<CreatedPayment>;

  /** Charge a stored binding for a renewal. Only called when `supportsRecurring`. */
  charge(input: ChargeInput, creds: Creds): Promise<ChargeResult>;

  /**
   * Verify and normalize a callback. MUST return null — never throw — when the
   * payload fails authentication, so the controller can answer with a flat
   * rejection and log it without leaking which check failed.
   */
  verify(body: Record<string, unknown>, creds: Creds, testMode: boolean): Promise<VerifiedEvent | null>;

  /** The literal body this provider expects as the callback response. */
  ack(event: VerifiedEvent): string;

  /**
   * Prove the stored credentials work, for the admin "Test connection" button.
   * Resolves with a short human-readable status, rejects with the failure.
   */
  test(creds: Creds, testMode: boolean): Promise<string>;
}

/** Minor units → the decimal string most Russian acquirers expect ("2900.00"). */
export function minorToDecimal(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

/** Read a callback field as a string regardless of how the body was parsed. */
export function str(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  if (v === undefined || v === null) return undefined;
  return String(v);
}
