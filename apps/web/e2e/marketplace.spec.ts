import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { API, DEMO, signIn } from './helpers';

/**
 * Tier 2 — the shopper's path: browse → filter → listing → cart → checkout.
 *
 * Nothing here hardcodes a seeded id, price or count. Every expectation is read
 * from the API at run time and then compared against what the browser painted,
 * because the dev catalog is shared and mutates under the suite. That also makes
 * this the right net for the bug the market panel keeps hitting: a facet that
 * says 6 while 4 listings render.
 *
 * Read-only by design. The cart lives in localStorage, so a checkout can be
 * assembled and its arithmetic checked without ever POSTing an order — the two
 * guards that stop a submit (anonymous visitor, non-buyer account) are asserted
 * instead, which is the behaviour that matters and leaves no rows behind.
 */

/** The grid's page size — MarketPage's `PAGE_SIZE`. */
const PAGE_SIZE = 24;

const enc = encodeURIComponent;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface FacetOption { value: string; label: string; count: number }
interface Facets {
  categories: FacetOption[];
  subcategories: FacetOption[];
  countries: FacetOption[];
  cities: FacetOption[];
  grades: FacetOption[];
  markets: FacetOption[];
  attributes: { key: string; label: string; type: string; options: FacetOption[] }[];
  flags: { safe: number; direct: number; negotiable: number; fixed: number; offer: number; auction: number; verified: number };
  priceRange: { minCents: number | null; maxCents: number | null };
}
interface ApiListing {
  id: string;
  slug: string;
  name: string;
  priceCents: number | null;
  unit: string;
  moq: string | null;
  stockQty: number | null;
  imageUrl: string | null;
  isAuction: boolean;
  categoryId: string | null;
  subcategoryId: string | null;
  seller?: { id: string; name: string } | null;
}
interface Paged { items: ApiListing[]; total: number }
interface TaxonNode { id: string; name: string; emoji: string | null; parentId: string | null }

async function json<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`);
  expect(res.ok(), `GET ${path} -> ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()) as T;
}

const products = (request: APIRequestContext, query = '') =>
  json<Paged>(request, `/products${query ? `?${query}` : ''}`);
const facetsOf = (request: APIRequestContext, query = '') =>
  json<Facets>(request, `/products/facets${query ? `?${query}` : ''}`);

/**
 * Reference data only — the taxonomy is 14k nodes and does not change during a
 * run, so re-fetching it per test is pure throttler pressure. Listings and
 * facets are deliberately NOT cached: they are the thing under test.
 */
const TAXONOMY = new Map<string, Promise<TaxonNode[]>>();
function subtree(request: APIRequestContext, categoryId: string): Promise<TaxonNode[]> {
  let hit = TAXONOMY.get(categoryId);
  if (!hit) {
    hit = json<TaxonNode[]>(request, `/categories/${categoryId}/subtree?depth=all`);
    TAXONOMY.set(categoryId, hit);
    hit.catch(() => TAXONOMY.delete(categoryId));
  }
  return hit;
}

/**
 * The listings the grid actually painted, in render order.
 *
 * A ProductCard carries two anchors to the same `/product/:slug` (the image and
 * the title), so dedupe while preserving order. The header and footer hold no
 * product links, which is what makes a page-wide query safe here.
 */
async function renderedSlugs(page: Page): Promise<string[]> {
  const hrefs = await page
    .locator('a[href^="/product/"]')
    .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''));
  const out: string[] = [];
  for (const href of hrefs) {
    const slug = href.slice('/product/'.length);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out;
}

/** The "N verified products" line — the grid's own count of what it matched. */
const summary = (n: number) => new RegExp(`\\b${n} verified products`);

