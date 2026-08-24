import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { API, DEMO, signIn, token } from './helpers';

/**
 * What the admin console DOES, not what it draws.
 *
 * `admin.pages.spec.ts` already proves every route paints. This file drives the
 * moderation controls themselves and then checks the effect somewhere the admin
 * cannot fake it — the public API, the target account's own session, the audit
 * trail. A console whose Approve button paints but does not publish is exactly
 * the failure a render test cannot see.
 *
 * Rules the suite follows so it can be re-run against the same seeded database:
 *  - everything created is deleted (or restored) in the same test;
 *  - the one throwaway account is a FIXTURE reused across runs and reset to a
 *    known state on entry, so runs do not accumulate users;
 *  - nothing seeded is left in a different state than it was found in.
 */

/* ────────────────────────────── shared helpers ───────────────────────────── */

/** Bearer headers for an account, reusing the suite-wide session cache. */
async function auth(request: APIRequestContext, email: string = DEMO.admin) {
  return { Authorization: `Bearer ${await token(request, email)}` };
}

/**
 * Sign in and open an admin route.
 *
 * `lang` is pinned because every selector below is an English label — the
 * console ships 11 locales and the language detector reads the browser, so a
 * runner in another region would otherwise fail on translated buttons.
 *
 * No `networkidle`: the console holds a chat socket open and the network never
 * goes quiet. Wait for the shell, then for whatever the test actually needs.
 */
async function openAdmin(page: Page, request: APIRequestContext, path: string, email: string = DEMO.admin) {
  await signIn(page, request, email);
  await page.evaluate(() => localStorage.setItem('lang', 'en'));
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 });
}

/** Wait for the console's own request to land, instead of guessing with a sleep. */
function apiCall(page: Page, method: string, fragment: string) {
  return page.waitForResponse(
    (r) => r.request().method() === method && r.url().includes(fragment),
    { timeout: 15_000 },
  );
}

/* ─────────────────────────── the fixture account ─────────────────────────── */

/**
 * One reusable throwaway account instead of a fresh one per run.
 *
 * It cannot be deleted afterwards: merely opening the verification page creates
 * a KycRecord, and the API refuses to hard-delete any account that has one (see
 * the `kyc` describe below — that refusal is itself a reported bug). Reusing a
 * single account and resetting it on entry keeps the user table from growing by
 * one row per run.
 */
const FIXTURE_EMAIL = 'e2e-admin-actions@agrotraders.test';
const FIXTURE_NAME = 'E2E Admin Actions Fixture';

async function findUser(request: APIRequestContext, email: string) {
  const res = await request.get(`${API}/admin/users`, {
    headers: await auth(request),
    params: { search: email },
  });
  expect(res.ok(), `admin user search failed: ${res.status()}`).toBeTruthy();
  const rows = (await res.json()) as { id: string; email: string }[];
  return rows.find((u) => u.email === email) ?? null;
}

/** Create-or-reset the fixture account and return its id. Safe to call repeatedly. */
async function fixtureUser(request: APIRequestContext): Promise<string> {
  const headers = await auth(request);
  let user = await findUser(request, FIXTURE_EMAIL);
  if (!user) {
    const res = await request.post(`${API}/admin/users`, {
      headers,
      data: { email: FIXTURE_EMAIL, name: FIXTURE_NAME, password: DEMO.password, role: 'buyer' },
    });
    expect(res.ok(), `could not provision the fixture account: ${res.status()} ${await res.text()}`).toBeTruthy();
    user = (await res.json()) as { id: string; email: string };
  }
  // Reset to the state every test here expects to start from.
  await request.patch(`${API}/admin/users/${user.id}`, { headers, data: { active: true, name: FIXTURE_NAME } });
  await request.patch(`${API}/admin/users/${user.id}/kyc`, { headers, data: { status: 'pending' } });
  return user.id;
}

/**
 * Put the fixture account in the pending KYC queue and return its record id.
 * Reading `/me/kyc` is what creates the record — the queue has no admin-side
 * "create submission" door.
 */
async function fixtureKyc(request: APIRequestContext) {
  const userId = await fixtureUser(request);
  const headers = await auth(request);
  const own = await request.get(`${API}/me/kyc`, { headers: await auth(request, FIXTURE_EMAIL) });
  expect(own.ok(), `the fixture account could not open its own KYC record: ${own.status()}`).toBeTruthy();
  // Uploading re-opens review; we only read, so force the record back to pending.
  await request.patch(`${API}/admin/users/${userId}/kyc`, { headers, data: { status: 'pending' } });

  const queue = (await (
    await request.get(`${API}/admin/kyc`, { headers, params: { status: 'pending' } })
  ).json()) as { id: string; userId: string }[];
  const record = queue.find((k) => k.userId === userId);
  expect(record, 'the fixture account is not in the pending KYC queue').toBeTruthy();
  return { userId, recordId: record!.id };
}

/* ───────────────────────────── listing helpers ───────────────────────────── */

