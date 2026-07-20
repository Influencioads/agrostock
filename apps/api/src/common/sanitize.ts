import sanitizeHtml from 'sanitize-html';

const MAX_LEN = 4000;

/**
 * Strip ALL HTML from an inbound chat body (XSS-safe) and clamp its length.
 * Used by both chat systems on every message/post body before persistence.
 */
export function sanitizeMessage(input: string): string {
  const clean = sanitizeHtml(input ?? '', {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
  return clean.trim().slice(0, MAX_LEN);
}

/**
 * Mask emails and long digit sequences (phone numbers) in PUBLIC community
 * bodies so contact details are not exposed by default (privacy rule).
 * TODO(phase-2): refine detection (obfuscated contacts, messengers).
 */
export function maskContacts(input: string): string {
  return input
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[hidden email]')
    .replace(/(?:\+?\d[\s()-]?){7,}/g, '[hidden number]');
}

/** "+971 50 214 8867" → "+971 •••• ••67" — hints a number exists without exposing it. */
export function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const cc = phone.trim().startsWith('+') ? phone.trim().slice(0, 4).replace(/[^+\d]/g, '') : '';
  return `${cc} •••• ••${digits.slice(-2)}`.trim();
}

/** "karim@trading.ae" → "k•••@trading.ae" */
export function maskEmail(email?: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return '•••';
  return `${(local ?? '').slice(0, 1)}•••@${domain}`;
}
