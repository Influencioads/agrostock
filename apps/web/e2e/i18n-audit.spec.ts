import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { DEMO, currentUser, signIn, token, visit } from './helpers';

/**
 * Does switching the language actually translate the whole product?
 *
 * `i18n-responsive.spec.ts` already proves the catalogs LOAD — it asserts some
 * Cyrillic reaches the screen and that no raw `t()` key leaks. Neither check
 * fails on a page that is 90% Russian and 10% English, which is the complaint
 * this file exists for: one hardcoded `<th>Company</th>` passes both of them.
 *
 * So this goes the other way and asserts the ABSENCE of English. Scanning the
 * whole body would drown in seeded demo data (company names, product titles,
 * emails), so it scans CHROME only — the elements whose text is always static
 * copy from a catalog: nav, buttons, labels, table headers, tabs, headings,
 * placeholders, option lists. Latin text in there never went through `t()`.
 */

const ADMIN = process.env.E2E_ADMIN_URL ?? 'http://localhost:5174';
const LOCALE = 'ru';

/**
 * Latin text that is correct to see on a Russian page.
 *
 * Kept deliberately short. Every entry is a proper noun, an initialism with no
 * settled Russian form, or a unit — NOT "this one is hard to translate".
 */
const ALLOW = [
  // Brand and payment-gateway names.
  'agrotraders', 'agrostock', 'safedeal', 'whatsapp', 'telegram', 'youtube', 'facebook',
  'instagram', 'linkedin', 'twitter', 'robokassa', 'yookassa', 'tinkoff', 'sbp', 'visa',
  'mastercard', 'mir', 'ozon', 'wildberries', 'amazon', 'flipkart', 'excel', 'tally', 'zoho',
  // Initialisms that ship untranslated in Russian trade copy.
  'otp', 'kyc', 'moq', 'pdf', 'csv', 'cms', 'mrr', 'sms', 'email', 'url', 'api', 'gst',
  'iso', 'haccp', 'brc', 'fssai', 'llp', 'fob', 'cif', 'exw', 'dap', 'ddp', 'inn', 'ogrn',
  'bank', // "T-Bank", the payment gateway, alongside Robokassa and YooKassa.
  // Currency: the codes are stripped by DELIBERATE below; these are the SYMBOLS
  // the picker prefixes them with, which are Latin for a handful of currencies.
  'rub', 'usd', 'eur', 'inr', 'ton', 'ksh', 'rs',
];

/** A Latin run of 3+ letters — the shape of an English word. */
const LATIN_WORD = /[A-Za-z]{3,}/g;

/**
 * Latin that is correct anywhere it appears, stripped before the scan rather
 * than matched on the whole string — the currency picker renders "£ GBP" and
 * the timezone picker "GMT+5:30 (UTC+05:30)", so a whole-string match would
 * miss both.
 *
 *   - `GMT`/`UTC` offsets: notation, not language. Identical in every locale.
 *   - Bare all-caps triples: ISO 4217 codes (GBP, AED) and the initialisms in
 *     ALLOW. Nothing translatable is written this way.
 *   - Locale endonyms: the whole point of the language picker is that "English"
 *     stays English there, exactly as "Русский" stays Russian.
 */
const DELIBERATE: RegExp[] = [
  /\bGMT\s*[+-]?\d{1,2}(?::\d{2})?\b/g,
  /\bUTC\s*[+-]?\d{1,2}(?::\d{2})?\b/g,
  /\b[A-Z]{3}\b/g,
  /\bEnglish\b/g,
  // Reference codes the user quotes back to support (#AG-…, #LD-…) — identifiers,
  // not words, and the same characters in every locale.
  /#[A-Z]{2,3}-[A-Z0-9]{3,}/g,
];

/**
 * Proper nouns baked into the DEMO SEED, not into any catalog — account names,
 * company names and job-site names that `prisma/seed.ts` writes in English.
 *
 * They are data, so no amount of `t()` will localize them, and a production
 * database full of Russian traders will not contain them. Stripping them keeps
 * this spec green against the demo stack while still failing on real leaks.
 *
 * `Ваши APMC` is the one that is genuinely wrong rather than merely English:
 * Google rendered the Mumbai suburb "Vashi" as the Russian word for "yours"
 * when the market seed was translated. It is a bad row in the demo DB.
 */
const SEED_FIXTURES = /\b(?:Karim|Punjab|SwiftHaul|PortForce|Mundra|Terminal|Port|APMC)\b/g;

/**
 * Exact strings checked by hand and confirmed correct in Russian. Each one is a
 * literal value rather than prose, so translating it would BREAK it.
 */
const VERIFIED_OK = new Set([
  // Sample/masked gateway credentials on the admin payment-gateway form. These
  // are shapes the admin copies from the provider's dashboard verbatim.
  'live_… / test_…',
  '1700000000000DEMO',
  '••••test',
  '••••abcd',
  '••••wxyz',
  // Russian copy that quotes real audit-action prefixes the admin types to filter.
  'Фильтр по действию (например, wallet, kyc, order)…',
]);

function englishIn(text: string): string[] {
  if (VERIFIED_OK.has(text)) return [];
  let rest = text.replace(SEED_FIXTURES, ' ');
  for (const re of DELIBERATE) rest = rest.replace(re, ' ');
  return (rest.match(LATIN_WORD) ?? []).filter((w) => !ALLOW.includes(w.toLowerCase()));
}

/**
 * Visible chrome strings on the page, tagged with the selector that found them.
 *
 * `innerText` (not `textContent`) so hidden menus and `sr-only` copy stay out,
 * and each element contributes only its OWN text — a `<button>` inside a `<nav>`
 * would otherwise be reported twice, once via each ancestor.
 */
