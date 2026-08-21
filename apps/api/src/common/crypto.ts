import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Symmetric encryption for third-party credentials at rest.
 *
 * The only thing stored through here today is payment-gateway API credentials
 * (Robokassa passwords, the YooKassa secret key, the T-Bank terminal password).
 * Those are admin-editable, which means they have to live in the database — and
 * a database dump or a read-only SQL injection must not hand an attacker the
 * ability to take payments as us.
 *
 * Deliberately NOT derived from `jwtAccessSecret()`: rotating the JWT secret is
 * a routine, low-drama operation, and it must not brick every stored credential.
 * `PAYMENTS_SECRET_KEY` is its own key with its own lifecycle, and
 * `assertProductionConfig()` refuses to boot production without it.
 */

/**
 * Dev-only fallback so a local checkout works with no env setup. Safe precisely
 * because production cannot start without a real `PAYMENTS_SECRET_KEY`, and a
 * dev database holds only sandbox credentials.
 */
const DEV_KEY_MATERIAL = 'agrotraders-dev-payments-key-do-not-use-in-production';

/** Version tag on every blob so the format can change without a data migration. */
const VERSION = 'v1';

let cachedKey: Buffer | undefined;
let cachedFrom: string | undefined;

function key(): Buffer {
  const material = process.env.PAYMENTS_SECRET_KEY?.trim() || DEV_KEY_MATERIAL;
  // Re-derive if the env changed under us (tests swap it); otherwise reuse —
  // the hash is cheap but this runs on every gateway call.
  if (!cachedKey || cachedFrom !== material) {
    cachedKey = createHash('sha256').update(`${material}::payment-credentials`).digest();
    cachedFrom = material;
  }
  return cachedKey;
}

/**
 * AES-256-GCM. Returns `v1:<iv>:<authTag>:<ciphertext>`, all base64. GCM (not
 * CBC) so tampering with a stored blob fails loudly on decrypt instead of
 * yielding attacker-influenced plaintext.
 */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), ct.toString('base64')].join(':');
}

/**
 * Reverse of `encryptSecret`. Throws on a malformed or tampered blob — callers
 * treat that as "this gateway is not configured" rather than falling back to
 * anything, because a half-decrypted credential would fail at the acquirer with
 * a much more confusing error.
 */
export function decryptSecret(blob: string): string {
  const [version, ivB64, tagB64, ctB64] = blob.split(':');
  if (version !== VERSION || !ivB64 || !tagB64 || !ctB64) {
    throw new Error('Stored secret is not in the expected format');
  }
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

/** Encrypt a whole credential map as one blob. */
export function encryptJson(value: Record<string, string>): string {
  return encryptSecret(JSON.stringify(value));
}

/** Decrypt a credential map; `{}` when nothing is stored yet. */
export function decryptJson(blob: string | null | undefined): Record<string, string> {
  if (!blob) return {};
  const parsed: unknown = JSON.parse(decryptSecret(blob));
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
}

/**
 * What the admin UI is allowed to see: enough to recognise which key is saved,
 * never enough to use it. Short values are fully hidden rather than half-shown.
 */
export function maskSecret(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.length <= 8 ? '••••••••' : `••••${value.slice(-4)}`;
}

/** The placeholder a masked field round-trips as; a PATCH carrying it means "unchanged". */
export function isMasked(value: string): boolean {
  return value.startsWith('••••');
}

/**
 * Constant-time string compare for signature verification. `timingSafeEqual`
 * throws on length mismatch, so guard that first — and compare case-insensitively
 * because Robokassa returns its MD5 in upper case while we compute lower.
 */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase(), 'utf8');
  const y = Buffer.from(b.toLowerCase(), 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}
