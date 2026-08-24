import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, DEMO, failOnConsoleErrors, signIn, token } from './helpers';

/**
 * The two opposed bidding books.
 *
 *   forward  — a seller auctions a lot, buyers bid it UP   (`Product.isAuction`)
 *   reverse  — a buyer posts a requirement, sellers bid it DOWN (`BuyerBid`)
 *
 * Both publish every price and hide every identity, and both now accept ANY
 * offer — above or below the standing one — with exactly one revisable row per
 * account. Those three rules are what these assert, because they are the ones a
 * refactor silently breaks: a stacked second row, a leaked bidder name and a
 * "minimum raise" that quietly comes back all look fine on screen.
 *
 * The seed ships no LIVE lot (both seeded auctions closed on 2026-08-17), and the
 * demo buyer's requirement quota is already spent, so the forward-auction fixture
 * is created once and then reused by every later run — see `liveLotSlug`. Nothing
 * here posts a new requirement.
 */

/* ── shapes (only the fields asserted on) ─────────────────────────── */

interface AuctionRow {
  id: string;
  slug: string;
  name: string;
  status?: string;
  sellerId?: string | null;
  bidCount: number;
  highestCents: number | null;
  startBidCents: number | null;
  auctionEndsAt: string | null;
  auctionSettledAt?: string | null;
  hasReserve: boolean;
  reserveMet: boolean;
  reserveCents: number | null;
  highBidder: string | null;
  highBidderId: string | null;
  highBidderMasked: string | null;
}

interface AuctionDetail extends AuctionRow {
  isOwner: boolean;
  standing: { yourMaxCents: number | null; yourRank: number | null; leading: boolean } | null;
}

interface AuctionBookRow {
  id: string;
  amountCents: number;
  isYou: boolean;
  isTop: boolean;
  masked: string;
  bidderId: string | null;
  bidderName: string | null;
}

interface BuyerBid {
  id: string;
  reference: string;
  title: string;
  mode: 'auction' | 'quote';
  status: string;
  deadline: string | null;
  auctionEndsAt: string | null;
  bestPriceCents: number | null;
  qtyUnit: string;
}

interface SellerBidRow {
  id: string;
  priceCents: number;
  qtyValue: number;
  etaDays: number | null;
  message: string | null;
  status: string;
  isYou: boolean;
  masked: string;
  sellerId: string | null;
}

interface Requirement {
  id: string;
  title: string;
  productName: string;
  _count?: { responses: number };
}

/* ── helpers ──────────────────────────────────────────────────────── */

const bearer = async (request: APIRequestContext, email: string) => ({
  Authorization: `Bearer ${await token(request, email)}`,
});

/** Exactly what `formatMoney(cents, 'USD', 1, 'en')` renders in the app. */
const money = (usdCents: number) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(usdCents / 100);

const past = (iso: string | null) => !!iso && new Date(iso).getTime() <= Date.now();

/**
 * The lot the forward-auction tests bid on.
 *
 * Find-or-create, deliberately: creating a throwaway lot per run would leave a
 * new archived Product behind every time, and the seed leaves the board empty,
 * so there is nothing to reuse. The first run creates and approves one lot; every
 * later run finds it on the public board by name.
 */
const LOT_NAME = 'E2E Auction Lot';
const LOT_START_CENTS = 100_000; // $1,000 — the opening bid

let lotSlug: Promise<string> | undefined;

function liveLotSlug(request: APIRequestContext): Promise<string> {
  if (!lotSlug) {
    lotSlug = findOrCreateLot(request);
    // A failed setup must not poison every later test with the same rejection.
    lotSlug.catch(() => {
      lotSlug = undefined;
    });
  }
  return lotSlug;
}

