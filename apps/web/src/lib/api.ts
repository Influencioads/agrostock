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
  getToken: () => localStorage.getItem('token'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  getLocale: () => localStorage.getItem('lang'),
  onTokens: (r) => {
    localStorage.setItem('token', r.accessToken);
    localStorage.setItem('refreshToken', r.refreshToken);
    localStorage.setItem('user', JSON.stringify(r.user));
  },
  onAuthError: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (!location.pathname.startsWith('/login')) location.assign('/login');
  },
});

/** Normalize an API product into the card shape used across the site. */
export function toCardProduct(p: ApiProduct): Product {
  return {
    id: p.slug,
    name: p.name,
    emoji: p.emoji ?? '🌾',
    imageUrl: assetUrl(p.imageUrl),
    images: (p.images ?? []).map((u) => assetUrl(u)).filter(Boolean) as string[],
    grade: p.grade ?? '',
    flag: p.flag ?? '',
    seller: (p.seller && 'name' in p.seller ? p.seller.name : '') || '',
    sellerId: p.seller?.id,
    qty: p.qty ?? '',
    moq: p.moq ?? '',
    price: p.price,
    priceCents: p.priceCents ?? null,
    unit: p.unit,
    rating: p.rating,
    verified: p.verified,
    safe: p.safeDeal,
    offer: p.isOffer,
    auction: p.isAuction,
    delivery: p.delivery ?? '',
    category: p.category && 'name' in p.category ? p.category.name : '',
    marketName: p.market?.name,
    marketSlug: p.market?.slug,
    // Prefer the product's own structured location; fall back to its market.
    city: p.city ?? p.market?.city ?? undefined,
    country: p.country ?? p.market?.country ?? undefined,
    supplyCountries: p.supplyCountries ?? [],
  };
}