/** A seller-owned listing, born `pending` exactly like a real submission. */
async function createListing(request: APIRequestContext, name: string) {
  const sellerAuth = await auth(request, DEMO.seller);
  const categories = (await (await request.get(`${API}/categories`, { params: { depth: '1' } })).json()) as {
    id: string;
  }[];
  expect(categories.length, 'no categories seeded').toBeGreaterThan(0);

  const res = await request.post(`${API}/products`, {
    headers: sellerAuth,
    data: {
      name,
      categoryId: categories[0].id,
      price: '$1',
      unit: 'MT',
      images: ['/uploads/e2e-placeholder.webp'],
    },
  });
  expect(res.ok(), `could not create the probe listing: ${res.status()} ${await res.text()}`).toBeTruthy();
  const product = (await res.json()) as { id: string; slug: string; status: string };
  expect(product.status, 'a new listing must start in moderation').toBe('pending');
  return product;
}

async function deleteListing(request: APIRequestContext, id: string) {
  await request.delete(`${API}/products/${id}`, { headers: await auth(request, DEMO.seller) }).catch(() => {});
}

/** Listings the public catalogue returns under this exact name. */
async function publicListings(request: APIRequestContext, name: string) {
  const body = (await (await request.get(`${API}/products`, { params: { search: name } })).json()) as {
    items?: { name: string; status: string }[];
  };
  return (body.items ?? []).filter((p) => p.name === name);
}

/* ═══════════════════════════════════ users ═══════════════════════════════ */

test.describe('users', () => {
  test('search narrows the table and the role tabs actually filter', async ({ page, request }) => {
    await openAdmin(page, request, '/users');

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const everyone = await rows.count();
    expect(everyone, 'the seeded user table is suspiciously small').toBeGreaterThan(5);

    const search = page.getByPlaceholder('Search name or email');
    await search.fill(DEMO.buyer);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(DEMO.buyer);

    await search.fill('');
    await expect(rows).toHaveCount(everyone);

    // The tab must remove non-sellers, not merely highlight itself.
    await page.getByRole('button', { name: 'Seller', exact: true }).click();
    const sellers = await rows.count();
    expect(sellers, 'the Seller tab kept every account').toBeLessThan(everyone);
    expect(sellers).toBeGreaterThan(0);
    await expect(page.locator('tbody')).not.toContainText(DEMO.buyer);
  });

  test('suspending an account from the drawer kills its live session; reinstating restores it', async ({
    page,
    request,
  }) => {
    const headers = await auth(request);
    const userId = await fixtureUser(request);

    // A token minted while the account is live. Deactivation has to invalidate
    // THIS session too — blocking only the next login leaves a suspended user
    // signed in for as long as their access token lasts.
    const liveSession = { Authorization: `Bearer ${await token(request, FIXTURE_EMAIL)}` };
    expect((await request.get(`${API}/me/kyc`, { headers: liveSession })).status()).toBe(200);

    await openAdmin(page, request, '/users');
    await page.getByPlaceholder('Search name or email').fill(FIXTURE_EMAIL);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByRole('heading', { name: 'Manage user' })).toBeVisible();

    page.once('dialog', (d) => d.accept());
    const suspended = apiCall(page, 'PATCH', `/admin/users/${userId}`);
    await page.getByRole('button', { name: 'Deactivate account' }).click();
    await suspended;
    await expect(page.getByRole('button', { name: 'Reactivate account' })).toBeVisible();

    const suspendedUser = await (await request.get(`${API}/admin/users/${userId}`, { headers })).json();
    expect(suspendedUser.active, 'the account is still active after Deactivate').toBe(false);
    expect(
      (await request.get(`${API}/me/kyc`, { headers: liveSession })).status(),
      'a suspended account kept a working session',
    ).toBe(401);
    expect(
      (await request.post(`${API}/auth/login`, { data: { email: FIXTURE_EMAIL, password: DEMO.password } })).status(),
      'a suspended account could still log in',
    ).toBe(401);

    const restored = apiCall(page, 'PATCH', `/admin/users/${userId}`);
    await page.getByRole('button', { name: 'Reactivate account' }).click();
    await restored;

    const back = await (await request.get(`${API}/admin/users/${userId}`, { headers })).json();
    expect(back.active, 'Reactivate did not restore the account').toBe(true);
    expect((await request.get(`${API}/me/kyc`, { headers: liveSession })).status()).toBe(200);
  });

  test('the drawer KYC override changes the account and is written to the audit trail', async ({ page, request }) => {
    const headers = await auth(request);
    const userId = await fixtureUser(request); // resets kycStatus to pending

    await openAdmin(page, request, '/users');
    await page.getByPlaceholder('Search name or email').fill(FIXTURE_EMAIL);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByRole('heading', { name: 'Manage user' })).toBeVisible();

    const overridden = apiCall(page, 'PATCH', `/admin/users/${userId}/kyc`);
    await page.getByRole('button', { name: 'Verified', exact: true }).click();
    await overridden;

    const after = await (await request.get(`${API}/admin/users/${userId}`, { headers })).json();
    expect(after.kycStatus, 'the KYC override did not reach the account').toBe('verified');

    // An override this powerful must be attributable to a named admin.
    const audit = (await (
      await request.get(`${API}/admin/audit`, { headers, params: { action: 'user.kyc_verified', take: '50' } })
    ).json()) as { rows: { entityId: string; actor?: { email?: string } }[] };
    const entry = audit.rows.find((r) => r.entityId === userId);
    expect(entry, 'the KYC override left no audit entry').toBeTruthy();
    expect(entry!.actor?.email, 'the audit entry names the wrong actor').toBe(DEMO.admin);

    await request.patch(`${API}/admin/users/${userId}/kyc`, { headers, data: { status: 'pending' } });
  });
});