async function findOrCreateLot(request: APIRequestContext): Promise<string> {
  const board = (await (await request.get(`${API}/auctions`)).json()) as AuctionRow[];
  const found = board.find((a) => a.name === LOT_NAME);
  if (found) return found.slug;

  const sellerAuth = await bearer(request, DEMO.seller);
  const categories = (await (await request.get(`${API}/categories`)).json()) as { id: string }[];
  expect(categories.length, 'no categories seeded — cannot list a lot').toBeGreaterThan(0);

  const created = await request.post(`${API}/products`, {
    headers: sellerAuth,
    data: {
      name: LOT_NAME,
      categoryId: categories[0].id,
      price: '1000',
      priceCurrency: 'USD',
      unit: 'MT',
      // A real seeded upload, so the lot page loads its photo instead of 404ing.
      images: ['/uploads/products/seed-organic-red-lentils.jpg'],
      isAuction: true,
      startBidCents: LOT_START_CENTS,
      auctionEndsAt: new Date(Date.now() + 30 * 864e5).toISOString(),
    },
  });
  expect(created.ok(), `could not list the auction lot: ${created.status()} ${await created.text()}`).toBeTruthy();
  const lot = (await created.json()) as { id: string; slug: string };

  // New listings land as `pending`; only an approved lot reaches the board.
  const approved = await request.patch(`${API}/admin/products/${lot.id}/approve`, {
    headers: await bearer(request, DEMO.admin),
  });
  expect(approved.ok(), `could not approve the lot: ${approved.status()} ${await approved.text()}`).toBeTruthy();
  return lot.slug;
}

