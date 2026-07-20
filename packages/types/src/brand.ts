/**
 * Single source of truth for the product's name and public domain.
 *
 * The wordmark is rendered as two adjacent runs (`prefix` in ink, `suffix` in
 * brand green), which is why it is split here rather than stored as one string.
 * Anything user-facing — page titles, invoice headers, marketing copy — should
 * read from `BRAND.name` rather than hardcoding the literal.
 */
export const BRAND = {
  name: 'AgroTraders',
  prefix: 'Agro',
  suffix: 'Traders',
  domain: 'agrotraders.org',
  emailDomain: 'agrotraders.org',
  tagline: 'Global Agriculture Trading Platform',
} as const;
