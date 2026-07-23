import type { Request, Response } from 'express';

/**
 * F38: browser clients keep the long-lived refresh token in an HttpOnly cookie
 * instead of localStorage, so it is unreachable from JavaScript (and therefore
 * from an XSS payload). Native clients (mobile) still receive the token in the
 * JSON body and store it in the OS keystore — they opt out of the cookie by not
 * sending the `x-auth-mode: cookie` header.
 *
 * The cookie is scoped to the auth path and marked SameSite=Lax so it rides
 * same-site requests (the web and API run on the same registrable domain) while
 * not being attached to cross-site navigations. `Secure` is set in production.
 */
export const REFRESH_COOKIE = 'agro_refresh';
const COOKIE_PATH = '/api/auth';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** A client asks for cookie-based sessions by sending `x-auth-mode: cookie`. */
export function wantsCookieAuth(req: Request): boolean {
  const header = req.headers['x-auth-mode'];
  const value = Array.isArray(header) ? header[0] : header;
  return value === 'cookie';
}

/** Read the refresh token from the request cookie header (no cookie-parser dep). */
export function readRefreshCookie(req: Request): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === REFRESH_COOKIE) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
}
