import { createApiClient, type ApiProduct } from '@agrotraders/api-client';
import type { Product } from '../mock/data';

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3100';

/**
 * Resolve a stored asset path to a loadable URL. Uploaded images are saved as
 * relative `/uploads/...` paths (served from the API origin); external/mock
 * images are already absolute and pass through unchanged.
 */
export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${API_BASE.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const api = createApiClient({
  baseURL: API_BASE,
  // F38: the refresh token lives in an HttpOnly cookie the browser manages, so
  // it is never in JS-readable storage (and thus out of reach of XSS). Only the
  // short-lived access token stays in localStorage.
  authMode: 'cookie',
  getToken: () => localStorage.getItem('token'),
  // F27: send the dashboard role the user is actually viewing so the API acts as
  // that role, not their primary role. AuthContext keeps `activeRole` in sync
  // (only ever a role the account holds; the API re-validates membership anyway).
  getActiveRole: () => localStorage.getItem('activeRole'),
  getLocale: () => localStorage.getItem('lang'),
  onTokens: (r) => {
    localStorage.setItem('token', r.accessToken);
    localStorage.setItem('user', JSON.stringify(r.user));
  },
  onAuthError: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (!location.pathname.startsWith('/login')) location.assign('/login');
  },
});

function textValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name : fallback;
  }
  return fallback;
}

function nullableText(value: unknown): string | null {
  const text = textValue(value);
  return text || null;
}

/** Normalize an API product into the card shape used across the site. */
export function toCardProduct(p: ApiProduct): Product {
  return {
    id: textValue(p.slug, textValue(p.id)),
    name: textValue(p.name, 'Product'),
    emoji: p.emoji ?? '🌾',
    imageUrl: assetUrl(textValue(p.imageUrl)),
    images: (p.images ?? []).map((u) => assetUrl(textValue(u))).filter(Boolean) as string[],
    grade: textValue(p.grade),
    flag: textValue(p.flag),
    seller: textValue(p.seller),
    sellerId: textValue(p.seller?.id) || undefined,
    qty: textValue(p.qty),
    moq: textValue(p.moq),
    price: textValue(p.price),
    priceCents: p.priceCents ?? null,
    unit: textValue(p.unit),
    rating: textValue(p.rating),
    // Real review-derived rating; ratingCount === 0 marks an unrated listing so
    // the UI can hide the cosmetic legacy "4.8" default instead of faking stars.
    ratingAvg: p.ratingAvg ?? null,
    ratingCount: p.ratingCount ?? 0,
    verified: p.verified,
    safe: p.safeDeal,
    offer: p.isOffer,
    auction: p.isAuction,
    delivery: textValue(p.delivery),
    category: textValue(p.category),
    marketName: nullableText(p.market?.name) ?? undefined,
    marketSlug: nullableText(p.market?.slug) ?? undefined,
    // Prefer the product's own structured location; fall back to its market.
    city: nullableText(p.city) ?? nullableText(p.market?.city) ?? undefined,
    country: nullableText(p.country) ?? nullableText(p.market?.country) ?? undefined,
    supplyCountries: (p.supplyCountries ?? []).map((country) => textValue(country)).filter(Boolean),
  };
}
