import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { API, currentUser, DEMO, failOnConsoleErrors, signIn, token } from './helpers';

/**
 * Strict per-role console sweep.
 *
 * `console.spec.ts` walks slugs like `dash` and `reviews` that are NOT nav ids
 * for the role it walks them with. `ConsolePage.resolveSection` degrades an
 * unknown slug to the dashboard, so that sweep asserts "the dashboard painted"
 * forty-odd times and would stay green with every real section deleted.
 *
 * This spec navigates only the ids that exist in `NAV`/`SERVICE_NAV` and pins
 * each one to content that ONLY that section renders — the heading its own
 * component mounts, plus (where the title is a generic word like "Wallet" or
 * "Invoices") a line of body copy unique to that role's variant. The dashboard
 * fallback fails every one of those, which is the whole point.
 *
 * Expected strings were read out of the components and `packages/i18n/locales/
 * en/web.json`; the suite runs with `Accept-Language: en` (playwright.config.ts).
 */

interface Sec {
  id: string;
  /** Exact text of the FIRST <h1>/<h2> inside <main>. Omitted for the two
   *  sections that render no heading at all (billing, profile). */
  heading?: string;
  /** A line only this section renders. */
  text?: string;
  /** Content that must NOT be present — used where a section is also embedded
   *  in that role's dashboard, so the heading alone could be argued about. */
  absent?: string;
}

/** Available in every role's console, from ConsolePage's `extras`. */
const EXTRAS: Sec[] = [
  // BillingSection renders no h1/h2 — "Your plan" labels the current-plan card.
  { id: 'billing', text: 'Your plan' },
  { id: 'hires', heading: 'Hires' },
  { id: 'verify', heading: 'Verification', text: 'Upload your business and identity documents' },
  // ProfileForm renders no h1/h2 either — "Public profile" is its first card.
  { id: 'profile', text: 'Public profile' },
  { id: 'access', heading: 'Roles & Access', text: 'You can operate multiple dashboards from one account.' },
];

const WALLET_SUB = 'Add funds to pay for orders';
const EARNINGS_SUB = 'What you have earned from completed work.';

/** `Welcome back, {{name}}` uses only the first word of the account name. */
const welcome = (name: string) => `Welcome back, ${name.split(' ')[0]}`;

const BUYER = (name: string): Sec[] => [
  { id: 'dashboard', heading: welcome(name), text: 'live procurement activity' },
  { id: 'browse', heading: 'Browse Products', text: 'Sourcing across grains' },
  { id: 'orders', heading: 'My Orders' },
  { id: 'bids', heading: 'Buyer Bids', text: 'Post what you need. Sellers come to you.' },
  { id: 'auctions', heading: 'Auctions', text: 'Bid on seller lots' },
  { id: 'saved', heading: 'Saved', text: 'bookmarked for quick re-ordering' },
  { id: 'safedeal', heading: 'Safe Deal', text: 'Escrow balance' },
  { id: 'transport', heading: 'Transport', text: 'Track freight from origin to your warehouse.' },
  { id: 'wallet', heading: 'Wallet', text: WALLET_SUB },
  // The buyer's Invoices is BuyerExtras.InvoicesSection, not the shared
  // InvoiceCenter — no issued/received tabs, and its own subtitle.
  { id: 'invoices', heading: 'Invoices', text: 'Every invoice raised against you' },
  { id: 'messages', heading: 'Messages', text: 'Chat with the sellers and carriers behind your orders.' },
];