/** Place a bid as the demo buyer and return the lot's fresh public snapshot. */
async function bid(request: APIRequestContext, slug: string, amountDollars: number) {
  const res = await request.post(`${API}/auctions/${slug}/bids`, {
    headers: await bearer(request, DEMO.buyer),
    data: { amount: amountDollars },
  });
  expect(res.ok(), `bid of $${amountDollars} refused: ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()) as AuctionDetail;
}

/** Every auction the platform holds, live or settled (admin oversight view). */
async function allLots(request: APIRequestContext) {
  const rows = (await (
    await request.get(`${API}/admin/auctions`, { headers: await bearer(request, DEMO.admin) })
  ).json()) as AuctionRow[];
  return rows.filter((r) => r.status !== 'archived');
}

/** The demo buyer's own requirements — the seeded reverse-auction fixtures. */
async function myRequirements(request: APIRequestContext) {
  return (await (
    await request.get(`${API}/buyer-bids/mine`, { headers: await bearer(request, DEMO.buyer) })
  ).json()) as BuyerBid[];
}

/** The bid book of a requirement as seen by one account. */
async function sellerBook(request: APIRequestContext, id: string, as?: string) {
  const res = await request.get(`${API}/buyer-bids/${id}/bids`, {
    headers: as ? await bearer(request, as) : undefined,
  });
  if (!res.ok()) return { rows: [] as SellerBidRow[], raw: '', status: res.status() };
  const raw = await res.text();
  return { rows: JSON.parse(raw) as SellerBidRow[], raw, status: res.status() };
}

/**
 * The first requirement the demo seller actually has a standing offer on — the
 * masking and revision rules need a book with a known row in it, and which
 * requirement that is depends on what the seed (and any earlier run) left behind.
 */
async function requirementIBidOn(request: APIRequestContext, filter: (r: BuyerBid) => boolean) {
  for (const r of await myRequirements(request)) {
    if (!filter(r)) continue;
    const { rows } = await sellerBook(request, r.id, DEMO.seller);
    const own = rows.find((b) => b.isYou);
    if (own) return { requirement: r, own };
  }
  return null;
}

/** The seller identity behind a bid, as only the buyer who raised it may see it. */
async function realBidderName(request: APIRequestContext, id: string) {
  const { rows } = await sellerBook(request, id, DEMO.buyer);
  return rows[0]?.masked ?? null;
}

/* ══ forward auction — the board ══════════════════════════════════ */

test.describe('seller auctions', () => {
  test('the public board carries live lots only — a settled one has left it', async ({ page, request }) => {
    const slug = await liveLotSlug(request);
    const board = (await (await request.get(`${API}/auctions`)).json()) as AuctionRow[];

    expect(board.map((a) => a.slug), 'the live fixture lot is missing from the board').toContain(slug);
    // `liveOnly()` is the whole rule: a lot whose countdown ran out is owner- and
    // participant-scoped from then on, never public.
    const expired = board.filter((a) => past(a.auctionEndsAt));
    expect(expired.map((a) => a.slug), 'a closed lot is still on the public board').toEqual([]);

    const settled = (await allLots(request)).filter((l) => past(l.auctionEndsAt));
    test.skip(settled.length === 0, 'no settled lot in the dataset to check against');
    for (const lot of settled) {
      expect(board.map((a) => a.slug), `settled lot ${lot.slug} is still public`).not.toContain(lot.slug);
    }

    await page.goto('/auctions', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(LOT_NAME).first()).toBeVisible();
  });

  test('a signed-out visitor is offered a bid, not the owner view', async ({ page, request }) => {
    const slug = await liveLotSlug(request);
    // The owner-only label only appears once a lot has a highest bid, so make sure
    // there is one.
    await bid(request, slug, 1_000);

    await page.goto('/auctions', { waitUntil: 'domcontentloaded' });
    const card = page.locator(`a[href="/product/${slug}"]`);
    await expect(card).toBeVisible();

    // AuctionsPage decides "this is mine" from `highestCents != null`, but the API
    // publishes the highest bid to EVERYONE (AuctionsService.withPublic keeps only
    // the bidder identity owner-scoped). So every lot that has been bid on renders
    // the owner's label and the owner's button to strangers — and the one CTA that
    // takes a buyer into the lot disappears.
    await expect(page.getByText(/owner view/i), 'a signed-out visitor was shown the owner view').toHaveCount(0);
    await expect(card, 'the lot offers no way to bid').toContainText(/place a bid/i);
  });

  test('the offer field is quoted in the currency the panel displays', async ({ page, request }) => {
    const slug = await liveLotSlug(request);
    const fx = (await (await request.get(`${API}/fx/rates`)).json()) as { rates: Record<string, number> };
    const rate = fx.rates?.RUB;
    test.skip(!rate, 'no RUB rate in the FX snapshot — the app falls back to USD');

    // The display currency is a plain localStorage preference, same as a visitor
    // picking RUB from the header dropdown.
    await page.addInitScript(() => localStorage.setItem('currency', 'RUB'));
    await page.goto(`/product/${slug}`, { waitUntil: 'domcontentloaded' });

    const label = page.getByText('Current highest bid', { exact: true });
    await expect(label).toBeVisible();
    const shownText = await label.locator('xpath=following::span[1]').innerText();
    const shown = Number(shownText.replace(/[^\d.]/g, ''));
    expect(shown, `could not read the headline price from "${shownText}"`).toBeGreaterThan(0);
    test.skip(!/RUB/.test(shownText), 'the panel is not converting — nothing to reconcile');

    const offer = page.getByLabel('Your offer', { exact: true });
    await expect(offer).toBeVisible();
    const typed = Number(await offer.inputValue());

    // BidPanel prints the price through `fmtCents` (converted) but pre-fills — and
    // submits — the field in USD dollars, with no currency marker on it. A buyer
    // who types the number the panel is showing them places a bid ~84x their
    // intent, and nothing refuses it: there is no floor and no confirmation step.
    expect(typed, 'the price shown and the offer field are in different currencies').toBeCloseTo(shown, 0);
  });
});

/* ══ forward auction — bidding ════════════════════════════════════ */

test.describe('placing a bid', () => {
  test('a buyer bids from the lot page and it lands in the masked book', async ({ page, request }) => {
    const slug = await liveLotSlug(request);
    const errors = failOnConsoleErrors(page, [/favicon/i, /ERR_CONNECTION_REFUSED/, /Failed to load resource/i]);
    page.on('pageerror', (e) => errors.push(`UNCAUGHT: ${e.message}`));

    // Cents on purpose: a lot can be priced per KG, and rounding the offer to
    // whole dollars is exactly the bug this catches.
    const amount = 1_200 + Math.floor(Math.random() * 800) + 0.37;
    const cents = Math.round(amount * 100);

    await signIn(page, request, DEMO.buyer);
    await page.goto(`/product/${slug}`, { waitUntil: 'domcontentloaded' });

    const offer = page.getByLabel('Your offer', { exact: true });
    await expect(offer).toBeVisible();
    await offer.fill(String(amount));
    await page.getByRole('button', { name: /place bid/i }).click();

    // The panel, the standing block and the book all read off the same refetch.
    await expect(page.getByText(money(cents)).first()).toBeVisible();
    await expect(page.getByText('You', { exact: true }).first(), 'the bidder cannot see their own row').toBeVisible();

    // ...and the number the UI sent is the number the server stored.
    const detail = (await (
      await request.get(`${API}/auctions/${slug}`, { headers: await bearer(request, DEMO.buyer) })
    ).json()) as AuctionDetail;
    expect(detail.standing?.yourMaxCents, 'the placed bid did not reach the server intact').toBe(cents);
    expect(errors, 'the lot page logged console errors').toEqual([]);
  });

  test('one account holds one revisable offer — and may revise downwards', async ({ request }) => {
    const slug = await liveLotSlug(request);

    const first = await bid(request, slug, 1_500);
    const second = await bid(request, slug, 900);

    // Two placements, one row: the book is "what each bidder offers now", not a
    // log of every attempt.
    expect(second.bidCount, 'the second bid stacked a new row instead of revising').toBe(first.bidCount);
    // No floor to clear — the revision downwards is the standing offer now, and
    // the highest offer on the book decides the lot at close.
    expect(second.standing?.yourMaxCents, 'a lower revision was not stored').toBe(90_000);

    const book = (await (
      await request.get(`${API}/auctions/${slug}/bids`, { headers: await bearer(request, DEMO.buyer) })
    ).json()) as AuctionBookRow[];
    const mine = book.filter((b) => b.isYou);
    expect(mine, 'one account holds more than one row on the book').toHaveLength(1);
    expect(mine[0].amountCents).toBe(90_000);
  });

  test('a bid on a closed lot is refused', async ({ request }) => {
    const settled = (await allLots(request)).filter((l) => past(l.auctionEndsAt));
    test.skip(settled.length === 0, 'no closed lot in the dataset');

    const res = await request.post(`${API}/auctions/${settled[0].slug}/bids`, {
      headers: await bearer(request, DEMO.buyer),
      data: { amount: (settled[0].highestCents ?? 0) / 100 + 500 },
    });
    expect(res.status(), 'a closed lot still accepted a bid').toBe(400);
    expect(await res.text()).toMatch(/ended/i);
  });

  test('only a buyer account can bid', async ({ request }) => {
    const slug = await liveLotSlug(request);
    const payload = { data: { amount: 1_100 } };

    const anon = await request.post(`${API}/auctions/${slug}/bids`, payload);
    expect(anon.status(), 'an anonymous caller placed a bid').toBe(401);

    const seller = await request.post(`${API}/auctions/${slug}/bids`, {
      ...payload,
      headers: await bearer(request, DEMO.seller),
    });
    expect(seller.status(), 'a seller account placed a bid').toBe(403);
  });
});

/* ══ forward auction — who may see what ═══════════════════════════ */

test.describe('auction privacy', () => {
  test('the book publishes every price and masks every bidder', async ({ page, request }) => {
    const slug = await liveLotSlug(request);
    await bid(request, slug, 1_000);

    // The lot's own seller is the one view allowed to see who is behind an offer,
    // so ask it for the name that must not appear anywhere else.
    const ownerBook = (await (
      await request.get(`${API}/auctions/${slug}/bids`, { headers: await bearer(request, DEMO.seller) })
    ).json()) as AuctionBookRow[];
    const realName = ownerBook[0]?.bidderName ?? '';
    expect(realName, 'the seller cannot see who bid on their own lot').toBeTruthy();

    const res = await request.get(`${API}/auctions/${slug}/bids`);
    const raw = await res.text();
    const book = JSON.parse(raw) as AuctionBookRow[];
    expect(book.length, 'the public book is empty').toBeGreaterThan(0);

    for (const row of book) {
      expect(row.amountCents, 'a price is missing from the public book').toBeGreaterThan(0);
      expect(row.masked, `"${row.masked}" is not a masked handle`).toMatch(/•••/);
      // API-05: a bidder id resolves to a full name through the public directory,
      // so it must never ship in a public payload.
      expect(row.bidderId, 'the public book leaked a bidder id').toBeNull();
      expect(row.bidderName, 'the public book leaked a bidder name').toBeNull();
    }
    expect(raw, 'a real bidder name leaked into the public book').not.toContain(realName);
    expect(raw, 'an email leaked into the public book').not.toMatch(/@[a-z]+\.(org|live|com)/i);

    // The masking must be real on the page too, not just in the payload.
    await page.goto(`/product/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Bid History')).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body, 'the lot page rendered a real bidder name').not.toContain(realName);
    expect(body, 'the bid history shows no masked handle at all').toMatch(/•••/);
  });

  test('the seller of the lot gets the real bidder behind each offer', async ({ request }) => {
    const slug = await liveLotSlug(request);
    await bid(request, slug, 1_000);

    // The counterparty they are about to hand a lot to cannot stay masked from
    // the seller — they have to be able to open a chat with them.
    const book = (await (
      await request.get(`${API}/auctions/${slug}/bids`, { headers: await bearer(request, DEMO.seller) })
    ).json()) as AuctionBookRow[];
    expect(book.length).toBeGreaterThan(0);
    expect(book[0].bidderId, 'the lot owner did not get the bidder id').toBeTruthy();
    expect(book[0].bidderName, 'the lot owner did not get the bidder name').toBeTruthy();
    expect(book[0].masked, 'the lot owner is still seeing a masked handle').toBe(book[0].bidderName);
  });

  test('a settled lot stays with the people who were in it and 404s for everyone else', async ({ request }) => {
    const sellerAuth = await bearer(request, DEMO.seller);
    const me = (await (await request.get(`${API}/me`, { headers: sellerAuth })).json()) as { id: string };
    // The "stranger" must not be the lot's own seller — the fixture lot is listed
    // by the demo seller, so it can never serve as the outsider here.
    const settled = (await allLots(request)).filter(
      (l) => past(l.auctionEndsAt) && l.bidCount > 0 && l.sellerId !== me.id,
    );
    test.skip(settled.length === 0, 'no settled lot with bids from another seller');
    const lot = settled[0];

    const anon = await request.get(`${API}/auctions/${lot.slug}`);
    expect(anon.status(), 'a stale link exposed a settled book to the public').toBe(404);

    // A signed-in account that neither owns the lot nor bid on it is no better off.
    const stranger = await request.get(`${API}/auctions/${lot.slug}`, { headers: sellerAuth });
    expect(stranger.status(), 'a non-participant read a settled lot').toBe(404);

    const asBidder = await request.get(`${API}/auctions/${lot.slug}`, { headers: await bearer(request, DEMO.buyer) });
    test.skip(asBidder.status() === 404, 'the demo buyer did not bid on that lot');
    expect(asBidder.ok(), 'a bidder lost access to a lot they were in').toBeTruthy();
  });

  test('a reserve is enforced without being disclosed', async ({ request }) => {
    const withReserve = (await allLots(request)).filter((l) => l.hasReserve && past(l.auctionEndsAt));
    test.skip(withReserve.length === 0, 'no closed lot carries a reserve');

    for (const lot of withReserve) {
      // The admin view is the only one that sees the number itself.
      expect(lot.reserveCents, `${lot.slug} has no reserve amount`).not.toBeNull();
      expect(lot.reserveMet, `${lot.slug} reports the wrong reserve state`).toBe(
        (lot.highestCents ?? 0) >= (lot.reserveCents ?? 0),
      );

      const asBidder = await request.get(`${API}/auctions/${lot.slug}`, { headers: await bearer(request, DEMO.buyer) });
      if (asBidder.status() === 404) continue; // the demo buyer was not in this lot
      const seen = (await asBidder.json()) as AuctionDetail;
      expect(seen.hasReserve, 'a bidder cannot tell the lot has a reserve').toBe(true);
      expect(seen.reserveMet, 'the reserve state differs between the two views').toBe(lot.reserveMet);
      // Knowing the number would tell a bidder exactly what to offer.
      expect(seen.reserveCents, 'the reserve amount leaked to a bidder').toBeNull();
      expect(seen.highBidderId, 'the winning bidder id leaked to another bidder').toBeNull();
      expect(seen.highBidder, 'the winning bidder name leaked to another bidder').toBeNull();
    }
  });

  test('a lot that closed under its reserve produced no winner', async ({ request }) => {
    const closed = (await allLots(request)).filter((l) => l.hasReserve && past(l.auctionEndsAt) && l.bidCount > 0);
    const missed = closed.filter((l) => !l.reserveMet);
    const met = closed.filter((l) => l.reserveMet);
    test.skip(missed.length === 0 || met.length === 0, 'need one settled lot each side of its reserve');

    const notes = (await (
      await request.get(`${API}/notifications`, { headers: await bearer(request, DEMO.buyer) })
    ).json()) as { type: string; data?: { slug?: string } }[];
    const wonSlugs = notes.filter((n) => n.type === 'auction.won').map((n) => n.data?.slug);

    // The notification feed is a 30-row window, so only assert while the settled
    // era is still inside it.
    test.skip(!met.some((l) => wonSlugs.includes(l.slug)), 'settlement notifications have scrolled out of the window');
    for (const lot of missed) {
      expect(wonSlugs, `${lot.slug} closed below its reserve but was awarded anyway`).not.toContain(lot.slug);
    }
  });
});