async function chromeText(page: Page): Promise<{ sel: string; text: string }[]> {
  return page.evaluate(() => {
    const SELECTORS = [
      'header a', 'header button', 'nav a', 'nav button', 'footer a',
      'button', 'label', 'th', 'option', 'legend', 'summary',
      'h1', 'h2', 'h3', '[role="tab"]', '[role="menuitem"]',
    ];
    const out: { sel: string; text: string }[] = [];
    const seen = new Set<Element>();

    for (const sel of SELECTORS) {
      for (const el of Array.from(document.querySelectorAll(sel))) {
        if (seen.has(el)) continue;
        seen.add(el);
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        // Own text only: subtract every descendant element's text.
        let text = (el as HTMLElement).innerText ?? '';
        for (const child of Array.from(el.children)) {
          text = text.replace((child as HTMLElement).innerText ?? '', ' ');
        }
        text = text.trim();
        if (text) out.push({ sel, text });
      }
    }
    // Placeholders are chrome too, and a favourite hiding place for English.
    for (const el of Array.from(document.querySelectorAll('[placeholder]'))) {
      const p = el.getAttribute('placeholder')?.trim();
      if (p) out.push({ sel: 'placeholder', text: p });
    }
    return out;
  });
}

/** Every English string still showing in the chrome of `page`. */
async function leaks(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (const { sel, text } of await chromeText(page)) {
    // An email address or URL in a button is data, not copy.
    if (/@|https?:\/\/|\.(?:org|com|ru|net)\b/i.test(text)) continue;
    if (englishIn(text).length) out.push(`[${sel}] "${text.slice(0, 70)}"`);
  }
  return [...new Set(out)];
}

async function bootRu(page: Page) {
  await page.addInitScript(() => localStorage.setItem('lang', 'ru'));
}

async function signInAdminApp(page: Page, request: APIRequestContext) {
  const jwt = await token(request, DEMO.admin);
  const user = await currentUser(request, DEMO.admin);
  await page.goto(`${ADMIN}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ([t, u]) => {
      localStorage.setItem('token', t as string);
      localStorage.setItem('user', u as string);
      localStorage.setItem('lang', 'ru');
    },
    [jwt, JSON.stringify(user)] as const,
  );
}

/** Collect leaks across `paths`, reporting every offending route at once. */
async function sweep(page: Page, paths: string[], prefix = ''): Promise<string[]> {
  const found: string[] = [];
  for (const path of paths) {
    try {
      await visit(page, `${prefix}${path}`);
    } catch {
      found.push(`${path}: PAGE DID NOT RENDER an h1`);
      continue;
    }
    for (const leak of await leaks(page)) found.push(`${path} ${leak}`);
  }
  return found;
}

const PUBLIC = [
  '/', '/market', '/services', '/sellers', '/transporters', '/loaders', '/workers',
  '/auctions', '/bids', '/requirements', '/safe-deal', '/pricing', '/offices',
  '/login', '/register', '/forgot-password', '/otp-login',
];

const ADMIN_PAGES = [
  '/', '/users', '/role-requests', '/kyc', '/products', '/orders', '/invoices',
  '/disputes', '/reviews', '/support', '/categories', '/markets', '/transport',
  '/services', '/loaders', '/plans', '/subscriptions', '/payments', '/gateways',
  '/reports', '/audit', '/cms', '/offices', '/branding', '/email-templates',
];

test.describe(`untranslated English under "${LOCALE}"`, () => {
  test.describe.configure({ timeout: 300_000 });

  // The project-wide `extraHTTPHeaders: { 'Accept-Language': 'en' }` in
  // playwright.config.ts is applied by the BROWSER, after the app's own header,
  // so without this every API read in this file comes back in English and every
  // server-rendered label looks like a translation bug. Ask for Russian at both
  // layers, which is what a Russian user's browser actually does.
  test.use({ extraHTTPHeaders: { 'Accept-Language': LOCALE } });

  test('public pages', async ({ page }) => {
    await bootRu(page);
    const found = await sweep(page, PUBLIC);
    expect(found, `English chrome left on the public site in ${LOCALE}`).toEqual([]);
  });

  for (const [who, email] of [
    ['buyer', DEMO.buyer],
    ['seller', DEMO.seller],
    ['transporter', DEMO.transporter],
    ['loaderco', DEMO.loaderco],
  ] as const) {
    test(`the ${who} console`, async ({ page, request }) => {
      await bootRu(page);
      await signIn(page, request, email);
      await visit(page, '/console');

      // The sidebar switches sections with `navigate()` from a click handler, not
      // with `<a href>`, so there is nothing to enumerate and visit by URL. Walk
      // it by clicking instead — which also covers exactly the sections THIS role
      // can see, with no second list to keep in step with the nav model.
      const nav = page.locator('aside button, nav button');
      const count = await nav.count();
      expect(count, 'the console sidebar rendered no section buttons').toBeGreaterThan(3);

      const found: string[] = [];
      for (let i = 0; i < count; i++) {
        const button = nav.nth(i);
        if (!(await button.isVisible())) continue;
        const label = (await button.innerText()).trim().split('\n')[0] || `#${i}`;
        await button.click();
        await page.waitForTimeout(900);
        for (const leak of await leaks(page)) found.push(`${who}/${label} ${leak}`);
      }
      expect(found, `English chrome left in the ${who} console in ${LOCALE}`).toEqual([]);
    });
  }

  test('the admin console', async ({ page, request }) => {
    await bootRu(page);
    await signInAdminApp(page, request);
    const found = await sweep(page, ADMIN_PAGES, ADMIN);
    expect(found, `English chrome left in the admin console in ${LOCALE}`).toEqual([]);
  });
});