const SELLER = (name: string): Sec[] => [
  { id: 'dashboard', heading: welcome(name), text: 'Order volume' },
  { id: 'inventory', heading: 'My Products' },
  { id: 'add', heading: 'Add Product', text: 'List a new product for buyers to discover and order.' },
  { id: 'orders', heading: 'Incoming Orders' },
  { id: 'bids', heading: 'Buyer Bids', text: 'Buyer requirements open for bidding' },
  { id: 'auctions', heading: 'Auctions', text: 'Live bidding on your listings.' },
  { id: 'offers', heading: 'Offers', text: 'Feature products as deals on the marketplace.' },
  { id: 'ads', heading: 'Ads', text: 'Boost a listing to the top of relevant searches' },
  // Payouts is EarningsSection with an overridden title — the override is the
  // only thing that tells it apart from `earnings`, so assert it.
  { id: 'payouts', heading: 'Payouts', text: 'ready to withdraw' },
  { id: 'wallet', heading: 'Wallet', text: WALLET_SUB },
  { id: 'invoices', heading: 'Invoices', text: 'issued to buyers and received from carriers' },
  { id: 'analytics', heading: 'Analytics', text: 'Performance across your catalogue.' },
];

const TRANSPORTER = (name: string): Sec[] => [
  { id: 'dashboard', heading: welcome(name), text: 'Your fleet at a glance.' },
  { id: 'loads', heading: 'My Loads', text: 'Orders assigned to you.' },
  { id: 'requests', heading: 'Available Loads' },
  { id: 'myrequests', heading: 'My Requests', text: 'Loads you have posted for other transporters to quote on.' },
  { id: 'quotes', heading: 'Quotes', text: 'on available loads' },
  { id: 'trips', heading: 'Active Trips' },
  { id: 'vehicles', heading: 'Vehicles' },
  { id: 'drivers', heading: 'Drivers' },
  { id: 'routes', heading: 'Routes' },
  { id: 'earnings', heading: 'Earnings', text: EARNINGS_SUB },
  { id: 'wallet', heading: 'Wallet', text: WALLET_SUB },
  { id: 'invoices', heading: 'Invoices', text: 'Freight invoices you have issued and received' },
  { id: 'ratings', heading: 'Ratings', text: 'How buyers rate your fleet.' },
];

/** loaderco and workerco share one console (`NAV.workerco = NAV.loaderco`). */
const CREW_CO = (name: string): Sec[] => [
  { id: 'dashboard', heading: welcome(name), text: 'Your crews and jobs at a glance.' },
  { id: 'jobrequests', heading: 'Job Requests', text: 'Open loading jobs you can claim for your crews.' },
  { id: 'activejobs', heading: 'Active Jobs', text: 'Assign crews, capture attendance and complete claimed jobs.' },
  { id: 'workers', heading: 'Workers' },
  { id: 'teams', heading: 'Teams' },
  { id: 'labour', heading: 'Worker types & rates', text: 'your crew list stays private' },
  { id: 'availability', heading: 'Availability', text: 'Plan which crew shifts are available each day.' },
  { id: 'pricing', heading: 'Pricing', text: 'Set your crew rates per metric tonne.' },
  { id: 'attendance', heading: 'Attendance', text: 'Check crew in and out' },
  { id: 'earnings', heading: 'Earnings', text: EARNINGS_SUB },
  { id: 'wallet', heading: 'Wallet', text: WALLET_SUB },
  { id: 'invoices', heading: 'Invoices', text: 'Invoices you have issued and received' },
  { id: 'reviews', heading: 'Reviews', text: 'How clients rate your crews after completed jobs.' },
];

const WORKER = (): Sec[] => [
  { id: 'dashboard', heading: 'Worker Dashboard' },
  { id: 'jobs', heading: 'My Jobs' },
  // Same LabourOfferings screen as a crew company, but the individual copy.
  { id: 'labour', heading: 'Worker types & rates', text: 'The jobs you take on and your rate.' },
  { id: 'earnings', heading: 'Earnings', text: EARNINGS_SUB },
  { id: 'wallet', heading: 'Wallet', text: WALLET_SUB },
  { id: 'attendance', heading: 'Shift History' },
  { id: 'reviews', heading: 'Ratings & Reviews' },
  { id: 'invoices', heading: 'Invoices', text: 'Invoices you have issued and received' },
];

