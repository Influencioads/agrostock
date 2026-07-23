import { createHash } from 'node:crypto';

/**
 * Phase 2 containment (F16): every JWT carries an explicit purpose claim and
 * every non-access purpose is signed with a key derived from the base secret,
 * so a leaked short-lived download token (they travel in query strings and can
 * end up in logs and browser history) can never be replayed as an account
 * Bearer token — and vice versa.
 */
export type DownloadTokenPurpose = 'invoice_download' | 'kyc_download' | 'statement_download';
export type TokenPurpose = 'access' | 'refresh' | DownloadTokenPurpose;

/** Derives a distinct signing key per purpose from the configured base secret. */
export function purposeSecret(baseSecret: string, purpose: DownloadTokenPurpose): string {
  return createHash('sha256').update(`${baseSecret}::${purpose}`).digest('hex');
}

/** True only for a payload minted by the access-token flow. */
export function isAccessPayload(payload: { typ?: unknown }): boolean {
  return payload.typ === 'access';
}