/* ════════════════════════════════ KYC queue ══════════════════════════════ */

test.describe('kyc', () => {
  test('approving a submission verifies the account and clears it from the queue', async ({ page, request }) => {
    const headers = await auth(request);
    const { userId, recordId } = await fixtureKyc(request);

    await openAdmin(page, request, '/kyc');
    // Each submission is a Card; `shadow-card` is the only stable handle the
    // component gives, and the fixture name is unique in the queue.
    const card = page.locator('div.shadow-card').filter({ hasText: FIXTURE_NAME });
    await expect(card).toHaveCount(1);

    const decided = apiCall(page, 'PATCH', `/admin/kyc/${recordId}`);
    await card.getByRole('button', { name: 'Approve' }).click();
    await decided;

    // The pending filter is still selected, so a verified submission must go.
    await expect(page.locator('div.shadow-card').filter({ hasText: FIXTURE_NAME })).toHaveCount(0);

    const user = await (await request.get(`${API}/admin/users/${userId}`, { headers })).json();
    expect(user.kycStatus, 'approving the submission did not verify the account').toBe('verified');

    await request.patch(`${API}/admin/users/${userId}/kyc`, { headers, data: { status: 'pending' } });
  });

  test('rejecting a submission records the reason and marks the account rejected', async ({ page, request }) => {
    const headers = await auth(request);
    const { userId, recordId } = await fixtureKyc(request);
    const reason = `e2e rejection ${Date.now()}`;

    await openAdmin(page, request, '/kyc');
    const card = page.locator('div.shadow-card').filter({ hasText: FIXTURE_NAME });
    await expect(card).toHaveCount(1);

    await card.getByRole('button', { name: 'Reject' }).click();
    await card.getByPlaceholder('Rejection reason').fill(reason);
    const decided = apiCall(page, 'PATCH', `/admin/kyc/${recordId}`);
    await card.getByRole('button', { name: 'Confirm reject' }).click();
    await decided;

    const user = await (await request.get(`${API}/admin/users/${userId}`, { headers })).json();
    expect(user.kycStatus, 'rejecting the submission did not reject the account').toBe('rejected');

    const record = await (await request.get(`${API}/admin/kyc/${recordId}`, { headers })).json();
    expect(record.status).toBe('rejected');
    expect(record.notes, 'the rejection reason was dropped').toBe(reason);

    await request.patch(`${API}/admin/users/${userId}/kyc`, { headers, data: { status: 'pending' } });
  });

  test('an account whose only record is a KYC submission can still be deleted', async ({ request }) => {
    // BUG (reported): `AdminService.deleteUser` enumerates exactly which relations
    // block a hard delete — products, orders, invoices, tickets, wallet movement —
    // and KycRecord is deliberately NOT among them, so a spam signup is meant to
    // stay deletable. But `KycRecord.user` has no cascade rule, the manual
    // satellite-row cleanup does not include it, and the P2003 backstop turns the
    // delete into a 409 that claims the account "has trade, financial or support
    // records". Simply OPENING the verification page creates that record, so any
    // signup that looked at it becomes permanently undeletable.
    const headers = await auth(request);
    const email = `e2e-kyc-delete-${Date.now()}@agrotraders.test`;
    const created = await request.post(`${API}/admin/users`, {
      headers,
      data: { email, name: 'E2E KYC Delete Probe', password: DEMO.password, role: 'buyer' },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = (await created.json()) as { id: string };

    try {
      await request.get(`${API}/me/kyc`, { headers: await auth(request, email) });

      const res = await request.delete(`${API}/admin/users/${id}`, { headers });
      expect(
        res.status(),
        `a clean account with only a KYC record was refused deletion: ${await res.text()}`,
      ).toBe(200);
      expect(await findUser(request, email)).toBeNull();
    } finally {
      // Best effort — while the bug stands this leaves a deactivated probe row.
      if (await findUser(request, email)) {
        await request.patch(`${API}/admin/users/${id}`, { headers, data: { active: false } });
      }
    }
  });
});

/* ════════════════════════════ product moderation ═════════════════════════ */

test.describe('products', () => {
  test('approving a pending listing publishes it to the public catalogue', async ({ page, request }) => {
    const name = `E2E Approve Probe ${Date.now()}`;
    const product = await createListing(request, name);

    try {
      expect(await publicListings(request, name), 'a pending listing is already public').toHaveLength(0);

      await openAdmin(page, request, '/products');
      await page.getByPlaceholder('Search products').fill(name);
      const row = page.getByRole('row').filter({ hasText: name });
      await expect(row).toHaveCount(1);

      const approved = apiCall(page, 'PATCH', `/admin/products/${product.id}/approve`);
      await row.getByRole('button', { name: 'Approve' }).click();
      await approved;

      // Approved listings leave the pending queue the page is filtered to...
      await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
      // ...and land on the public site.
      await expect
        .poll(async () => (await publicListings(request, name)).map((p) => p.status), {
          message: 'the approved listing never reached the public catalogue',
        })
        .toEqual(['live']);
      expect((await request.get(`${API}/products/${product.slug}`)).status()).toBe(200);
    } finally {
      await deleteListing(request, product.id);
    }
  });

  test('rejecting a live listing pulls it back off the public catalogue', async ({ page, request }) => {
    const name = `E2E Reject Probe ${Date.now()}`;
    const product = await createListing(request, name);
    const headers = await auth(request);

    try {
      await request.patch(`${API}/admin/products/${product.id}/approve`, { headers });
      await expect
        .poll(async () => (await publicListings(request, name)).length)
        .toBe(1);

      await openAdmin(page, request, '/products');
      await page.getByRole('button', { name: 'live', exact: true }).click();
      await page.getByPlaceholder('Search products').fill(name);
      const row = page.getByRole('row').filter({ hasText: name });
      await expect(row).toHaveCount(1);

      await row.getByRole('button', { name: 'Reject' }).click();
      await row.getByPlaceholder('Reason').fill('e2e takedown');
      const rejected = apiCall(page, 'PATCH', `/admin/products/${product.id}/reject`);
      await row.getByRole('button', { name: 'Confirm' }).click();
      await rejected;

      await expect
        .poll(async () => (await publicListings(request, name)).length, {
          message: 'a rejected listing is still browsable',
        })
        .toBe(0);
      // The detail route must close too — a hidden card with a live permalink is
      // not moderated, it is just harder to find.
      expect(
        (await request.get(`${API}/products/${product.slug}`)).status(),
        'the rejected listing still resolves by slug',
      ).toBe(404);

      const moderated = (await (
        await request.get(`${API}/admin/products/all`, { headers, params: { search: name } })
      ).json()) as { id: string; status: string; rejectionReason?: string }[];
      expect(moderated.find((p) => p.id === product.id)?.status).toBe('rejected');
      expect(moderated.find((p) => p.id === product.id)?.rejectionReason).toBe('e2e takedown');
    } finally {
      await deleteListing(request, product.id);
    }
  });
});

/* ═══════════════════════════════ taxonomies ══════════════════════════════ */

test.describe('taxonomy', () => {
  test('a category can be created, renamed and deleted from the console', async ({ page, request }) => {
    const headers = await auth(request);
    const name = `E2E Category ${Date.now()}`;
    const renamed = `${name} renamed`;
    const publicNames = async () =>
      ((await (await request.get(`${API}/categories`, { params: { depth: '1' } })).json()) as { name: string }[]).map(
        (c) => c.name,
      );

    await openAdmin(page, request, '/categories');
    await page.getByRole('button', { name: 'Add category' }).click();
    const create = page.getByRole('dialog');
    await create.getByPlaceholder('e.g. Fruits').fill(name);
    const created = apiCall(page, 'POST', '/admin/categories');
    await create.getByRole('button', { name: 'Save' }).click();
    const id = ((await (await created).json()) as { id: string }).id;

    try {
      await expect.poll(publicNames, { message: 'the new category never reached the public taxonomy' }).toContain(name);

      // `shadow-card` is the Card wrapper; the generated name makes it unique.
      const card = page.locator('div.shadow-card').filter({ hasText: name });
      await expect(card).toHaveCount(1);
      await card.getByRole('button', { name: 'Edit' }).click();
      const edit = page.getByRole('dialog');
      await edit.getByPlaceholder('e.g. Fruits').fill(renamed);
      const saved = apiCall(page, 'PATCH', `/admin/categories/${id}`);
      await edit.getByRole('button', { name: 'Save' }).click();
      await saved;

      await expect.poll(publicNames, { message: 'the rename never reached the public taxonomy' }).toContain(renamed);

      page.once('dialog', (d) => d.accept());
      const removed = apiCall(page, 'DELETE', `/admin/categories/${id}`);
      await page.locator('div.shadow-card').filter({ hasText: renamed }).getByRole('button', { name: 'Delete' }).click();
      await removed;

      await expect
        .poll(publicNames, { message: 'the deleted category is still public' })
        .not.toContain(renamed);
    } finally {
      await request.delete(`${API}/admin/categories/${id}`, { headers }).catch(() => {});
    }
  });

  test('a market can be created, renamed and hidden from the console', async ({ page, request }) => {
    const headers = await auth(request);
    const name = `E2E Market ${Date.now()}`;
    const renamed = `${name} renamed`;
    const publicNames = async () =>
      ((await (await request.get(`${API}/markets`)).json()) as { name: string }[]).map((m) => m.name);

    await openAdmin(page, request, '/markets');
    await page.getByPlaceholder('Azadpur Mandi').fill(name);
    await page.getByLabel('Country').selectOption('India');
    const created = apiCall(page, 'POST', '/admin/markets');
    await page.getByRole('button', { name: 'Add market' }).click();
    const id = ((await (await created).json()) as { id: string }).id;

    try {
      // Admin-created markets skip the proposal queue, so this is immediate.
      await expect.poll(publicNames, { message: 'the new market is not public' }).toContain(name);

      const row = page.getByRole('row').filter({ hasText: name });
      await expect(row).toHaveCount(1);
      await row.getByRole('button', { name: 'Edit' }).click();
      await page.getByPlaceholder('Azadpur Mandi').fill(renamed);
      const saved = apiCall(page, 'PATCH', `/admin/markets/${id}`);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await saved;
      await expect.poll(publicNames, { message: 'the renamed market did not update publicly' }).toContain(renamed);

      const hidden = apiCall(page, 'PATCH', `/admin/markets/${id}`);
      await page.getByRole('row').filter({ hasText: renamed }).getByRole('button', { name: 'Hide' }).click();
      await hidden;
      await expect.poll(publicNames, { message: 'a hidden market is still offered to sellers' }).not.toContain(renamed);
    } finally {
      // Markets soft-delete (deactivate) — there is no hard delete by design.
      await request.delete(`${API}/admin/markets/${id}`, { headers }).catch(() => {});
    }
  });

  test('retiring a service leaf hides it from the public tree, restoring brings it back', async ({ page, request }) => {
    const headers = await auth(request);

    // Pick a leaf whose English name appears exactly once anywhere in the tree,
    // so the row filter below can only land on one node. Service names repeat a
    // lot ("Bookkeeping" exists per country), hence the uniqueness check.
    type Node = { id: string; slug: string; nameEn: string; kind: string; isActive: boolean; children?: Node[] };
    const flatten = (nodes: Node[]): Node[] => nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
    const all = flatten((await (await request.get(`${API}/admin/service-taxonomy`, { headers })).json()) as Node[]);
    const occurrences = new Map<string, number>();
    for (const n of all) occurrences.set(n.nameEn, (occurrences.get(n.nameEn) ?? 0) + 1);
    const leaf = all.find(
      (n) =>
        n.kind === 'SERVICE' &&
        n.isActive &&
        occurrences.get(n.nameEn) === 1 &&
        !all.some((o) => o.id !== n.id && o.nameEn.includes(n.nameEn)),
    );
    expect(leaf, 'no uniquely-named active service leaf to exercise').toBeTruthy();

    const publicSlugs = async () => {
      const tree = (await (await request.get(`${API}/services/taxonomy`)).json()) as Node[];
      return flatten(tree).map((n) => n.slug);
    };
    expect(await publicSlugs()).toContain(leaf!.slug);

    await openAdmin(page, request, '/service-taxonomy');
    await page.getByPlaceholder('Search by name or path').fill(leaf!.nameEn);
    // The filter keeps ancestors visible so a deep match can be seen; the SERVICE
    // badge is what separates the leaf row from the branches above it.
    const row = page
      .locator('div.border-b')
      .filter({ hasText: leaf!.nameEn })
      .filter({ hasText: 'SERVICE' });
    await expect(row).toHaveCount(1);

    try {
      const retired = apiCall(page, 'PATCH', `/admin/service-taxonomy/${leaf!.id}/active`);
      await row.getByRole('button', { name: 'Retire' }).click();
      await retired;
      await expect(row.getByRole('button', { name: 'Restore' })).toBeVisible();

      await expect
        .poll(publicSlugs, { message: 'a retired service is still offered publicly' })
        .not.toContain(leaf!.slug);

      const restored = apiCall(page, 'PATCH', `/admin/service-taxonomy/${leaf!.id}/active`);
      await row.getByRole('button', { name: 'Restore' }).click();
      await restored;
      await expect.poll(publicSlugs, { message: 'restoring did not bring the service back' }).toContain(leaf!.slug);
    } finally {
      await request
        .patch(`${API}/admin/service-taxonomy/${leaf!.id}/active`, { headers, data: { isActive: true } })
        .catch(() => {});
    }
  });
});

/* ═════════════════════════════ orders & disputes ═════════════════════════ */

test.describe('disputes', () => {
  test('resolving in the buyer\'s favour refunds escrow, closes the order and clears the queue', async ({
    page,
    request,
  }) => {
    const headers = await auth(request);
    const buyerAuth = await auth(request, DEMO.buyer);
    const name = `E2E Dispute Probe ${Date.now()}`;
    const product = await createListing(request, name);

    try {
      await request.patch(`${API}/admin/products/${product.id}/approve`, { headers });

      const before = (await (await request.get(`${API}/me/wallet`, { headers: buyerAuth })).json()) as {
        balanceCents: number;
      };
      const placed = await request.post(`${API}/orders`, {
        headers: buyerAuth,
        data: { productSlug: product.slug, qty: 1, unit: 'MT' },
      });
      expect(placed.ok(), `could not place the probe order: ${placed.status()} ${await placed.text()}`).toBeTruthy();
      const order = (await placed.json()) as { id: string; reference: string; amountCents: number };
      expect(order.amountCents).toBe(100);
      expect(before.balanceCents).toBeGreaterThanOrEqual(order.amountCents);

      // Pay into escrow, then drop the order into dispute — the state the console
      // queue is for.
      await request.patch(`${API}/admin/orders/${order.id}/status`, { headers, data: { status: 'paid' } });
      const held = (await (await request.get(`${API}/me/wallet`, { headers: buyerAuth })).json()) as {
        balanceCents: number;
      };
      expect(held.balanceCents, 'paying did not move the buyer money into escrow').toBe(
        before.balanceCents - order.amountCents,
      );
      await request.patch(`${API}/admin/orders/${order.id}/status`, { headers, data: { status: 'dispute' } });

      await openAdmin(page, request, '/disputes');
      await expect(
        page.getByText(`Order #${order.reference}`),
        'the disputed order never showed up in the console queue',
      ).toBeVisible();

      // NOTE: performed through the API because the console exposes no control
      // for it — see the next test, which is the bug report for that gap.
      const resolved = await request.post(`${API}/admin/orders/${order.id}/dispute/resolve`, {
        headers,
        data: { resolution: 'refund_buyer', note: 'e2e settlement' },
      });
      expect(resolved.ok(), `dispute settlement failed: ${resolved.status()} ${await resolved.text()}`).toBeTruthy();
      expect((await resolved.json()).status, 'a refunded dispute must close the order').toBe('cancelled');

      const after = (await (await request.get(`${API}/me/wallet`, { headers: buyerAuth })).json()) as {
        balanceCents: number;
        txns: { type: string; amountCents: number; idempotencyKey?: string | null }[];
      };
      expect(after.balanceCents, 'the escrow hold was not returned to the buyer').toBe(before.balanceCents);
      const refund = after.txns.find((t) => t.idempotencyKey === `escrow:refund:${order.id}`);
      expect(refund, 'no ledger entry for the escrow refund').toBeTruthy();
      expect(refund!.type).toBe('refund');
      expect(refund!.amountCents).toBe(order.amountCents);

      const audit = (await (
        await request.get(`${API}/admin/audit`, { headers, params: { action: 'order.dispute_resolve', take: '20' } })
      ).json()) as { rows: { entityId: string; actor?: { email?: string } }[] };
      expect(
        audit.rows.find((r) => r.entityId === order.id)?.actor?.email,
        'the settlement is not attributable to the admin who made it',
      ).toBe(DEMO.admin);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('main').first().waitFor({ state: 'visible' });
      await expect(
        page.getByText(`Order #${order.reference}`),
        'a settled case is still sitting in the dispute queue',
      ).toHaveCount(0);
    } finally {
      await deleteListing(request, product.id);
    }
  });

  test('the dispute queue lists a disputed order, read-only by design', async ({ page, request }) => {
    // NOT a missing feature. `POST /admin/orders/:id/dispute/resolve` exists and
    // works (the test above drives it), and the admin catalogue still carries
    // `disputes.refund` / `disputes.release` labels from when the screen was
    // planned — but DisputesPage renders no settle buttons on purpose: the
    // endpoint sits behind `assertLegacyFinancialWritesEnabled`, which HARD-
    // REFUSES in production because dispute settlement has no verified payment
    // provider or ledger behind it yet. A button here would be one that always
    // fails for real users.
    //
    // So this asserts the contract that actually holds — the queue surfaces the
    // case for a human to act on out of band — and deliberately does NOT assert
    // a settle control. Turn this into the stronger assertion when real payment
    // settlement lands and the legacy-finance guard comes out.
    const headers = await auth(request);
    const open = (await (await request.get(`${API}/admin/disputes`, { headers })).json()) as { reference: string }[];
    expect(open.length, 'no disputed order seeded to check the queue against').toBeGreaterThan(0);

    await openAdmin(page, request, '/disputes');
    const card = page.locator('div.shadow-card').filter({ hasText: `Order #${open[0].reference}` });
    await expect(card, 'the dispute queue does not surface the disputed order at all').toHaveCount(1);
  });
});

/* ══════════════════════════════ reviews & posts ══════════════════════════ */

test.describe('community content', () => {
  /** The seeded loader-job review — distinctive text, one reviewee. */
  async function seededReview(request: APIRequestContext) {
    const headers = await auth(request);
    const body = (await (
      await request.get(`${API}/admin/reviews`, { headers, params: { search: 'reefer' } })
    ).json()) as { rows: { id: string; text: string; status: string; revieweeId: string }[] };
    const review = body.rows[0];
    expect(review, 'the seeded loader-job review is missing').toBeTruthy();
    return review;
  }

  async function publicReviewIds(request: APIRequestContext, userId: string) {
    const body = (await (await request.get(`${API}/reviews/user/${userId}`)).json()) as { list: { id: string }[] };
    return body.list.map((r) => r.id);
  }

  test('hiding a review removes it from the public profile; unhiding restores it', async ({ page, request }) => {
    const headers = await auth(request);
    const review = await seededReview(request);
    expect(review.status, 'the seeded review is not visible to start with').toBe('visible');
    expect(await publicReviewIds(request, review.revieweeId)).toContain(review.id);

    await openAdmin(page, request, '/reviews');
    await page.getByPlaceholder('Search text, rater or reviewee').fill('reefer');
    const row = page.locator('div.p-4').filter({ hasText: review.text });
    await expect(row.first()).toBeVisible();

    try {
      const hidden = apiCall(page, 'PATCH', `/admin/reviews/${review.id}`);
      await row.first().getByRole('button', { name: 'Hide' }).click();
      await hidden;

      await expect
        .poll(() => publicReviewIds(request, review.revieweeId), {
          message: 'a hidden review is still on the public profile',
        })
        .not.toContain(review.id);

      const unhidden = apiCall(page, 'PATCH', `/admin/reviews/${review.id}`);
      await row.first().getByRole('button', { name: 'Unhide' }).click();
      await unhidden;

      await expect
        .poll(() => publicReviewIds(request, review.revieweeId), { message: 'unhiding did not restore the review' })
        .toContain(review.id);
    } finally {
      await request
        .patch(`${API}/admin/reviews/${review.id}`, { headers, data: { status: 'visible' } })
        .catch(() => {});
    }
  });

  test('a moderation action performed in the console shows up on the audit page', async ({ page, request }) => {
    const headers = await auth(request);
    const review = await seededReview(request);

    await openAdmin(page, request, '/reviews');
    await page.getByPlaceholder('Search text, rater or reviewee').fill('reefer');
    const row = page.locator('div.p-4').filter({ hasText: review.text });
    const hidden = apiCall(page, 'PATCH', `/admin/reviews/${review.id}`);
    await row.first().getByRole('button', { name: 'Hide' }).click();
    await hidden;

    try {
      await openAdmin(page, request, '/audit');
      await page.getByPlaceholder('Filter action').fill('review.hidden');
      const entry = page.getByRole('row').filter({ hasText: `Review · ${review.id.slice(0, 8)}` });
      await expect(entry.first(), 'the console action is missing from the audit log').toBeVisible();
      await expect(entry.first(), 'the audit row does not name the admin who acted').toContainText('Platform Admin');
    } finally {
      await request.patch(`${API}/admin/reviews/${review.id}`, { headers, data: { status: 'visible' } });
    }
  });

  test('pinning a community post is reflected in the feed', async ({ page, request }) => {
    const headers = await auth(request);
    const feed = async () =>
      (await (await request.get(`${API}/community/admin/feed`, { headers })).json()) as {
        id: string;
        body: string;
        pinned: boolean;
      }[];
    const post = (await feed()).find((p) => !p.pinned);
    expect(post, 'no unpinned community post seeded').toBeTruthy();

    await openAdmin(page, request, '/community');
    await page.getByRole('button', { name: 'feed', exact: true }).click();
    const row = page.locator('div.p-4').filter({ hasText: post!.body.slice(0, 40) });
    await expect(row.first()).toBeVisible();

    try {
      const pinned = apiCall(page, 'POST', `/community/admin/posts/${post!.id}/pin`);
      await row.first().getByRole('button', { name: 'Pin', exact: true }).click();
      await pinned;

      await expect
        .poll(async () => (await feed()).find((p) => p.id === post!.id)?.pinned, {
          message: 'Pin did not stick',
        })
        .toBe(true);
      await expect(
        page.locator('div.p-4').filter({ hasText: post!.body.slice(0, 40) }).first(),
        'the pinned post is not badged as pinned',
      ).toContainText('pinned');

      const unpinned = apiCall(page, 'POST', `/community/admin/posts/${post!.id}/pin`);
      await page
        .locator('div.p-4')
        .filter({ hasText: post!.body.slice(0, 40) })
        .first()
        .getByRole('button', { name: 'Unpin' })
        .click();
      await unpinned;
      await expect.poll(async () => (await feed()).find((p) => p.id === post!.id)?.pinned).toBe(false);
    } finally {
      await request
        .post(`${API}/community/admin/posts/${post!.id}/pin`, { headers, data: { pinned: false } })
        .catch(() => {});
    }
  });
});

/* ═══════════════════════════════ email templates ═════════════════════════ */

test.describe('email templates', () => {
  const KEY = 'loader.job_claimed';

  test('an edited subject previews and saves', async ({ page, request }) => {
    const headers = await auth(request);
    const original = (await (await request.get(`${API}/admin/email-templates/${KEY}`, { headers })).json()) as {
      name: string;
      subject: string;
      bodyHtml: string;
      defaultSubject: string;
      defaultBodyHtml: string;
    };
    const subject = `[E2E ${Date.now()}] {{title}}`;

    await openAdmin(page, request, '/email-templates');
    // One row per template; `px-5 py-3` is the row wrapper and the template name
    // is unique within the list.
    const row = page.locator('div.px-5.py-3').filter({ hasText: original.name });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: 'Edit' }).click();

    try {
      await row.getByLabel('Subject').fill(subject);

      // Preview only renders once the server has returned rendered HTML.
      const previewed = apiCall(page, 'POST', `/admin/email-templates/${KEY}/preview`);
      await row.getByRole('button', { name: 'Preview', exact: true }).click();
      await previewed;
      await expect(row.locator('iframe[title="preview"]'), 'Preview produced nothing to show').toBeVisible();

      const saved = apiCall(page, 'PATCH', `/admin/email-templates/${KEY}`);
      await row.getByRole('button', { name: 'Save changes' }).click();
      await saved;
      await expect(page.getByText('Template saved')).toBeVisible();

      const stored = (await (await request.get(`${API}/admin/email-templates/${KEY}`, { headers })).json()) as {
        subject: string;
      };
      expect(stored.subject, 'the edited subject was not persisted').toBe(subject);
      // The list must now mark the template as diverging from its default.
      await expect(page.locator('div.px-5.py-3').filter({ hasText: original.name })).toContainText('Edited');
    } finally {
      await request.patch(`${API}/admin/email-templates/${KEY}`, {
        headers,
        data: { subject: original.defaultSubject, bodyHtml: original.defaultBodyHtml },
      });
    }
  });
});