/**
 * Service roles (packer here). `invoices` and `reviews` are in SERVICE_NAV but
 * ConsolePage has no branch for them under `isServiceRole`, so they land on the
 * ComingSoon placeholder — covered by its own test below rather than folded in
 * here, so this sweep still reports every other section cleanly.
 */
const SERVICE = (name: string): Sec[] => [
  { id: 'dashboard', heading: `${name} · Packing partner`, text: 'Services offered' },
  // ServiceEnquiries is ALSO embedded at the bottom of the service dashboard,
  // so the heading check alone is ambiguous: `absent` pins that this is the
  // standalone section and not the dashboard with the same block scrolled in.
  { id: 'enquiries', heading: 'Customer enquiries', text: 'Requests buyers have sent you.', absent: 'Services offered' },
  { id: 'serviceProfile', heading: 'Service profile', text: 'What buyers see when they find you.' },
  { id: 'wallet', heading: 'Wallet', text: WALLET_SUB },
];

/** Dev-server noise, not app defects — see the note in public.spec.ts. */
const IGNORED_CONSOLE = [/favicon/i, /ERR_CONNECTION_REFUSED/, /Failed to load resource/i];

/**
 * Console errors come from the shared helper; this adds the two things it does
 * not cover — uncaught exceptions and 5xx — tagged with the section that was on
 * screen, which matters when one test walks eighteen of them.
 */
function watch(page: Page) {
  const w = {
    section: '(boot)',
    consoleErrors: failOnConsoleErrors(page, IGNORED_CONSOLE),
    serverErrors: [] as string[],
  };
  page.on('pageerror', (e) => w.consoleErrors.push(`${w.section}: UNCAUGHT ${e.message.slice(0, 200)}`));
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 500) {
      w.serverErrors.push(`${w.section}: ${r.status()} ${new URL(r.url()).pathname}`);
    }
  });
  return w;
}

/**
 * Poll until the section satisfies its expectations (or the deadline passes),
 * then hand back what was actually on screen. Polling rather than
 * `locator.waitFor` so a miss produces the real text in the failure message
 * instead of an opaque timeout, and so one bad section can't abort the sweep.
 */
async function settle(main: Locator, want: Sec, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  let heading = '';
  let body = '';
  for (;;) {
    const h = main.locator('h1, h2').first();
    heading = (await h.count()) ? (await h.innerText()).replace(/\s+/g, ' ').trim() : '';
    body = (await main.innerText()).replace(/\s+/g, ' ');
    const ok =
      (!want.heading || heading === want.heading) &&
      (!want.text || body.includes(want.text)) &&
      (!want.absent || !body.includes(want.absent));
    if (ok || Date.now() > deadline) return { heading, body };
    await main.page().waitForTimeout(250);
  }
}

/**
 * Identify the account whose console we are about to walk.
 *
 * Reads the cached login response rather than asking `/auth/me`. One sweep loads
 * ~18 console pages and AuthContext re-reads `/auth/me` on every boot, so seven
 * sweeps share — and exhaust — the throttler bucket for that handler. This
 * fixture call then answered 429 and the sweep was reported as "the console
 * sections did not render", which is a lie about the app. The login response
 * already carries the same account record, so there is nothing to ask for.
 */
async function whoAmI(request: APIRequestContext, email: string): Promise<{ name: string; role: string }> {
  return currentUser(request, email);
}

/** Navigate to a console slug and return `<main>` once it has painted. */
async function openSection(page: Page, slug: string): Promise<Locator> {
  // Never `networkidle` — the chat socket stays open and it never settles.
  await page.goto(`/console/${slug}`, { waitUntil: 'domcontentloaded' });
  const main = page.locator('main').first();
  await main.waitFor({ state: 'visible', timeout: 20_000 });
  return main;
}

