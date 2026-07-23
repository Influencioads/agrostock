import { createApiClient } from '@agrotraders/api-client';

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3100';

/**
 * Resolve a stored asset path to a loadable URL. Uploads are saved as relative
 * `/uploads/...` paths served from the API origin; absolute and data URLs pass
 * through unchanged.
 */
export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${API_BASE.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const api = createApiClient({
  baseURL: API_BASE,
  // F38: refresh token lives in an HttpOnly cookie, never in JS-readable storage.
  authMode: 'cookie',
  getToken: () => localStorage.getItem('token'),
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
