import { expect, test, type Page } from '@playwright/test';
import { DEMO, signIn } from './helpers';

/**
 * Every page in the admin console.
 *
 * Runs under the `admin` project (baseURL :5174). The admin app is the surface
 * nobody clicks through before a release — it has 30+ routes, each hitting its
 * own /admin endpoint, and a section that 500s still paints the shell around an
 * empty panel. This walks all of them signed in as the seeded admin.
 *
 * One test per page on purpose: a single walk-them-all test loses every page
 * after the first hang, which is exactly when you most want the rest of the
 * report.
 */

/** Every route mounted in apps/admin/src/App.tsx, in nav order. */
const ADMIN_PAGES = [
  '/',
  '/users',
  '/role-requests',
  '/team',
  '/kyc',
  '/categories',
  '/markets',
  '/products',
  '/ads',
  '/auctions',
  '/bids',
  '/orders',
  '/invoices',
  '/safedeal',
  '/disputes',
  '/reviews',
  '/support',
  '/community',
  '/transport',
  '/services',
  '/service-taxonomy',
  '/loaders',
  '/cms',
  '/email-templates',
  '/offices',
  '/branding',
  '/payments',
  '/plans',
  '/subscriptions',
  '/gateways',
  '/reports',
  '/audit',
  '/profile',
];

/** Dev-server and browser noise that is not an app defect. */
const NOISE =
  /favicon|ERR_CONNECTION_REFUSED|Failed to load resource|Download the React DevTools|firebase|messaging\/unsupported|ServiceWorker|Notification|websocket|socket\.io/i;

/**
 * `networkidle` is not usable here — the admin app holds a chat socket open, so
 * on some pages the network never goes quiet and the wait burns the whole
 * timeout. Load, then give the page's own queries a bounded moment to paint.
 */
async function visit(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(1200);
}

for (const path of ADMIN_PAGES) {
  test(`admin page renders: ${path}`, async ({ page, request }) => {
    await signIn(page, request, DEMO.admin);

    const consoleErrors: string[] = [];
    const serverErrors: string[] = [];

    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (NOISE.test(text)) return;
      consoleErrors.push(text.slice(0, 220));
    });
    page.on('pageerror', (e) => consoleErrors.push(`UNCAUGHT ${e.message.slice(0, 220)}`));
    page.on('response', (r) => {
      const url = r.url();
      if (!url.includes('/api/')) return;
      // 5xx is always ours. A 404 on an /admin/ path means the UI calls an
      // endpoint the API does not expose — a wiring bug that reads as an empty
      // table rather than an error.
      if (r.status() >= 500 || (r.status() === 404 && url.includes('/admin/'))) {
        serverErrors.push(`${r.status()} ${new URL(url).pathname}`);
      }
    });

    await visit(page, path);

    const text = await page.locator('main').first().innerText();

    expect(text.trim().length, `${path} rendered almost nothing`).toBeGreaterThan(20);
    expect(text, `${path} shows an error boundary`).not.toMatch(
      /something went wrong|unexpected error/i,
    );
    // A raw i18n key on screen is a missing translation, which reads as a broken
    // page to anyone who is not the developer.
    expect(text, `${path} leaked a raw i18n key`).not.toMatch(/\b[a-z]+\.[a-zA-Z]+\.[a-zA-Z]{3,}\b/);
    expect(serverErrors, `${path} got failing API responses`).toEqual([]);
    expect(consoleErrors, `${path} logged console errors`).toEqual([]);
  });
}

test('a non-admin cannot reach the admin app', async ({ page, request }) => {
  await signIn(page, request, DEMO.buyer);
  await page.goto('/users', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const body = await page.locator('body').innerText();
  // Either bounced to login or told no — what must NOT happen is the user table
  // painting for a buyer.
  expect(
    /sign in|log in|not authorised|not authorized|forbidden|no access|permission/i.test(body) ||
      page.url().includes('/login'),
    `a buyer reached the admin app: ${body.slice(0, 200)}`,
  ).toBeTruthy();
});
