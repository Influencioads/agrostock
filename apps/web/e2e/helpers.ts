import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

/**
 * …and one session per account ACROSS runs, on disk.
 *
 * /auth/login allows 10 per minute. The in-memory map above only covers a single
 * process, so re-running a spec, running web and admin projects back to back, or
 * anything else touching the API at the same time still walks into a 429 — which
 * surfaces as every test failing at login rather than as the rate limit it is.
 * The tokens are short-lived and the accounts are seeded demo accounts, so
 * caching them in the OS temp dir costs nothing and makes the suite re-runnable.
 */
const CACHE_FILE = join(tmpdir(), 'agrotraders-e2e', 'sessions.json');

/**
 * How much life a cached token must have LEFT to be worth reusing.
 *
 * Not a plain "cached less than N ago" TTL — that was the first attempt and it
 * shipped a real bug: a token cached 8 minutes ago is still young when a spec
 * picks it up, but a full suite run takes ~10 minutes, so by the last spec the
 * token is ~18 minutes old against a 15-minute JWT and every call 401s. Gating
 * on remaining lifetime instead means a token is only reused when it can outlive
 * the run that reuses it.
 *
 * The consequence is that a long full run logs in fresh (8 accounts, against a
 * 10/min limit — fine), while the rapid single-spec re-runs this cache actually
 * exists for keep hitting it.
 */
const MIN_TOKEN_LIFE_MS = 12 * 60_000;

type Session = { accessToken: string; user: unknown };

/** Milliseconds until a JWT's `exp`; 0 if it cannot be read. */
function msLeft(jwt: string): number {
  try {
    const { exp } = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    return typeof exp === 'number' ? exp * 1000 - Date.now() : 0;
  } catch {
    return 0;
  }
}

function readCache(): Record<string, { at: number; session: Session }> {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(email: string, session: Session) {
  try {
    const all = readCache();
    all[email] = { at: Date.now(), session };
    mkdirSync(join(tmpdir(), 'agrotraders-e2e'), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(all));
  } catch {
    // A cache that cannot be written is a slower suite, not a failing one.
  }
}

function session(request: APIRequestContext, email: string) {
  let cached = SESSIONS.get(email);
  if (!cached) {
    cached = (async () => {
      const disk = readCache()[email];
      if (disk && msLeft(disk.session.accessToken) > MIN_TOKEN_LIFE_MS) return disk.session;

      const res = await request.post(`${API}/auth/login`, {
        data: { email, password: DEMO.password },
      });
      expect(res.ok(), `login failed for ${email}: ${res.status()} ${await res.text()}`).toBeTruthy();
      const body = await res.json();
      expect(body.accessToken, `no token for ${email}`).toBeTruthy();
      writeCache(email, body);
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
 * The signed-in account, straight out of the cached login response.
 *
 * Deliberately NOT a `GET /auth/me` call. `/auth/me` is throttled at 30/min and
 * the app itself calls it on every full page load, so a spec that walks 16
 * console sections as 16 navigations has already spent the bucket before its own
 * identity check runs — which surfaces as a 429 that looks like an auth bug. The
 * login response carries the same `{ id, name, role, roles }`, so asking again
 * buys nothing.
 */
export async function currentUser(
  request: APIRequestContext,
  email: string,
): Promise<{ id: string; name: string; role: string; roles: string[] }> {
  return (await session(request, email)).user as {
    id: string;
    name: string;
    role: string;
    roles: string[];
  };
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
  // `commit`, not the default `load`: this navigation exists only to get an
  // origin to write localStorage on — the test navigates again straight after.
  // Waiting for `load` here waits for the whole dev module graph (~95 requests)
  // AND the render-blocking Google Fonts stylesheet in index.html, so a slow
  // font CDN or a Vite HMR reload mid-boot hangs sign-in for the full test
  // timeout on a page nothing asserts against.
  await page.goto('/', { waitUntil: 'commit' });
  await page.evaluate(
    ([t, u]) => {
      localStorage.setItem('token', t as string);
      localStorage.setItem('user', JSON.stringify(u));
    },
    [accessToken, user] as const,
  );
}

/**
 * Navigate and wait for the page to actually paint.
 *
 * NOT `waitUntil: 'networkidle'`. Both apps open a Socket.IO connection once the
 * session settles, and a live socket means the network never goes idle — so
 * `networkidle` burns the full timeout and reports a hang on a page that
 * rendered fine. It fails on whichever route happens to come after the socket
 * connects, which makes it look like a bug in that route.
 *
 * Waiting for `main` to be visible plus a short settle covers what the
 * networkidle wait was actually there for: give the page's queries a moment to
 * resolve before asserting on their output.
 */
export async function visit(page: Page, path: string, settleMs = 1200) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Wait on painted TEXT rather than on `main`: the auth pages and the 404 are
  // mounted outside SiteLayout and carry neither `main` nor `footer`, so keying
  // off those elements times out on pages that rendered perfectly well.
  await page
    .waitForFunction(() => (document.body.innerText ?? '').trim().length > 40, null, {
      timeout: 15_000,
    })
    .catch(() => {
      // Let the spec's own assertions report an empty page — that is a better
      // failure message than a timeout from inside a navigation helper.
    });
  await page.waitForTimeout(settleMs);
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