async function gotoMarket(page: Page, query = '') {
  await page.goto(`/market${query ? `?${query}` : ''}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Marketplace', level: 1 })).toBeVisible();
}

/** Money exactly as CurrencyContext renders it in USD (`formatMoney`, rate 1). */
const money = (usdCents: number) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(usdCents / 100);

/** Digits out of a rendered money string, so grouping and symbol never matter. */
const amountOf = (text: string) => Number(text.replace(/[^0-9.]/g, ''));

/** `enums:unitShort` — the suffix the price is quoted in. */
const UNIT_SHORT: Record<string, string> = {
  KG: 'KG', MT: 'MT', QUINTAL: 'QTL', TON: 'TON', BAG: 'BAG', PIECE: 'PC',
};
const ANY_UNIT_SUFFIX = /^\/(KG|MT|QTL|TON|BAG|PC)$/;

test.beforeEach(async ({ page }) => {
  // Locale and display currency are read from localStorage on boot. Pinning both
  // keeps the expected strings deterministic on any machine.
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('currency', 'USD');
  });
});

/* ── browse ───────────────────────────────────────────────────────── */

test.describe('marketplace browse', () => {
  test('every facet count equals the number of listings that filter returns', async ({ page, request }) => {
    const facets = await facetsOf(request);

    // One representative option per facet family, chosen from live data. The
    // groups whose two boxes fold into a tri-state (listing type, seller
    // verification) are included because that mapping is its own failure mode.
    const cases: { name: string; query: string; count: number }[] = [];
    const push = (name: string, query: string, count: number | undefined) => {
      if (count !== undefined) cases.push({ name, query, count });
    };
    const topCategory = facets.categories.find((c) => c.count > 0);
    expect(topCategory, 'no category has a listing behind it — seed data missing').toBeTruthy();
    push(`category "${topCategory!.label}"`, `categoryId=${enc(topCategory!.value)}`, topCategory!.count);
    if (facets.countries[0]) {
      push(`country "${facets.countries[0].label}"`, `country=${enc(facets.countries[0].value)}`, facets.countries[0].count);
    }
    if (facets.grades[0]) {
      push(`grade "${facets.grades[0].label}"`, `grade=${enc(facets.grades[0].value)}`, facets.grades[0].count);
    }
    push('listing type: auctions', 'listing=auction', facets.flags.auction);
    push('listing type: offers', 'listing=offer', facets.flags.offer);
    push('verified sellers', 'verified=true', facets.flags.verified);

    for (const c of cases) {
      await gotoMarket(page, c.query);
      // The count the grid reports for itself must be the count the panel
      // promised on the box — this is the "facet says 6, grid shows 4" bug.
      await expect(
        page.getByText(summary(c.count)).first(),
        `${c.name}: the panel counted ${c.count}, the grid reported a different total`,
      ).toBeVisible();

      if (c.count === 0) {
        // "0 verified products" is also what the skeleton shows, so wait for the
        // empty state before believing an empty grid.
        await expect(page.getByText('Your searched product is not available').first()).toBeVisible();
      }
      const slugs = await renderedSlugs(page);
      const expected = Math.min(c.count, PAGE_SIZE);
      expect(slugs.length, `${c.name}: ${expected} cards expected on page 1, ${slugs.length} rendered`).toBe(expected);
    }
  });

  test('ticking a category box narrows the grid, chips the choice, and Clear all restores it', async ({
    page,
    request,
  }) => {
    const [all, facets] = await Promise.all([products(request, 'pageSize=1'), facetsOf(request)]);
    const category = facets.categories.find((c) => c.count > 0 && c.count < all.total);
    test.skip(!category, 'every listing sits in one category — no category can narrow the grid');

    await gotoMarket(page);
    await expect(page.getByText(summary(all.total)).first()).toBeVisible();

    // The box reads "<emoji> <label> <count>"; anchor on the label itself.
    await page
      .getByRole('checkbox', { name: new RegExp(`(^|\\s)${escapeRe(category!.label)}(\\s|$)`) })
      .check();

    await expect(page.getByRole('button', { name: `Remove filter ${category!.label}` })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`categoryId=${escapeRe(category!.value)}`));
    await expect(page.getByText(summary(category!.count)).first()).toBeVisible();
    expect(await renderedSlugs(page)).toHaveLength(Math.min(category!.count, PAGE_SIZE));

    await page.getByRole('button', { name: 'Clear all' }).first().click();
    await expect(page).not.toHaveURL(/categoryId=/);
    await expect(page.getByText(summary(all.total)).first()).toBeVisible();
  });

  test('the price range is typed in dollars and filtered in cents', async ({ page, request }) => {
    const all = await products(request, 'pageSize=60');
    const priced = [...new Set(all.items.map((p) => p.priceCents).filter((c): c is number => typeof c === 'number'))]
      .sort((a, b) => a - b);
    test.skip(priced.length < 4, 'need at least four distinct prices to bound a strict subset');

    // A window that excludes the cheapest and the dearest, so the filter has to
    // do something visible.
    const lo = priced[1];
    const hi = priced[priced.length - 2];
    const expected = await products(request, `pageSize=60&minPrice=${lo}&maxPrice=${hi}`);
    expect(expected.total, 'the price window matched nothing').toBeGreaterThan(0);
    expect(expected.total, 'the price window matched everything — it proves nothing').toBeLessThan(all.total);

    // The panel's inputs are dollars; the API filters integer cents. This
    // navigation is that ×100 conversion under test.
    await gotoMarket(page, `minPrice=${lo / 100}&maxPrice=${hi / 100}`);
    await expect(
      page.getByText(summary(expected.total)).first(),
      `$${lo / 100}–$${hi / 100} should match ${expected.total} listings`,
    ).toBeVisible();
    // The removable chip has to repeat the dollars the buyer typed, not cents.
    await expect(page.getByRole('button', { name: `Remove filter $${lo / 100}–$${hi / 100}` })).toBeVisible();
    if (expected.total <= PAGE_SIZE) {
      expect((await renderedSlugs(page)).sort()).toEqual(expected.items.map((p) => p.slug).sort());
    }
  });

  test('search narrows the grid to the listings the API matches', async ({ page, request }) => {
    const all = await products(request, 'pageSize=60');
    // The longest word of a real listing name — distinctive enough to narrow.
    const words = all.items
      .flatMap((p) => p.name.split(/\s+/))
      .filter((w) => /^[A-Za-z]{6,}$/.test(w))
      .sort((a, b) => b.length - a.length);
    test.skip(words.length === 0, 'no listing name has a searchable word');
    const term = words[0];

    const expected = await products(request, `pageSize=60&search=${enc(term)}`);
    expect(expected.total, `"${term}" matched nothing`).toBeGreaterThan(0);
    expect(expected.total, `"${term}" matched every listing — it proves nothing`).toBeLessThan(all.total);

    await gotoMarket(page);
    await page.getByPlaceholder(/Search products/).fill(term);

    await expect(page).toHaveURL(new RegExp(`search=${escapeRe(enc(term))}`, 'i'));
    await expect(page.getByText(summary(expected.total)).first()).toBeVisible();
    if (expected.total <= PAGE_SIZE) {
      expect((await renderedSlugs(page)).sort()).toEqual(expected.items.map((p) => p.slug).sort());
    }
  });

  test('a filter that matches nothing shows the empty state, and Clear filters brings the grid back', async ({
    page,
    request,
  }) => {
    const all = await products(request, 'pageSize=1');

    await gotoMarket(page, `search=${enc(`zzq-no-such-listing-${Date.now()}`)}`);
    await expect(page.getByText('Your searched product is not available').first()).toBeVisible();
    await expect(page.getByText('No products match these filters.').first()).toBeVisible();
    expect(await renderedSlugs(page), 'the empty state still rendered listings').toEqual([]);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).not.toHaveURL(/search=/);
    await expect(page.getByText(summary(all.total)).first()).toBeVisible();
    expect(await renderedSlugs(page)).toHaveLength(Math.min(all.total, PAGE_SIZE));
  });

  test('sorting by price reorders the grid into the order the API returns', async ({ page, request }) => {
    const asc = await products(request, `page=1&pageSize=${PAGE_SIZE}&sort=price_asc`);
    test.skip(asc.items.length < 2, 'need at least two listings to observe an order');

    // The API has to actually sort, or the comparison below would be circular.
    const prices = asc.items.map((p) => p.priceCents ?? 0);
    expect(prices, 'price_asc did not come back ascending').toEqual([...prices].sort((a, b) => a - b));

    await gotoMarket(page);
    await page.getByLabel('Sort: Relevance').selectOption('price_asc');
    await expect(page).toHaveURL(/sort=price_asc/);
    // keepPreviousData leaves the old order on screen until the refetch lands.
    await expect
      .poll(async () => (await renderedSlugs(page)).join(','), { timeout: 10_000 })
      .toBe(asc.items.map((p) => p.slug).join(','));

    const desc = await products(request, `page=1&pageSize=${PAGE_SIZE}&sort=price_desc`);
    await page.getByLabel('Sort: Relevance').selectOption('price_desc');
    await expect
      .poll(async () => (await renderedSlugs(page)).join(','), { timeout: 10_000 })
      .toBe(desc.items.map((p) => p.slug).join(','));
    expect(desc.items[0].slug, 'price_desc opened on the same listing as price_asc').not.toBe(asc.items[0].slug);
  });

  test('drilling into the deep taxonomy falls back to the nearest branch that has stock', async ({
    page,
    request,
  }) => {
    const all = await products(request, 'pageSize=60');

    // A listing whose subcategory has children — i.e. somewhere a buyer can
    // legitimately drill PAST where the seller listed.
    let found: { listing: ApiListing; node: TaxonNode; child: TaxonNode } | null = null;
    for (const listing of all.items.slice(0, 8)) {
      if (!listing.categoryId || !listing.subcategoryId) continue;
      const tree = await subtree(request, listing.categoryId);
      const node = tree.find((n) => n.id === listing.subcategoryId);
      // The panel opens on the category's top level, so only a level-1 node is
      // one click away; anything deeper needs a different walk.
      if (!node || node.parentId) continue;
      for (const child of tree.filter((n) => n.parentId === node.id).slice(0, 4)) {
        const under = await products(
          request,
          `categoryId=${enc(listing.categoryId)}&subcategoryId=${enc(child.id)}&subcategory=${enc(child.name)}`,
        );
        // An empty child branch is what makes the API climb back up.
        if (under.total === 0) {
          found = { listing, node, child };
          break;
        }
      }
      if (found) break;
    }
    test.skip(!found, 'no top-level listed subcategory has an empty child branch to drill into');
    const { listing, node, child } = found!;
    const label = (n: TaxonNode) => (n.emoji ? `${n.emoji} ${n.name}` : n.name);

    // The drill-down only appears with exactly one category ticked.
    await gotoMarket(page, `categoryId=${enc(listing.categoryId!)}`);
    const nodeButton = page.getByRole('button', { name: label(node), exact: true });
    await expect(nodeButton, `"${node.name}" is missing from the subcategory drill-down`).toBeVisible();
    await nodeButton.click();

    await expect(page).toHaveURL(new RegExp(`subcategoryId=${escapeRe(listing.subcategoryId!)}`));
    // Branch-inclusive: picking the parent still returns the seller's listing.
    await expect
      .poll(async () => (await renderedSlugs(page)).includes(listing.slug), { timeout: 10_000 })
      .toBe(true);

    await page.getByRole('button', { name: label(child), exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`subcategoryId=${escapeRe(child.id)}`));

    // Nothing is listed this deep, so the API climbs to the parent branch and
    // the page offers that stock instead of a dead end.
    await expect(page.getByText(`Nothing is listed under "${child.name}" right now.`).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: `Similar products from ${node.name}` })).toBeVisible();
    expect(await renderedSlugs(page), 'the fallback did not offer the parent branch stock').toContain(listing.slug);
  });

  test('a leaf subcategory renders the attribute facets the API defines for it', async ({ page, request }) => {
    const facets = await facetsOf(request);
    // Only subcategories that hold listings are reachable in the panel, so those
    // are the ones worth probing.
    let leaf: { option: FacetOption; fields: Facets['attributes'] } | null = null;
    for (const option of facets.subcategories.slice(0, 3)) {
      const scoped = await facetsOf(request, `subcategoryId=${enc(option.value)}&subcategory=${enc(option.label)}`);
      if (scoped.attributes.length > 0) {
        leaf = { option, fields: scoped.attributes };
        break;
      }
    }
    test.skip(
      !leaf,
      'no listed subcategory defines attribute fields — Subcategory.attrFields is empty in this database, so the panel has nothing to render',
    );

    await gotoMarket(page, `subcategoryId=${enc(leaf!.option.value)}&subcategory=${enc(leaf!.option.label)}`);
    for (const field of leaf!.fields) {
      // Each field is its own collapsible group, titled with its localized label.
      await expect(
        page.getByRole('button', { name: new RegExp(escapeRe(field.label)) }).first(),
        `attribute facet "${field.label}" is missing from the panel`,
      ).toBeVisible();
    }
  });
});

/* ── listing detail ───────────────────────────────────────────────── */

/** A plain (non-auction) listing — auction lots render the bid room instead. */
async function shoppableListing(request: APIRequestContext): Promise<ApiListing> {
  const all = await products(request, 'pageSize=60');
  const listing = all.items.find((p) => !p.isAuction && p.priceCents != null && p.seller?.id);
  expect(listing, 'no buyable listing in the catalog').toBeTruthy();
  return json<ApiListing>(request, `/products/${listing!.slug}`);
}

test.describe('product detail', () => {
  test('the listing page shows its price, unit, stock, MOQ, seller and photo', async ({ page, request }) => {
    const detail = await shoppableListing(request);
    const crashes: string[] = [];
    page.on('pageerror', (e) => crashes.push(e.message));

    await page.goto(`/product/${detail.slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: detail.name, level: 1 })).toBeVisible();

    // Price is converted from the cents baseline, never echoed from the legacy
    // string — a listing quoted in another currency must not print under a "$".
    await expect(page.getByText(money(detail.priceCents!), { exact: true }).first()).toBeVisible();
    const short = UNIT_SHORT[detail.unit.replace(/[^A-Za-z]/g, '').toUpperCase()];
    await expect(
      short ? page.getByText(`/${short}`, { exact: true }).first() : page.getByText(ANY_UNIT_SUFFIX).first(),
    ).toBeVisible();

    if (detail.moq) await expect(page.getByText(`MOQ ${detail.moq}`, { exact: false }).first()).toBeVisible();
    if (typeof detail.stockQty === 'number' && detail.stockQty > 0) {
      await expect(page.getByText(new RegExp(`\\b${detail.stockQty} \\w+ in stock`)).first()).toBeVisible();
    }
    await expect(page.getByText(detail.seller!.name, { exact: false }).first()).toBeVisible();
    // Breadcrumb back to the grid — the header's own link is labelled "Buy".
    await expect(page.getByRole('link', { name: 'Market', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();

    // A stored photo that 404s silently swaps itself for an emoji tile, so the
    // only honest check is that the bitmap decoded.
    if (detail.imageUrl) {
      const stage = page.getByRole('img', { name: detail.name });
      await expect(stage, 'the listing photo fell back to a placeholder').toBeVisible();
      await expect
        .poll(() => stage.evaluate((el) => (el as HTMLImageElement).naturalWidth), { timeout: 10_000 })
        .toBeGreaterThan(0);
    }

    expect(crashes, 'the listing page threw').toEqual([]);
  });

  test('an anonymous visitor who adds to cart is sent to sign in', async ({ page, request }) => {
    const detail = await shoppableListing(request);

    await page.goto(`/product/${detail.slug}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Add to cart' }).click();

    // No guest cart: the line is never stored, and the visitor lands on /login.
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('agrotraders.cart'))).toBeFalsy();
  });
});

/* ── seller surfaces ──────────────────────────────────────────────── */

test.describe('seller profiles', () => {
  test('the sellers directory links through to a profile whose listings all resolve', async ({ page, request }) => {
    const all = await products(request, 'pageSize=60');
    const listing = all.items.find((p) => p.seller?.id);
    expect(listing, 'no listing carries a seller').toBeTruthy();
    const seller = listing!.seller!;

    await page.goto('/sellers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Verified Sellers', level: 1 })).toBeVisible();

    const card = page.locator(`a[href="/u/${seller.id}"]`).first();
    await expect(card, `${seller.name} is missing from the sellers directory`).toBeVisible();
    await card.click();

    await expect(page).toHaveURL(new RegExp(`/u/${escapeRe(seller.id)}$`));
    await expect(page.getByRole('heading', { name: seller.name, level: 1 })).toBeVisible();
    // Contact details are deliberately never sent to the client.
    await expect(page.getByText('Phone numbers and emails are private', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Listings' })).toBeVisible();
    await expect(page.locator(`a[href="/product/${listing!.slug}"]`).first()).toBeVisible();

    /**
     * Every listing the profile advertises has to be openable. The profile
     * selects on `approved`, while the detail route 404s anything whose `status`
     * is not `live` — two different predicates over the same rows, so a listing
     * hidden without also clearing `approved` becomes a dead link here.
     */
    const profile = await json<{ products: { slug: string; name: string }[] }>(
      request,
      `/directory/profile/${seller.id}`,
    );
    for (const advertised of profile.products) {
      const res = await request.get(`${API}/products/${advertised.slug}`);
      expect(
        res.status(),
        `"${advertised.name}" is listed on ${seller.name}'s public profile but its page ${res.status()}s`,
      ).toBe(200);
    }
  });
});

