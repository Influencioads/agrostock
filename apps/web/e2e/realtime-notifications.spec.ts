import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, DEMO, signIn, token } from './helpers';

/**
 * Notifications, chat and the rest of the realtime surface.
 *
 * Everything here is asserted through the API plus a page reload rather than by
 * waiting on a live socket frame: the gateway is only the *delivery* path, while
 * persistence, channel policy and translate-on-read all happen in the request
 * that caused them. A socket race would make these flaky without testing
 * anything the API does not already own.
 */

const uniq = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const bearer = async (request: APIRequestContext, email: string) => ({
  Authorization: `Bearer ${await token(request, email)}`,
});

/** The JWT's `sub` is the user id — cheaper than a second round trip for it. */
function userIdOf(jwt: string): string {
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()) as { sub: string };
  return payload.sub;
}

interface Notif {
  id: string;
  system: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

async function inbox(request: APIRequestContext, headers: Record<string, string>): Promise<Notif[]> {
  const res = await request.get(`${API}/notifications`, { headers });
  expect(res.ok(), `GET /notifications failed: ${res.status()}`).toBeTruthy();
  return res.json();
}

async function unreadCount(request: APIRequestContext, headers: Record<string, string>): Promise<number> {
  const res = await request.get(`${API}/notifications/unread-count`, { headers });
  return (await res.json()).count as number;
}

/** Reset one category back to "no explicit preference" (the stored patch replaces per category). */
async function resetCategory(request: APIRequestContext, headers: Record<string, string>, category: string) {
  await request.put(`${API}/notifications/preferences`, { headers, data: { categories: { [category]: {} } } });
}

/**
 * Post a loading job as the buyer and let the seeded loading company claim it.
 * This is the most self-contained A → B trigger on the platform: no money moves,
 * both sides are seeded, and the claim is what produces the buyer's notification.
 */
async function postAndClaimJob(request: APIRequestContext, buyer: Record<string, string>) {
  const created = await request.post(`${API}/loaders/jobs`, {
    headers: buyer,
    data: { location: 'Mundra Port', workersNeeded: 2, cargo: `e2e-${uniq()}`, notes: 'e2e realtime spec' },
  });
  expect(created.ok(), `job create failed: ${created.status()} ${await created.text()}`).toBeTruthy();
  const job = (await created.json()) as { id: string; reference: string };

  const loaderco = await bearer(request, DEMO.loaderco);
  const claimed = await request.post(`${API}/loaders/jobs/${job.id}/claim`, { headers: loaderco });
  expect(claimed.ok(), `claim failed: ${claimed.status()} ${await claimed.text()}`).toBeTruthy();
  return job;
}

/** One row of the masked bid book (`GET /buyer-bids/:id/bids`). */
interface BookRow {
  id: string;
  masked: string;
  sellerId: string | null;
  message: string | null;
}

interface Requirement {
  id: string;
  reference: string;
  status: string;
  mode: string;
  deadline: string | null;
  auctionEndsAt: string | null;
}

/**
 * The account that owns the requirement the bid-room test bids into.
 *
 * Deliberately NOT the demo buyer. Posting a requirement spends one of the buyer
 * plan's 3 RFQs per calendar month, the seed already spends two of them, and
 * nothing ever gives one back — cancelling still counts, by design, or
 * post → cancel → repost would be an unlimited quota. Run against the demo buyer
 * this test therefore passed exactly once and then 403'd `QUOTA_EXCEEDED` for
 * the rest of the month.
 *
 * So the fixture is provisioned once and reused: escape hatch #2 (an
 * admin-provisioned account is verified from birth — see auth-flows.spec.ts)
 * gives a stable buyer whose own quota nothing else touches.
 */
const FIXTURE_BUYER = 'e2e-bidroom@example.invalid';

async function fixtureBuyer(request: APIRequestContext): Promise<Record<string, string>> {
  const res = await request.post(`${API}/admin/users`, {
    headers: await bearer(request, DEMO.admin),
    data: { email: FIXTURE_BUYER, name: 'E2E Bid Room', role: 'buyer', password: DEMO.password },
  });
  const body = await res.text();
  // Second run onwards the account is already there — that is the reuse, not a failure.
  expect(res.ok() || body.includes('already registered'), `fixture buyer unavailable: ${res.status()} ${body}`).toBeTruthy();
  return bearer(request, FIXTURE_BUYER);
}

/**
 * A requirement of that buyer's a seller can still bid into: open, auction mode
 * (quote mode is sealed, so its book is invisible to a third party) and not past
 * its clock. Created on the first run and reused after — it is never cancelled,
 * which is what keeps the suite to one RFQ ever.
 */
async function runningRequirement(request: APIRequestContext, buyer: Record<string, string>): Promise<Requirement> {
  const mine = (await (await request.get(`${API}/buyer-bids/mine`, { headers: buyer })).json()) as Requirement[];
  const open = mine.find(
    (r) =>
      r.status === 'open' &&
      r.mode === 'auction' &&
      [r.deadline, r.auctionEndsAt].every((d) => !d || Date.parse(d) > Date.now()),
  );
  if (open) return open;

  const created = await request.post(`${API}/buyer-bids`, {
    headers: buyer,
    data: { title: `e2e requirement ${uniq()}`, productName: 'Wheat', qtyValue: 10, qtyUnit: 'MT', targetPriceCents: 30_000 },
  });
  expect(created.ok(), `buyer bid create failed: ${created.status()} ${await created.text()}`).toBeTruthy();
  return created.json();
}

test.describe('in-app notification centre', () => {
  test('claiming a posted job notifies the buyer, in the right category, with a live deep link', async ({
    request,
  }) => {
    const buyer = await bearer(request, DEMO.buyer);
    const before = await unreadCount(request, buyer);
    const job = await postAndClaimJob(request, buyer);

    const list = await inbox(request, buyer);
    const notif = list.find((n) => (n.data as { jobId?: string } | null)?.jobId === job.id);
    expect(notif, `no notification reached the buyer for job ${job.reference}`).toBeTruthy();

    // The category is what the whole channel policy keys off — a job event filed
    // under the wrong one silently inherits the wrong email/push defaults.
    expect(notif!.system, 'loading-job events belong to the "loader" category').toBe('loader');
    expect(notif!.type).toBe('loader.job_claimed');
    // Rendered from the catalog, not a frozen string: the reference has to survive
    // interpolation or the buyer cannot tell which job was claimed.
    expect(notif!.body ?? '', 'the job reference is missing from the rendered body').toContain(job.reference);
    // A notification the bell cannot open is a dead end (the repo's own FLOW-01 rule).
    expect(notif!.linkUrl, 'the loader notification lost its deep link').toBe('/console/loaders');
    expect(notif!.readAt).toBeNull();

    expect(await unreadCount(request, buyer), 'the unread badge did not move').toBe(before + 1);

    const read = await request.post(`${API}/notifications/${notif!.id}/read`, { headers: buyer });
    expect(read.ok()).toBeTruthy();
    const after = await inbox(request, buyer);
    expect(after.find((n) => n.id === notif!.id)?.readAt, 'marking read did not stick').toBeTruthy();
    expect(await unreadCount(request, buyer), 'the badge did not drop after reading').toBe(before);
  });

  test('a rival offer notifies the buyer without leaking who made it', async ({ request }) => {
    const buyer = await fixtureBuyer(request);
    const seller = await bearer(request, DEMO.seller);
    const bid = await runningRequirement(request, buyer);

    const sellerId = userIdOf(await token(request, DEMO.seller));
    const note = `e2e offer note ${uniq()}`;
    const before = new Set((await inbox(request, buyer)).map((n) => n.id));

    const offered = await request.post(`${API}/buyer-bids/${bid.id}/bids`, {
      headers: seller,
      data: { priceCents: 29_000, qtyValue: 10, etaDays: 7, message: note },
    });
    expect(offered.ok(), `offer failed: ${offered.status()} ${await offered.text()}`).toBeTruthy();

    // The owner of the requirement is the one party allowed the real identity —
    // read the true name from there rather than hard-coding the seed.
    const owned = (await (await request.get(`${API}/buyer-bids/${bid.id}/bids`, { headers: buyer })).json()) as BookRow[];
    const asOwner = owned.find((b) => b.sellerId === sellerId);
    expect(asOwner, 'the offer never reached the book, or the owner lost the seller id it awards on').toBeTruthy();
    const sellerName = asOwner!.masked;
    expect(sellerName, 'the owner view should be an unmasked name').not.toMatch(/•/);

    // …while everyone else sees initials only, and no id to resolve them with.
    const anon = (await (await request.get(`${API}/buyer-bids/${bid.id}/bids`)).json()) as BookRow[];
    const asStranger = anon.find((b) => b.id === asOwner!.id);
    expect(asStranger, 'the offer is missing from the public book').toBeTruthy();
    expect(asStranger!.masked, 'a third party can read the bidder name').not.toBe(sellerName);
    expect(asStranger!.masked, 'the mask should keep initials only').toMatch(/•/);
    expect(asStranger!.sellerId, 'the raw seller id leaked to a third party').toBeNull();
    // The offer text still comes through — masking hides who, never what.
    expect(asStranger!.message).toBe(note);

    // Strictly the notification THIS offer raised, not one left by an earlier run.
    const notif = (await inbox(request, buyer)).find(
      (n) => !before.has(n.id) && (n.data as { buyerBidId?: string } | null)?.buyerBidId === bid.id,
    );
    expect(notif, 'the buyer was never told an offer arrived').toBeTruthy();
    expect(notif!.system, 'offers belong to the non-transactional "bids" category').toBe('bids');
    expect(notif!.body ?? '').toContain(bid.reference);
    // The notification is a second, quieter copy of the book — if it names the
    // bidder it unmasks the room the masking exists to protect.
    expect(notif!.body ?? '', 'the notification named the bidder').not.toContain(sellerName);
    expect(JSON.stringify(notif!.data ?? {}), 'the notification payload carries the seller id').not.toContain(
      sellerId,
    );
  });

  test("the bell's deep link resolves through the section alias map", async ({ page, request }) => {
    const buyer = await bearer(request, DEMO.buyer);
    const job = await postAndClaimJob(request, buyer);

    await signIn(page, request, DEMO.buyer);
    await page.evaluate(() => localStorage.setItem('lang', 'en'));
    await page.goto('/console', { waitUntil: 'domcontentloaded' });

    // `exact`: the toast host beside it is labelled "Notifications alt+T".
    const bell = page.getByRole('button', { name: 'Notifications', exact: true });
    await expect(bell).toBeVisible({ timeout: 15_000 });
    await bell.click();

    const item = page.locator('button').filter({ hasText: job.reference }).first();
    await expect(item, 'the new notification never reached the bell').toBeVisible({ timeout: 10_000 });
    await item.click();

    // /console/loaders is not a nav id — SECTION_ALIAS maps it onto the buyer's
    // Transport section. Without that mapping the link silently lands on the
    // dashboard, which is exactly the dead end that looks like "it worked".
    await expect(page).toHaveURL(/\/console\/loaders$/);
    await expect(page.getByRole('heading', { name: 'Transport', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Track freight from origin/i)).toBeVisible();
  });

  test('an unmapped console slug falls back to the dashboard instead of a blank panel', async ({ page, request }) => {
    await signIn(page, request, DEMO.buyer);
    await page.evaluate(() => localStorage.setItem('lang', 'en'));
    await page.goto(`/console/not-a-section-${uniq()}`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/live procurement activity/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Track freight from origin/i)).toBeHidden();
  });
});

test.describe('per-category notification preferences', () => {
  test('a category preference persists, and a non-transactional one can never turn email on', async ({ request }) => {
    const headers = await bearer(request, DEMO.transporter);
    try {
      const put = await request.put(`${API}/notifications/preferences`, {
        headers,
        data: { categories: { transport: { push: false } } },
      });
      expect(put.ok(), `PUT preferences failed: ${put.status()}`).toBeTruthy();
      expect((await put.json()).categories.transport.push, 'the toggle did not take').toBe(false);

      const reread = await (await request.get(`${API}/notifications/preferences`, { headers })).json();
      expect(reread.categories.transport.push, 'the preference did not survive a re-read').toBe(false);
      // Turning one channel off must not disturb the others in that category.
      expect(reread.categories.transport.inApp).toBe(true);
      expect(reread.categories.transport.email).toBe(true);

      // "bids" is high-frequency and declared non-transactional, so the policy —
      // not the stored value — decides: asking for email must still resolve false.
      const bids = await request.put(`${API}/notifications/preferences`, {
        headers,
        data: { categories: { bids: { email: true } } },
      });
      expect(
        (await bids.json()).categories.bids.email,
        'a non-transactional category was allowed to opt into email',
      ).toBe(false);
    } finally {
      await resetCategory(request, headers, 'transport');
      await resetCategory(request, headers, 'bids');
    }
  });

  test('turning a category off in-app suppresses that in-app notification', async ({ request }) => {
    const buyer = await bearer(request, DEMO.buyer);
    try {
      const put = await request.put(`${API}/notifications/preferences`, {
        headers: buyer,
        data: { categories: { loader: { inApp: false } } },
      });
      expect((await put.json()).categories.loader.inApp, 'the in-app toggle did not store').toBe(false);

      const job = await postAndClaimJob(request, buyer);

      const landed = (await inbox(request, buyer)).find(
        (n) => (n.data as { jobId?: string } | null)?.jobId === job.id,
      );
      // The bell's settings panel offers an "App" checkbox per category. If the
      // stored preference is not consulted when the row is written, that checkbox
      // is decorative and the user cannot quiet a category they opted out of.
      expect(
        landed,
        'loader.inApp = false, yet the notification was still created and listed',
      ).toBeUndefined();
    } finally {
      await resetCategory(request, buyer, 'loader');
    }
  });
});

test.describe('chat', () => {
  test('a direct message is folded into the reader’s locale on read', async ({ request }) => {
    const seller = await bearer(request, DEMO.seller);
    const buyer = await bearer(request, DEMO.buyer);
    const sellerId = userIdOf(await token(request, DEMO.seller));

    const english = `The wheat shipment leaves the port tomorrow morning. Ref ${uniq()}.`;
    const sent = await request.post(`${API}/community/messages`, {
      headers: seller,
      data: { toUserId: userIdOf(await token(request, DEMO.buyer)), body: english },
    });
    expect(sent.ok(), `DM send failed: ${sent.status()} ${await sent.text()}`).toBeTruthy();
    const messageId = (await sent.json()).message.id as string;

    const readAs = async (locale: string) => {
      const res = await request.get(`${API}/community/dm/${sellerId}`, {
        headers: { ...buyer, 'Accept-Language': locale },
      });
      const body = (await res.json()) as { messages: { id: string; body: string; originalBody: string; sourceLang: string | null }[] };
      return body.messages.find((m) => m.id === messageId);
    };

    // Source-language detection runs fire-and-forget after the send, and the
    // translation itself is lazy on first read — so poll rather than sleep.
    await expect
      .poll(async () => (await readAs('ru'))?.sourceLang, { timeout: 20_000, intervals: [500, 1000, 2000] })
      .toBe('en');

    const ru = await readAs('ru');
    expect(ru!.originalBody, 'the original text must be preserved for the "show original" toggle').toBe(english);
    expect(ru!.body, 'a Russian reader was served the untranslated English body').not.toBe(english);
    expect(ru!.body, 'no Cyrillic in the translated body').toMatch(/[А-Яа-я]/);

    // The sender's own language is a passthrough — no round trip, no drift.
    const en = await readAs('en');
    expect(en!.body, 'an English reader must see the message exactly as written').toBe(english);
  });

  test('a chat message sent over the REST fallback still notifies the recipient', async ({ request }) => {
    const seller = await bearer(request, DEMO.seller);
    const buyer = await bearer(request, DEMO.buyer);
    const buyerId = userIdOf(await token(request, DEMO.buyer));

    const seen = new Set((await inbox(request, buyer)).map((n) => n.id));

    const marker = uniq();
    const sent = await request.post(`${API}/community/messages`, {
      headers: seller,
      data: { toUserId: buyerId, body: `REST fallback probe ${marker}` },
    });
    expect(sent.ok()).toBeTruthy();

    // apps/mobile/.../Community.tsx falls back to this endpoint whenever the chat
    // socket is down — which is precisely when the recipient most needs the
    // notification, since no `message:new` frame will reach them either.
    await expect
      .poll(
        async () => (await inbox(request, buyer)).filter((n) => !seen.has(n.id) && n.system === 'community').length,
        { timeout: 10_000, intervals: [500, 1000, 2000] },
      )
      .toBeGreaterThan(0);
  });
});

test.describe('push device tokens', () => {
  test('registering the same token twice is idempotent and rebinding it to another account works', async ({
    request,
  }) => {
    const buyer = await bearer(request, DEMO.buyer);
    const seller = await bearer(request, DEMO.seller);
    const deviceToken = `e2e-device-${uniq()}-${uniq()}`;

    const register = (headers: Record<string, string>, platform: string) =>
      request.post(`${API}/notifications/register-device`, {
        headers,
        data: { platform, token: deviceToken, userAgent: 'playwright' },
      });
    const unregister = (headers: Record<string, string>) =>
      request.post(`${API}/notifications/unregister-device`, { headers, data: { token: deviceToken } });

    try {
      // The token column is unique. A plain create on the second call would 500
      // here — every app boot re-registers the same FCM token.
      expect((await register(buyer, 'web')).ok(), 'first registration failed').toBeTruthy();
      expect((await register(buyer, 'web')).ok(), 're-registering the same token is not idempotent').toBeTruthy();

      // A shared device handed to another account must re-bind, not collide.
      expect((await register(seller, 'android')).ok(), 'rebinding the token to another user failed').toBeTruthy();

      expect((await unregister(seller)).ok()).toBeTruthy();
      expect((await unregister(seller)).ok(), 'unregistering an already-removed token must be a no-op').toBeTruthy();
    } finally {
      await unregister(buyer);
      await unregister(seller);
    }
  });

  test('the register endpoint rejects an unknown platform and an oversized token', async ({ request }) => {
    const buyer = await bearer(request, DEMO.buyer);

    const badPlatform = await request.post(`${API}/notifications/register-device`, {
      headers: buyer,
      data: { platform: 'toaster', token: `e2e-${uniq()}` },
    });
    expect(badPlatform.status(), 'an unknown platform was accepted').toBe(400);
    expect(await badPlatform.text()).toMatch(/web, android, ios/);

    // The column is capped at 4096; without the DTO guard this reaches Postgres.
    const tooLong = await request.post(`${API}/notifications/register-device`, {
      headers: buyer,
      data: { platform: 'web', token: 'x'.repeat(4097) },
    });
    expect(tooLong.status(), 'an over-length token was accepted').toBe(400);
  });
});
