import { createApiClient } from '@agrotraders/api-client';
import { storage } from './storage';
import { assetUrlFromBase, resolveApiBase } from './apiBase';

export const TOKEN_KEY = 'agrotraders_token';
export const REFRESH_KEY = 'agrotraders_refresh';

export const API_BASE = resolveApiBase();

/**
 * Resolve a stored asset path to a loadable URL. Uploaded images are saved as
 * relative `/uploads/...` paths served from the API origin; absolute/data URLs
 * pass through unchanged.
 */
export function assetUrl(path?: string | null): string | undefined {
  return assetUrlFromBase(path, API_BASE);
}

/**
 * The api-client's getToken is synchronous, but our tokens live in async
 * SecureStore. AuthProvider loads them into these module-level caches on boot and
 * updates them on login/logout; the client always reads the cached values.
 */
let memToken: string | null = null;
let memRefresh: string | null = null;
let memActiveRole: string | null = null;
let memLocale: string | null = null;

/**
 * F25: a terminal refresh failure must clear the React auth state too, not just
 * the token caches, or the UI keeps showing an authenticated shell over a dead
 * session. AuthProvider registers a listener here; the api-client invokes it
 * from onAuthError.
 */
let authFailureListener: (() => void) | null = null;
export function setAuthFailureListener(listener: (() => void) | null) {
  authFailureListener = listener;
}

export function setApiToken(token: string | null) {
  memToken = token;
}
export function setApiRefreshToken(token: string | null) {
  memRefresh = token;
}
export function setApiActiveRole(role: string | null) {
  memActiveRole = role;
}
/** The current UI locale, sent as Accept-Language so the API returns translated content. */
export function setApiLocale(locale: string | null) {
  memLocale = locale;
}
/** The current access token, needed to open a Socket.IO handshake for chat. */
export function getApiToken(): string | null {
  return memToken;
}

export const api = createApiClient({
  baseURL: API_BASE,
  getToken: () => memToken,
  getActiveRole: () => memActiveRole,
  getLocale: () => memLocale,
  getRefreshToken: () => memRefresh,
  // On a silent refresh, update both the in-memory caches and SecureStore so the
  // new tokens survive an app restart. (Persistence is fire-and-forget.)
  onTokens: (r) => {
    memToken = r.accessToken;
    memRefresh = r.refreshToken;
    void storage.set(TOKEN_KEY, r.accessToken);
    void storage.set(REFRESH_KEY, r.refreshToken);
  },
  onAuthError: () => {
    memToken = null;
    memRefresh = null;
    memActiveRole = null;
    void storage.del(TOKEN_KEY);
    void storage.del(REFRESH_KEY);
    // Clear the UI session atomically so no ghost authenticated screen remains.
    authFailureListener?.();
  },
});