/* ── checkout ─────────────────────────────────────────────────────── */

test.describe('checkout', () => {
  /** Puts one line in the browser's cart without walking the listing page. */
  const seedCart = (page: Page, slug: string, qty: number) =>
    page.evaluate(
      ([s, q]) => localStorage.setItem('agrotraders.cart', JSON.stringify([{ slug: s, qty: q }])),
      [slug, qty] as const,
    );

  async function buyable(request: APIRequestContext) {
    const detail = await shoppableListing(request);
    // MOQ is free text ("25 MT"); the quantity box clamps to it.
    const moq = Math.max(1, Math.ceil(Number.parseFloat(detail.moq ?? '1') || 1));
    return { detail, moq };
  }

  test('checkout is refused to an anonymous visitor, in the browser and at the API', async ({ page, request }) => {
    const { detail, moq } = await buyable(request);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedCart(page, detail.slug, moq);
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });

    // A full cart is not a session: ProtectedRoute bounces to sign-in.
    await expect(page).toHaveURL(/\/login$/);

    // And the door behind it is locked too — a hand-rolled POST gets nowhere.
    for (const path of ['/orders', '/orders/enquiry']) {
      const res = await request.post(`${API}${path}`, { data: { productSlug: detail.slug, qty: moq } });
      expect(res.status(), `POST ${path} without a token`).toBe(401);
    }
  });

  test('the estimated total is quantity × the listing price, and follows a quantity change', async ({
    page,
    request,
  }) => {
    const { detail, moq } = await buyable(request);
    await signIn(page, request, DEMO.buyer);
    await seedCart(page, detail.slug, moq);

    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: detail.name })).toBeVisible();
    await expect(page.getByText(detail.seller!.name, { exact: false }).first()).toBeVisible();

    const total = page.getByText('Estimated total').first().locator('xpath=..');
    await expect
      .poll(async () => amountOf(await total.innerText()), { timeout: 10_000 })
      .toBe((detail.priceCents! * moq) / 100);

    // Restating the quantity has to move the money with it.
    const bigger = moq * 3;
    const qty = page.getByLabel('Quantity', { exact: true }).first();
    await qty.fill(String(bigger));
    await qty.blur();
    await expect
      .poll(async () => amountOf(await total.innerText()), { timeout: 10_000 })
      .toBe((detail.priceCents! * bigger) / 100);

    // One order per listing, grouped by seller — stated before anything is sent.
    await expect(page.getByText(/\b1 orders? to 1 sellers?\b/).first()).toBeVisible();

    await page.evaluate(() => localStorage.removeItem('agrotraders.cart'));
  });

  test('an account without the buyer role cannot place the order', async ({ page, request }) => {
    const { detail, moq } = await buyable(request);
    await signIn(page, request, DEMO.seller);
    await seedCart(page, detail.slug, moq);

    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible();

    const submitted: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/orders(\/enquiry)?$/.test(new URL(r.url()).pathname)) submitted.push(r.url());
    });

    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByText('Only buyer accounts can place orders.').first()).toBeVisible();
    expect(submitted, 'the role guard let an order through').toEqual([]);

    await page.evaluate(() => localStorage.removeItem('agrotraders.cart'));
  });
});