function sweep(role: string, email: string, table: (name: string) => Sec[]) {
  test(`every ${role} console section renders its own content`, async ({ page, request }) => {
    // ~13-18 full page loads per role; the default 45s cannot cover that.
    test.setTimeout(240_000);

    const me = await whoAmI(request, email);
    expect(me.role, `${email} is no longer a ${role} — the seed changed`).toBe(role);

    await signIn(page, request, email);
    const w = watch(page);
    const failures: string[] = [];

    for (const sec of [...table(me.name), ...EXTRAS]) {
      w.section = sec.id;
      const main = await openSection(page, sec.id);
      const { heading, body } = await settle(main, sec);
      const seen = body.slice(0, 160);

      if (sec.heading && heading !== sec.heading) {
        failures.push(
          `${sec.id}: first heading was ${JSON.stringify(heading)}, expected ${JSON.stringify(sec.heading)} — main showed: ${seen}`,
        );
      }
      if (sec.text && !body.includes(sec.text)) {
        failures.push(`${sec.id}: missing ${JSON.stringify(sec.text)} — main showed: ${seen}`);
      }
      if (sec.absent && body.includes(sec.absent)) {
        failures.push(`${sec.id}: rendered the dashboard instead — found ${JSON.stringify(sec.absent)}`);
      }
    }

    expect(failures, `${role}: sections that did not render their own content`).toEqual([]);
    expect(w.serverErrors, `${role}: 5xx from the API`).toEqual([]);
    expect(w.consoleErrors, `${role}: console errors`).toEqual([]);
  });
}

test.describe('console sections, per role', () => {
  sweep('buyer', DEMO.buyer, BUYER);
  sweep('seller', DEMO.seller, SELLER);
  sweep('transporter', DEMO.transporter, TRANSPORTER);
  sweep('loaderco', DEMO.loaderco, CREW_CO);
  sweep('workerco', DEMO.workerco, CREW_CO);
  sweep('worker', DEMO.worker, WORKER);
  sweep('packer', DEMO.packer, SERVICE);
});

test.describe('deep links into the console', () => {
  test('seller aliases: /console/products and /console/settings hit the real sections', async ({ page, request }) => {
    test.setTimeout(90_000);
    await signIn(page, request, DEMO.seller);

    // SECTION_ALIAS.products -> inventory (the seller-listing notification link).
    let main = await openSection(page, 'products');
    await expect(main.locator('h1, h2').first()).toHaveText('My Products');

    // SECTION_ALIAS.settings -> verify.
    main = await openSection(page, 'settings');
    await expect(main.locator('h1, h2').first()).toHaveText('Verification');

    // The real notification link is /console/settings/verification — the
    // `:section/*` route must keep the trailing segment from breaking it.
    main = await openSection(page, 'settings/verification');
    await expect(main.locator('h1, h2').first()).toHaveText('Verification');
  });

  test('buyer aliases: /console/loaders hits Transport, and a seller-only alias does not', async ({ page, request }) => {
    test.setTimeout(90_000);
    await signIn(page, request, DEMO.buyer);

    // SECTION_ALIAS.loaders -> transport (buyer loader/transport bookings).
    let main = await openSection(page, 'loaders');
    await expect(main.locator('h1, h2').first()).toHaveText('Transport');
    await expect(main).toContainText('Track freight from origin to your warehouse.');

    // Aliases are resolved against THIS role's nav: `inventory` is not a buyer
    // section, so /console/products must degrade to the dashboard, not render
    // a seller screen to a buyer.
    main = await openSection(page, 'products');
    await expect(main.locator('h1, h2').first()).toContainText('Welcome back,');
  });

  test('an unknown slug degrades to the dashboard rather than a dead screen', async ({ page, request }) => {
    test.setTimeout(90_000);
    await signIn(page, request, DEMO.buyer);

    // `dash` and `reviews` are NOT buyer nav ids (the dashboard's id is
    // `dashboard`, and `reviews` belongs to crew/worker/service consoles).
    // Pinning the fallback here is what stops a sweep from mistaking it for a
    // rendered section.
    for (const slug of ['dash', 'reviews', 'totally-made-up']) {
      const main = await openSection(page, slug);
      await expect(main.locator('h1, h2').first(), `/console/${slug}`).toContainText('Welcome back,');
    }
  });
});

