import { expect, type Page, type APIRequestContext } from '@playwright/test';

export const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:3100/api';

/** Seeded demo accounts. All share the demo password. */
export const DEMO = {
  password: 'password123',
  buyer: 'buyer@agrotraders.org',
  seller: 'seller@agrotraders.org',
  transporter: 'transporter@agrotraders.org',
  loaderco: 'loaderco@agrotraders.org',
  workerco: 'workerco@agrotraders.org',
  worker: 'worker2@agrotraders.org',
  packer: 'packer@agrostock.live',
  admin: 'admin@agrotraders.org',
} as const;

/**
 * One session per account for the whole run.
 *
 * Without this the suite logs in ~30 times in a burst and the auth throttler
 * (correctly) starts answering 429, which looks like a cascade of unrelated
 * failures. A real user signs in once; so does the suite.
 */
const SESSIONS = new Map<string, Promise<{ accessToken: string; user: unknown }>>();

function session(request: APIRequestContext, email: string) {
  let cached = SESSIONS.get(email);
  if (!cached) {
    cached = (async () => {
      const res = await request.post(`${API}/auth/login`, {
        data: { email, password: DEMO.password },
      });
      expect(res.ok(), `login failed for ${email}: ${res.status()} ${await res.text()}`).toBeTruthy();
      const body = await res.json();
      expect(body.accessToken, `no token for ${email}`).toBeTruthy();
      return body;
    })();
    SESSIONS.set(email, cached);
    // A failed login must not poison every later spec with the same rejection.
    cached.catch(() => SESSIONS.delete(email));
  }
  return cached;
}

/** Log in through the API and return the token — far faster than driving the form. */
export async function token(request: APIRequestContext, email: string): Promise<string> {
  return (await session(request, email)).accessToken;
}

/**
 * Sign the BROWSER in without the login form.
 *
 * The app reads `token` and `user` out of localStorage on boot, so seeding them
 * before the first navigation is equivalent to a completed login and keeps each
 * spec testing its own subject rather than re-testing auth.
 */
export async function signIn(page: Page, request: APIRequestContext, email: string) {
  const { accessToken, user } = await session(request, email);
  await page.goto('/');
  await page.evaluate(
    ([t, u]) => {
      localStorage.setItem('token', t as string);
      localStorage.setItem('user', JSON.stringify(u));
    },
    [accessToken, user] as const,
  );
}

/** Fail the test on any console error the page logs — not just on assertions. */
export function failOnConsoleErrors(page: Page, ignore: RegExp[] = []) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Network noise from a backgrounded request is not a page defect.
    if (ignore.some((re) => re.test(text))) return;
    errors.push(text);
  });
  return errors;
}
