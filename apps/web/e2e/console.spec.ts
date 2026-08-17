import { expect, test } from '@playwright/test';
import { DEMO, signIn } from './helpers';

/**
 * Sweep every console section of every role.
 *
 * 43 sections across 8 roles is far more surface than anyone clicks by hand
 * before a release, and a section that throws renders an empty panel rather than
 * an obvious crash — so this asserts each one actually paints and logs nothing.
 */

const SECTIONS: Record<string, string[]> = {
  [DEMO.buyer]: ['dash', 'orders', 'bids', 'auctions', 'saved', 'transport', 'wallet', 'invoices', 'reviews', 'hires', 'verify'],
  [DEMO.seller]: ['dash', 'inventory', 'orders', 'offers', 'auctions', 'bids', 'ads', 'analytics', 'payouts', 'wallet', 'invoices', 'reviews', 'hires', 'verify'],
  [DEMO.transporter]: ['dash', 'loads', 'quotes', 'vehicles', 'drivers', 'routes', 'tracking', 'earnings', 'wallet', 'invoices', 'reviews', 'verify'],
  [DEMO.loaderco]: ['dash', 'jobrequests', 'activejobs', 'workers', 'teams', 'labour', 'availability', 'pricing', 'attendance', 'earnings', 'wallet', 'invoices', 'reviews', 'verify'],
  [DEMO.workerco]: ['dash', 'jobrequests', 'activejobs', 'workers', 'teams', 'labour', 'availability', 'pricing', 'attendance', 'earnings', 'wallet', 'invoices', 'reviews', 'verify'],
  [DEMO.worker]: ['dash', 'jobs', 'labour', 'earnings', 'wallet', 'attendance', 'reviews', 'invoices', 'verify'],
  [DEMO.packer]: ['dash', 'enquiries', 'serviceProfile', 'invoices', 'wallet', 'reviews', 'verify'],
};

for (const [email, sections] of Object.entries(SECTIONS)) {
  const role = email.split('@')[0];

  test(`console sections render for ${role}`, async ({ page, request }) => {
    await signIn(page, request, email);

    const broken: string[] = [];
    const noisy: string[] = [];
    const server: string[] = [];

    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (/favicon|ERR_CONNECTION_REFUSED|Failed to load resource/i.test(text)) return;
      noisy.push(text.slice(0, 180));
    });
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() >= 500) server.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });
    page.on('pageerror', (e) => noisy.push(`UNCAUGHT: ${e.message.slice(0, 180)}`));

    for (const section of sections) {
      await page.goto(`/console/${section}`, { waitUntil: 'networkidle' });
      const main = page.locator('main').first();
      const text = (await main.count()) ? await main.innerText() : await page.locator('body').innerText();

      // An exploded section leaves the panel blank while the shell still paints,
      // which is exactly the failure a smoke test has to catch.
      if (text.trim().length < 20) broken.push(`${section}: rendered ${text.trim().length} chars`);
      if (/something went wrong|unexpected error/i.test(text)) broken.push(`${section}: error boundary`);
    }

    expect(broken, `${role}: blank or crashed sections`).toEqual([]);
    expect(server, `${role}: 5xx from the API`).toEqual([]);
    expect(noisy, `${role}: console errors`).toEqual([]);
  });
}

test('switching to Russian translates the shell and keeps the page working', async ({ page }) => {
  await page.goto('/workers', { waitUntil: 'networkidle' });

  const select = page.locator('select').filter({ has: page.locator('option[value="ru"]') }).first();
  await select.selectOption('ru');
  await page.waitForTimeout(700);

  const body = await page.locator('body').innerText();
  // Cyrillic must actually appear — a missing bundle silently falls back to EN.
  expect(body, 'no Russian text after switching locale').toMatch(/[А-Яа-я]/);
  // And the labour keys we added must not render as raw key paths.
  expect(body, 'untranslated key leaked into the UI').not.toMatch(/labour\.[a-zA-Z]+/);
  expect(body).not.toMatch(/enums:[a-zA-Z]+/);
});
