import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
  wantsCookieAuth,
} from '../src/auth/refresh-cookie';
import { AuthController } from '../src/auth/auth.controller';

function req(headers: Record<string, string | string[] | undefined>): Request {
  return { headers } as unknown as Request;
}

describe('refresh cookie helpers (F38)', () => {
  it('wantsCookieAuth detects the x-auth-mode header', () => {
    expect(wantsCookieAuth(req({ 'x-auth-mode': 'cookie' }))).toBe(true);
    expect(wantsCookieAuth(req({ 'x-auth-mode': ['cookie'] }))).toBe(true);
    expect(wantsCookieAuth(req({ 'x-auth-mode': 'body' }))).toBe(false);
    expect(wantsCookieAuth(req({}))).toBe(false);
  });

  it('readRefreshCookie extracts only the refresh cookie value', () => {
    expect(readRefreshCookie(req({ cookie: `other=1; ${REFRESH_COOKIE}=abc.def; foo=bar` }))).toBe('abc.def');
    expect(readRefreshCookie(req({ cookie: 'other=1' }))).toBeUndefined();
    expect(readRefreshCookie(req({}))).toBeUndefined();
  });

  it('readRefreshCookie url-decodes the value', () => {
    expect(readRefreshCookie(req({ cookie: `${REFRESH_COOKIE}=a%2Bb%3Dc` }))).toBe('a+b=c');
  });

  it('setRefreshCookie writes an HttpOnly, path-scoped cookie', () => {
    const cookie = vi.fn();
    setRefreshCookie({ cookie } as unknown as Response, 'tok');
    expect(cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'tok',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/api/auth' }),
    );
  });

  it('clearRefreshCookie clears the same path', () => {
    const clearCookie = vi.fn();
    clearRefreshCookie({ clearCookie } as unknown as Response);
    expect(clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE, { path: '/api/auth' });
  });
});

describe('AuthController cookie emission (F38)', () => {
  const session = { user: { id: 'u1', role: 'buyer' }, accessToken: 'acc', refreshToken: 'ref' };

  function controller() {
    const auth = {
      login: vi.fn(async () => ({ ...session })),
      logout: vi.fn(async () => ({ ok: true as const })),
      refresh: vi.fn(async () => ({ ...session })),
    };
    return { ctrl: new AuthController(auth as never), auth };
  }

  it('cookie-mode login sets the cookie and strips the token from the body', async () => {
    const { ctrl } = controller();
    const cookie = vi.fn();
    const res = { cookie } as unknown as Response;
    const out = await ctrl.login({ email: 'a', password: 'b' } as never, req({ 'x-auth-mode': 'cookie' }), res);
    expect(cookie).toHaveBeenCalledWith(REFRESH_COOKIE, 'ref', expect.objectContaining({ httpOnly: true }));
    expect(out.refreshToken).toBe('');
    expect(out.accessToken).toBe('acc');
  });

  it('body-mode login returns the token in the body and sets no cookie', async () => {
    const { ctrl } = controller();
    const cookie = vi.fn();
    const res = { cookie } as unknown as Response;
    const out = await ctrl.login({ email: 'a', password: 'b' } as never, req({}), res);
    expect(cookie).not.toHaveBeenCalled();
    expect(out.refreshToken).toBe('ref');
  });

  it('cookie-mode refresh reads the token from the cookie', async () => {
    const { ctrl, auth } = controller();
    const res = { cookie: vi.fn() } as unknown as Response;
    await ctrl.refresh({} as never, req({ 'x-auth-mode': 'cookie', cookie: `${REFRESH_COOKIE}=fromcookie` }), res);
    expect(auth.refresh).toHaveBeenCalledWith('fromcookie', expect.anything());
  });

  it('body-mode refresh reads the token from the body', async () => {
    const { ctrl, auth } = controller();
    const res = { cookie: vi.fn() } as unknown as Response;
    await ctrl.refresh({ refreshToken: 'frombody' } as never, req({}), res);
    expect(auth.refresh).toHaveBeenCalledWith('frombody', expect.anything());
  });

  it('cookie-mode logout clears the cookie', async () => {
    const { ctrl } = controller();
    const clearCookie = vi.fn();
    const res = { clearCookie } as unknown as Response;
    await ctrl.logout({} as never, req({ 'x-auth-mode': 'cookie', cookie: `${REFRESH_COOKIE}=x` }), res);
    expect(clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE, { path: '/api/auth' });
  });
});
