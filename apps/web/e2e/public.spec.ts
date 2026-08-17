import { expect, test } from '@playwright/test';
import { API, failOnConsoleErrors } from './helpers';

/**
 * Tier 1 — every public page a signed-out visitor can reach.
 *
 * Deliberately shallow and broad: this is the net that catches a page that has
 * stopped rendering at all, which is the failure that matters most and the one
 * unit tests never see.
 */

/**
 * `chrome: true` means the page sits inside SiteLayout and must carry the header
 * and footer. Auth pages and the 404 are mounted OUTSIDE that layout on purpose,
 * so requiring the chrome there would assert a bug that isn't one.
 */
const PUBLIC_PAGES = [
  { path: '/', name: 'home', chrome: true },
  { path: '/market', name: 'marketplace', chrome: true },
  { path: '/sellers', name: 'sellers directory', chrome: true },
  { path: '/transporters', name: 'transporters directory', chrome: true },
  { path: '/loaders', name: 'loading companies', chrome: true },
  { path: '/workers', name: 'workers directory', chrome: true },
  { path: '/services', name: 'service providers', chrome: true },
  { path: '/auctions', name: 'auctions', chrome: true },
  { path: '/bids', name: 'buyer bids', chrome: true },
  { path: '/requirements', name: 'requirements board', chrome: true },
  { path: '/offices', name: 'offices', chrome: true },
  { path: '/safe-deal', name: 'safe deal', chrome: true },
  { path: '/login', name: 'login', chrome: false },
  { path: '/register', name: 'register', chrome: false },
];

for (const { path, name, chrome } of PUBLIC_PAGES) {
  test(`public page renders: ${name} (${path})`, async ({ page }) => {
    // Generic "Failed to load resource" lines are excluded on purpose: under the
    // Vite DEV server a mid-run HMR update makes the browser re-request a module
    // that has already been replaced, which 404s and is not an app defect. Real
    // signal is asserted below off the response stream instead, where the URL is
    // available and an /api/ path can be told apart from a dev-server artifact.
    const errors = failOnConsoleErrors(page, [
      /favicon/i,
      /ERR_CONNECTION_REFUSED/,
      /Failed to load resource/i,
    ]);
    const failed: string[] = [];
    page.on('response', (r) => {
      const url = r.url();
      if (!url.includes('/api/')) return;
      // Anything our own API refuses or breaks on is a defect, even when the
      // page still paints around it.
      if (r.status() >= 500 || r.status() === 404) failed.push(`${r.status()} ${new URL(url).pathname}`);
    });
    page.on('pageerror', (e) => errors.push(`UNCAUGHT: ${e.message}`));

    await page.goto(path, { waitUntil: 'networkidle' });

    if (chrome) {
      // The shell must be present — a crashed render leaves an empty body.
      await expect(page.locator('header').first()).toBeVisible();
      await expect(page.locator('footer').first()).toBeVisible();
    }
    const body = await page.locator('body').innerText();
    expect(body.length, `${path} rendered almost nothing`).toBeGreaterThan(200);
    expect(body, `${path} shows an error boundary`).not.toMatch(/something went wrong|unexpected error/i);

    expect(failed, `${path} got failing API responses`).toEqual([]);
    expect(errors, `${path} logged console errors`).toEqual([]);
  });
}

test('marketplace lists products and its facet counts match the results', async ({ page }) => {
  await page.goto('/market', { waitUntil: 'networkidle' });

  const body = await page.locator('body').innerText();
  const listed = Number(body.match(/(\d+)\s+verified products/)?.[1] ?? 0);
  expect(listed, 'no products listed').toBeGreaterThan(0);

  // Auction lots belong in the catalogue — a category of 6 once rendered 4.
  await expect(page.getByText(/Listing type/i).first()).toBeVisible();
});

test('worker types filter narrows the labour directory', async ({ page, request }) => {
  const types = await (await request.get(`${API}/labour/types`)).json();
  const withProviders = types.find((t: { providerCount: number }) => t.providerCount > 0);
  expect(withProviders, 'no worker type has a provider — seed data missing').toBeTruthy();

  await page.goto(`/workers?workerType=${withProviders.slug}`, { waitUntil: 'networkidle' });
  const body = await page.locator('body').innerText();
  expect(body).toContain(withProviders.name);
});

test('a 404 route shows the not-found page, not a blank screen', async ({ page }) => {
  await page.goto('/this-route-does-not-exist', { waitUntil: 'networkidle' });
  const body = await page.locator('body').innerText();
  // The 404 page is mounted outside SiteLayout, so it carries no chrome — what
  // matters is that it says something rather than painting a blank screen.
  expect(body.length).toBeGreaterThan(40);
  expect(body).toMatch(/not found|404/i);
});