/* ══════════════════════════ per-module permissions ═══════════════════════ */

test.describe('permissions', () => {
  /** Seeded scoped staff — see `prisma/seed.ts` (`scopedAdmins`). */
  const FINANCE = 'finance@agrotraders.org'; // finance_manage, reports_view
  const MODERATOR = 'moderator@agrotraders.org'; // support_agent, community_moderate, kyc_review

  const REFUSALS: { who: string; what: string; call: (r: APIRequestContext, h: Record<string, string>) => Promise<{ status(): number }> }[] = [
    {
      who: FINANCE,
      what: 'read the user directory (users_manage)',
      call: (r, h) => r.get(`${API}/admin/users`, { headers: h }),
    },
    {
      who: FINANCE,
      what: 'approve a listing (products_moderate)',
      call: (r, h) => r.patch(`${API}/admin/products/does-not-exist/approve`, { headers: h }),
    },
    {
      who: FINANCE,
      what: 'create a category (products_moderate)',
      call: (r, h) => r.post(`${API}/admin/categories`, { headers: h, data: { name: 'should never exist' } }),
    },
    {
      who: FINANCE,
      what: 'decide a KYC submission (kyc_review)',
      call: (r, h) => r.patch(`${API}/admin/kyc/does-not-exist`, { headers: h, data: { status: 'verified' } }),
    },
    {
      who: FINANCE,
      what: 'moderate a review (reviews_moderate)',
      call: (r, h) => r.patch(`${API}/admin/reviews/does-not-exist`, { headers: h, data: { status: 'hidden' } }),
    },
    {
      who: FINANCE,
      what: 'read the audit trail (audit_view)',
      call: (r, h) => r.get(`${API}/admin/audit`, { headers: h }),
    },
    {
      who: MODERATOR,
      what: 'adjust a wallet (finance_manage)',
      call: (r, h) => r.post(`${API}/admin/wallets/does-not-exist/adjust`, { headers: h, data: { amountCents: 100, type: 'topup' } }),
    },
    {
      who: MODERATOR,
      what: 'read invoices (finance_manage)',
      call: (r, h) => r.get(`${API}/admin/invoices`, { headers: h }),
    },
    {
      who: MODERATOR,
      what: 'create a market (markets_manage)',
      call: (r, h) => r.post(`${API}/admin/markets`, { headers: h, data: { name: 'nope', country: 'India' } }),
    },
    {
      who: MODERATOR,
      what: 'moderate a review (reviews_moderate)',
      call: (r, h) => r.patch(`${API}/admin/reviews/does-not-exist`, { headers: h, data: { status: 'hidden' } }),
    },
  ];

  for (const probe of REFUSALS) {
    test(`${probe.who.split('@')[0]} cannot ${probe.what}`, async ({ request }) => {
      const headers = await auth(request, probe.who);
      const res = await probe.call(request, headers);
      // 403, not 404: the guard must fire before the handler ever looks the
      // record up, otherwise the refusal leaks whether the id exists.
      expect(res.status(), `an out-of-scope admin was not refused`).toBe(403);
    });
  }

  test('a scoped admin still gets the modules it does hold', async ({ request }) => {
    // The other half of the contract — a permission system that refuses
    // everything is not a permission system.
    expect((await request.get(`${API}/admin/invoices`, { headers: await auth(request, FINANCE) })).status()).toBe(200);
    expect((await request.get(`${API}/admin/kyc`, { headers: await auth(request, MODERATOR) })).status()).toBe(200);
  });

  test('the console hides and blocks the modules a scoped admin lacks', async ({ page, request }) => {
    await openAdmin(page, request, '/invoices', FINANCE);
    // Allowed module: it renders, and its nav entry is there.
    // `.first()`: the page header (h1) and the section (h2) both read "Invoices",
    // so a bare role query is a strict-mode violation. Either one being visible
    // is the proof wanted here — that the module rendered for this admin.
    await expect(page.getByRole('heading', { name: 'Invoices' }).first()).toBeVisible();
    expect(await page.locator('a[href="/invoices"]').count()).toBeGreaterThan(0);

    // Denied module: no nav entry, and typing the URL is refused rather than
    // rendering live action buttons over an empty table.
    expect(
      await page.locator('a[href="/products"]').count(),
      'the sidebar offers a module this admin has no permission for',
    ).toBe(0);
    await page.goto('/products', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'No access' }),
      'a scoped admin reached the product moderation screen',
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
  });
});