/* ══ reverse auction — buyer bids ═════════════════════════════════ */

test.describe('buyer bids', () => {
  test('the public board carries open reverse auctions only', async ({ page, request }) => {
    const live = (await (await request.get(`${API}/buyer-bids/live`)).json()) as BuyerBid[];
    for (const row of live) {
      expect(row.mode, `${row.reference} is on the public board in quote mode`).toBe('auction');
      expect(row.status, `${row.reference} is on the board while ${row.status}`).toBe('open');
      expect(past(row.auctionEndsAt), `${row.reference} is on the board after closing`).toBe(false);
    }

    await page.goto('/bids', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Buyer Bids' })).toBeVisible();
    const body = await page.locator('body').innerText();

    // The page must show exactly what the API publishes — no more, no less.
    if (live.length === 0) {
      expect(body, 'the board renders rows the API does not publish').toContain('No live buyer bids');
    } else {
      for (const row of live) await expect(page.getByText(row.title).first()).toBeVisible();
    }

    const mine = await myRequirements(request);
    const closed = mine.filter((r) => r.mode === 'auction' && past(r.auctionEndsAt));
    for (const row of closed) {
      expect(body, `${row.reference} is closed but still on the public board`).not.toContain(row.title);
    }
  });

  test('a quote-mode requirement stays sealed to everyone but its buyer', async ({ page, request }) => {
    const mine = await myRequirements(request);
    const sealed = mine.find((r) => r.mode === 'quote' && r.status === 'open' && !past(r.deadline));
    test.skip(!sealed, 'no open quote-mode requirement seeded');
    // Learn the identity that must NOT escape from the only view allowed to see it.
    const hidden = await realBidderName(request, sealed!.id);

    const detailRes = await request.get(`${API}/buyer-bids/${sealed!.id}`);
    expect(detailRes.ok(), 'the requirement is not publicly readable').toBeTruthy();
    const raw = await detailRes.text();
    const detail = JSON.parse(raw) as BuyerBid & { sellerBids: unknown[]; isOwner: boolean };

    expect(detail.isOwner).toBe(false);
    expect(detail.sellerBids, 'a sealed requirement handed out its offers').toEqual([]);
    // Sealed means sealed: not even the price to beat is published in quote mode.
    expect(detail.bestPriceCents, 'a sealed requirement published its best price').toBeNull();
    if (hidden) expect(raw, 'a seller name leaked from a sealed requirement').not.toContain(hidden);
    expect(raw, 'an email leaked from a sealed requirement').not.toMatch(/@[a-z]+\.(org|live|com)/i);

    const book = (await (await request.get(`${API}/buyer-bids/${sealed!.id}/bids`)).json()) as SellerBidRow[];
    expect(book, 'the sealed book was served to a logged-out visitor').toEqual([]);

    await page.goto(`/bid/${sealed!.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(sealed!.title).first()).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body, 'the sealed note is missing from the room').toMatch(/stay private/i);
    if (hidden) expect(body, 'the bid room rendered a seller name to a stranger').not.toContain(hidden);
  });

  test('the bid book names a seller only to the buyer who raised the requirement', async ({ request }) => {
    const found = await requirementIBidOn(request, (r) => r.bestPriceCents != null);
    test.skip(!found, 'the demo seller has no offer on any of the buyer\'s requirements');
    const id = found!.requirement.id;

    const owner = (await (
      await request.get(`${API}/buyer-bids/${id}/bids`, { headers: await bearer(request, DEMO.buyer) })
    ).json()) as SellerBidRow[];
    expect(owner.length, 'the buyer sees no offers on their own requirement').toBeGreaterThan(0);
    expect(owner[0].sellerId, 'the buyer cannot reach the seller who bid').toBeTruthy();
    // The buyer awards the deal and opens a chat, so they get the real company.
    expect(owner[0].masked, 'the buyer is still seeing a masked seller').not.toMatch(/•••/);
    const real = owner[0].masked;

    // The seller who bid sees their own row — and no handle on anyone else.
    const { rows: asBidder, raw: bidderRaw } = await sellerBook(request, id, DEMO.seller);
    expect(asBidder.length, 'the seller lost sight of their own offer').toBeGreaterThan(0);
    for (const row of asBidder) {
      expect(row.sellerId, 'a non-owner was handed a real seller id').toBeNull();
      expect(row.masked, 'a non-owner saw an unmasked seller').toMatch(/^You$|•••/);
    }
    expect(bidderRaw, 'a seller name leaked to a non-owner').not.toContain(real);

    // A stranger gets nothing at all once the requirement has closed.
    if (past(found!.requirement.auctionEndsAt) || found!.requirement.status !== 'open') {
      const stranger = await sellerBook(request, id, DEMO.transporter);
      expect(stranger.status, 'a settled book was served to a non-participant').toBe(404);
    }
  });

  test('one seller offer per requirement — re-quoting revises it, up or down', async ({ request }) => {
    const found = await requirementIBidOn(
      request,
      (r) => r.status === 'open' && !past(r.deadline) && !past(r.auctionEndsAt),
    );
    test.skip(!found, 'the demo seller has no standing offer on an open requirement');
    const { requirement, own } = found!;
    const sellerAuth = await bearer(request, DEMO.seller);

    const quote = (priceCents: number) =>
      request.post(`${API}/buyer-bids/${requirement.id}/bids`, {
        headers: sellerAuth,
        data: {
          priceCents,
          qtyValue: own.qtyValue,
          etaDays: own.etaDays ?? undefined,
          message: own.message ?? undefined,
        },
      });
    const submit = async (priceCents: number) => {
      const res = await quote(priceCents);
      expect(res.ok(), `quote of ${priceCents} refused: ${res.status()} ${await res.text()}`).toBeTruthy();
    };
    const rows = async () => (await sellerBook(request, requirement.id, DEMO.seller)).rows.filter((b) => b.isYou);

    try {
      // Down, then back up: the revision UP has to stick too. Ranking a seller by
      // the cheapest row they ever typed is the bug this guards.
      await submit(own.priceCents - 500);
      let after = await rows();
      expect(after, 'a revision stacked a second offer on the book').toHaveLength(1);
      expect(after[0].priceCents).toBe(own.priceCents - 500);
      expect(after[0].id, 'the revision replaced the row instead of updating it').toBe(own.id);

      await submit(own.priceCents + 900);
      after = await rows();
      expect(after, 'a second revision stacked another offer').toHaveLength(1);
      expect(after[0].priceCents, 'a revision upwards was silently dropped').toBe(own.priceCents + 900);
    } finally {
      // Put the offer back exactly as it was, so the run is repeatable. Not
      // asserted: a failing restore must not mask the failure that caused it.
      await quote(own.priceCents);
    }
  });

  test('an offer on a closed reverse auction is refused, and only sellers may quote', async ({ request }) => {
    const mine = await myRequirements(request);
    const closed = mine.find((r) => past(r.auctionEndsAt) || past(r.deadline) || r.status !== 'open');
    test.skip(!closed, 'no closed requirement in the dataset');

    const late = await request.post(`${API}/buyer-bids/${closed!.id}/bids`, {
      headers: await bearer(request, DEMO.seller),
      data: { priceCents: 10_000, qtyValue: 10 },
    });
    expect(late.status(), 'a closed requirement still accepted an offer').toBe(400);
    expect(await late.text()).toMatch(/ended|closed|deadline/i);

    const open = mine.find((r) => r.status === 'open' && !past(r.deadline) && !past(r.auctionEndsAt));
    test.skip(!open, 'no open requirement to probe the role guard with');
    const asBuyer = await request.post(`${API}/buyer-bids/${open!.id}/bids`, {
      headers: await bearer(request, DEMO.buyer),
      data: { priceCents: 10_000, qtyValue: 10 },
    });
    expect(asBuyer.status(), 'a buyer submitted a seller offer').toBe(403);
  });
});

/* ══ requirements board ═══════════════════════════════════════════ */

test.describe('requirements board', () => {
  test('search narrows the board to exactly what the API returns', async ({ page, request }) => {
    const all = (await (await request.get(`${API}/community/requirements`)).json()) as Requirement[];
    test.skip(all.length < 2, 'need at least two requirements to prove a filter');

    // Pick a product name that actually excludes something.
    let term = '';
    let matches: Requirement[] = [];
    for (const r of all) {
      const hit = (await (
        await request.get(`${API}/community/requirements?search=${encodeURIComponent(r.productName)}`)
      ).json()) as Requirement[];
      if (hit.length > 0 && hit.length < all.length) {
        term = r.productName;
        matches = hit;
        break;
      }
    }
    test.skip(!term, 'no product name narrows the board');
    const excluded = all.filter((r) => !matches.some((m) => m.id === r.id));

    await page.goto('/requirements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(all[0].title).first()).toBeVisible();

    await page.getByPlaceholder(/search requirements/i).fill(term);
    for (const row of excluded) {
      await expect(page.getByText(row.title), `"${row.title}" survived a search for "${term}"`).toHaveCount(0);
    }
    for (const row of matches) await expect(page.getByText(row.title).first()).toBeVisible();
  });

  test('a requirement lists the offers its badge counts', async ({ page, request }) => {
    const all = (await (await request.get(`${API}/community/requirements`)).json()) as Requirement[];
    const target = all.find((r) => (r._count?.responses ?? 0) > 0);
    test.skip(!target, 'no requirement has a seller offer on it');

    const detail = (await (await request.get(`${API}/community/requirements/${target!.id}`)).json()) as {
      responses: { responder?: { name: string }; priceText: string | null }[];
    };
    expect(detail.responses.length, 'the count and the offers disagree').toBe(target!._count?.responses);

    await page.goto('/requirements', { waitUntil: 'domcontentloaded' });
    // Narrow to the one card first — clicking "View" on the wrong row would
    // assert against somebody else's offers.
    await page.getByPlaceholder(/search requirements/i).fill(target!.title);
    await expect(page.getByText(target!.title).first()).toBeVisible();
    await expect(page.getByText(`${detail.responses.length} offer`).first()).toBeVisible();

    await page.getByRole('button', { name: /^(view|respond)$/i }).first().click();
    await expect(page.getByText('Seller offers').first()).toBeVisible();
    for (const offer of detail.responses) {
      if (offer.responder?.name) await expect(page.getByText(offer.responder.name).first()).toBeVisible();
      if (offer.priceText) await expect(page.getByText(offer.priceText).first()).toBeVisible();
    }
  });
});