test.describe('gaps this sweep exposes', () => {
  /**
   * BUG: `console.title.workerco` does not exist in any locale, but
   * `TITLE_ROLES` in ConsolePage.tsx includes `workerco`, so the console header
   * renders the raw key path for every worker-company account.
   */
  test('workerco console header shows a title, not a raw i18n key', async ({ page, request }) => {
    test.setTimeout(90_000);
    await signIn(page, request, DEMO.workerco);
    await openSection(page, 'dashboard');

    const title = (await page.locator('header h1').first().innerText()).trim();
    expect(title, 'raw i18n key leaked into the console header').not.toMatch(/^(web:)?console\./);
    expect(title.length, 'console header title is empty').toBeGreaterThan(0);
  });

  /**
   * BUG: `NAV.workerco = NAV.loaderco` in ConsolePage.tsx, and the comment above
   * it says so deliberately ("same jobs, crew, attendance and rates"). But every
   * route on the loaders controller is `@Roles('loaderco')`, so a worker company
   * gets 403 on all of them: eight of its thirteen sections paint a heading over
   * data the API refuses to hand over. loaderco answers 200 on the same calls.
   *
   * The section headings render regardless, which is exactly why the sweep above
   * cannot catch this and this test has to watch the network instead.
   */
  test('workerco console sections are authorised against the API', async ({ page, request }) => {
    test.setTimeout(180_000);
    await signIn(page, request, DEMO.workerco);

    let section = '(boot)';
    const forbidden: string[] = [];
    page.on('response', (r) => {
      if (!r.url().includes('/api/') || r.status() !== 403) return;
      const entry = `${section}: 403 ${new URL(r.url()).pathname}`;
      // React Query retries, so the same refusal arrives several times.
      if (!forbidden.includes(entry)) forbidden.push(entry);
    });

    for (const id of ['jobrequests', 'activejobs', 'workers', 'teams', 'availability', 'pricing', 'attendance', 'reviews']) {
      section = id;
      const main = await openSection(page, id);
      await main.locator('h1, h2').first().waitFor({ timeout: 15_000 }).catch(() => {});
      // Bounded settle for the section's own queries — no networkidle, the chat
      // socket never lets the page reach it.
      await page.waitForTimeout(1500);
    }

    expect(forbidden, 'workerco is given the loading-company console but the API refuses it').toEqual([]);
  });

  /**
   * BUG: SERVICE_NAV lists Invoices and Reviews for every service role, but
   * ConsolePage's `isServiceRole` branch only handles `enquiries` and
   * `serviceProfile`, so both land on the ComingSoon placeholder — even though
   * `/invoices/mine` answers 200 for a packer and the shared InvoiceCenter is
   * role-agnostic.
   */
  test('service provider Invoices and Reviews are real sections, not placeholders', async ({ page, request }) => {
    test.setTimeout(120_000);
    await signIn(page, request, DEMO.packer);

    const placeholder = 'This section is wired to the API in the logistics phase.';

    let main = await openSection(page, 'invoices');
    await settle(main, { id: 'invoices', heading: 'Invoices' });
    await expect(main, 'packer Invoices is a placeholder').not.toContainText(placeholder);
    await expect(main.locator('h1, h2').first()).toHaveText('Invoices');

    main = await openSection(page, 'reviews');
    await settle(main, { id: 'reviews', heading: 'Reviews' });
    await expect(main, 'packer Reviews is a placeholder').not.toContainText(placeholder);
    await expect(main.locator('h1, h2').first()).toHaveText('Reviews');
  });
});
