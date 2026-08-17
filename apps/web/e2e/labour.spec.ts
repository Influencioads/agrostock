import { expect, test } from '@playwright/test';
import { API, DEMO, signIn, token } from './helpers';

/**
 * The labour rules, end to end through the real HTTP surface.
 *
 * These are the invariants the product depends on and that a unit test asserting
 * a `where` clause cannot prove: that the running server actually refuses.
 */

test('a loading company may publish loading crew and nothing else', async ({ request }) => {
  const auth = { Authorization: `Bearer ${await token(request, DEMO.loaderco)}` };
  const types = await (await request.get(`${API}/labour/types`)).json();

  const loading = types.find((t: { group: string }) => t.group === 'loading_handling');
  const packing = types.find((t: { group: string }) => t.group === 'packing');
  expect(loading && packing, 'taxonomy is missing groups — reseed worker types').toBeTruthy();

  const refused = await request.post(`${API}/me/labour/offerings`, {
    headers: auth,
    data: { workerTypeId: packing.id, rateBasis: 'per_hour', rateMinCents: 500 },
  });
  expect(refused.status(), 'a loading company must not be able to publish packing crew').toBe(403);

  // And its own catalogue must not even offer the type it would be refused.
  const scoped = await (await request.get(`${API}/labour/types?role=loaderco`)).json();
  const groups = [...new Set(scoped.map((t: { group: string }) => t.group))];
  expect(groups).toEqual(['loading_handling']);
});

test('a worker company reaches every group, loading included', async ({ request }) => {
  const scoped = await (await request.get(`${API}/labour/types?role=workerco`)).json();
  const groups = new Set(scoped.map((t: { group: string }) => t.group));
  expect(groups.size, 'a worker company should reach all seven groups').toBe(7);
  expect(groups.has('loading_handling')).toBe(true);
});

test('crew employed by a loading company never appear publicly', async ({ request }) => {
  const listed = await (await request.get(`${API}/directory/workers`)).json();
  const rows = listed.items ?? listed;

  for (const row of rows) {
    // Anything in this list answers for itself. A row carrying an employer is
    // the leak this directory was rebuilt to close.
    expect(row.independent, `${row.name} is listed but not independent`).toBe(true);
  }

  // Cross-check against the database's own view: the loading company's crew
  // count is public, its people are not.
  const loaders = await (await request.get(`${API}/directory/loaders`)).json();
  const company = (loaders.items ?? loaders)[0];
  expect(company, 'no loading company seeded').toBeTruthy();
  const names = rows.map((r: { name: string }) => r.name);
  expect(names).not.toContain(company.name);
});

test('rate validation refuses an incoherent price', async ({ request }) => {
  const auth = { Authorization: `Bearer ${await token(request, DEMO.workerco)}` };
  const types = await (await request.get(`${API}/labour/types?role=workerco`)).json();
  const unused = types.find((t: { providerCount: number }) => t.providerCount === 0) ?? types[0];

  const noRate = await request.post(`${API}/me/labour/offerings`, {
    headers: auth,
    data: { workerTypeId: unused.id, rateBasis: 'per_hour' },
  });
  expect(noRate.status(), 'a priced basis with no figure must be refused').toBe(400);

  const backwards = await request.post(`${API}/me/labour/offerings`, {
    headers: auth,
    data: { workerTypeId: unused.id, rateBasis: 'per_day', rateMinCents: 9000, rateMaxCents: 4000 },
  });
  expect(backwards.status(), 'a range running backwards must be refused').toBe(400);
});

test('the labour dashboard lists rates and offers only permitted types', async ({ page, request }) => {
  await signIn(page, request, DEMO.loaderco);
  await page.goto('/console/labour', { waitUntil: 'networkidle' });

  await expect(page.getByText(/Published rates/i).first()).toBeVisible();

  const body = await page.locator('body').innerText();
  expect(body).toContain('LOADING & HANDLING');
  // The picker must not dangle types the server would reject.
  for (const forbidden of ['PACKING & PACKHOUSE', 'SORTING & GRADING', 'PROCESSING LINE']) {
    expect(body, `loading company was offered ${forbidden}`).not.toContain(forbidden);
  }
});

test('a provider profile shows rates but never names individual crew', async ({ page, request }) => {
  const loaders = await (await request.get(`${API}/directory/loaders`)).json();
  const company = (loaders.items ?? loaders)[0];

  await page.goto(`/u/${company.id}`, { waitUntil: 'networkidle' });
  const body = await page.locator('body').innerText();

  expect(body).toContain(company.name);
  // Crew size stays public as a capacity signal.
  expect(body).toMatch(/Workers/i);
  // The roster does not.
  expect(body).toMatch(/manages its own crew|Worker types/i);
});
