import { createHash } from 'crypto';

/**
 * Namespace for AgroTraders account tokens. Changing it would orphan every
 * App Store subscription already bought, so it is fixed forever.
 */
const NAMESPACE = '26e2f3b0-138e-45ec-a05f-a5e0c92a140b';

/**
 * The StoreKit `appAccountToken` for one account: an RFC 4122 version-5 UUID
 * derived from the user id.
 *
 * StoreKit only accepts a UUID and our ids are cuids, so we cannot pass the id
 * itself. Deriving it (rather than minting and storing a random one) needs no
 * column, and a restore on a new device maps back to the same account because
 * the same id always yields the same token.
 */
export function appleAccountToken(userId: string): string {
  const hash = createHash('sha1')
    .update(Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex'))
    .update(userId, 'utf8')
    .digest();
  const b = hash.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
