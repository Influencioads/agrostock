import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { API, DEMO, currentUser, signIn, token } from './helpers';

/**
 * Internationalisation, responsive layout and accessibility basics — web + admin.
 *
 * Runs under the `web` project (the filename is deliberately not `admin.*`), so
 * the handful of admin checks drive `E2E_ADMIN_URL` by absolute URL rather than
 * through baseURL. One file, because the three concerns share every helper: the
 * locale switch, the overflow probe and the DOM scan.
 *
 * What it does NOT re-test: `console.spec.ts` already checks that switching to
 * Russian on /workers paints Cyrillic, and `admin.pages.spec.ts` already sweeps
 * the admin routes in English. This file goes the other way — every published
 * locale, a phone-sized viewport, and the parts of the page those two never look
 * at (the footer, the header bar, dates, money, headings, labels).
 */

// ---------------------------------------------------------------------------
// The locale list, read from the catalogs rather than hard-coded.
// ---------------------------------------------------------------------------

/** `packages/i18n/locales`, found by walking up from wherever the runner was started. */
function findLocalesDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'packages', 'i18n', 'locales');
    if (existsSync(candidate)) return candidate;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error(`could not find packages/i18n/locales from ${process.cwd()}`);
}

const LOCALES_DIR = findLocalesDir();

/**
 * Every locale the product publishes — one directory per locale, which is what
 * `LOCALES` in `@agrotraders/i18n` is kept in step with. Reading the directory
 * instead of importing the package keeps this spec out of the workspace's TS
 * resolution (Playwright does not transpile node_modules) and means adding a
 * locale automatically adds it to every test below.
 */
const LOCALES = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

/**
 * Scripts written right-to-left. `RTL_LOCALES` in `@agrotraders/i18n` is the
 * app's own copy of this; the test asserts the app agrees with the language,
 * so re-adding Arabic or Persian without flipping `dir` fails here.
 */
const RTL = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'dv', 'ckb', 'sd', 'yi']);

/** A character range each locale must actually paint, so a silent EN fallback fails. */
const SCRIPT: Record<string, RegExp> = {
  ru: /[А-Яа-яЁё]/,
  ar: /[؀-ۿ]/,
  fa: /[؀-ۿ]/,
  he: /[֐-׿]/,
  hi: /[ऀ-ॿ]/,
  bn: /[ঀ-৿]/,
  zh: /[一-鿿]/,
  ja: /[぀-ヿ一-鿿]/,
  ko: /[가-힯]/,
  th: /[฀-๿]/,
};
const scriptFor = (locale: string) => SCRIPT[locale] ?? /[A-Za-z]/;

const ADMIN = process.env.E2E_ADMIN_URL ?? 'http://localhost:5174';

// ---------------------------------------------------------------------------
// Raw-key detection
// ---------------------------------------------------------------------------

/** Namespaces each app loads — see `init-web.ts` / `init-admin.ts`. */
const NS_BY_APP = {
  web: ['web', 'common', 'nav', 'enums', 'errors'],
  admin: ['admin', 'common', 'nav', 'enums', 'errors', 'web'],
} as const;

/**
 * The top-level key of every namespace the app loads — `hero`, `nav`,
 * `order_status`, … i18next strips the namespace from a missing key, so what
 * actually reaches the screen is `nav.services` or `order_status.dispatched`:
 * a real catalog root followed by a dotted path.
 *
 * Anchoring on the roots is what keeps `buyer@agrotraders.org`,
 * `directory.agrotraders.org` and `Sparkline.tsx` out of the results — none of
 * them starts at a catalog root, and the ones that could (`directory` IS a root
 * in nav.json) end in a TLD, which `NOT_A_KEY_TAIL` drops.
 */
function keyRoots(app: keyof typeof NS_BY_APP): Set<string> {
  const roots = new Set<string>();
  for (const locale of LOCALES) {
    for (const ns of NS_BY_APP[app]) {
      const file = join(LOCALES_DIR, locale, `${ns}.json`);
      if (!existsSync(file)) continue;
      for (const key of Object.keys(JSON.parse(readFileSync(file, 'utf8')) as object)) {
        roots.add(key.toLowerCase());
      }
    }
  }
  return roots;
}

const ROOTS = { web: keyRoots('web'), admin: keyRoots('admin') };

/** Domain suffixes and file extensions — a dotted token ending in one is not a key. */
const NOT_A_KEY_TAIL =
  /^(?:org|com|net|io|co|uk|dev|app|live|test|local|ru|en|json|tsx?|jsx?|mjs|cjs|css|html?|md|png|jpe?g|webp|svg|gif|ico|pdf|csv|xlsx|zip)$/i;

/** Untranslated `t()` keys visible in `text`, if any. */
function rawKeys(text: string, app: keyof typeof NS_BY_APP): string[] {
  const found = new Set<string>();
  for (const tok of text.match(/[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+/g) ?? []) {
    const segs = tok.split('.');
    if (!ROOTS[app].has(segs[0].toLowerCase())) continue;
    if (NOT_A_KEY_TAIL.test(segs[segs.length - 1])) continue;
    // Version strings ("v1.2.3") and the like.
    if (segs.some((s) => /^\d+$/.test(s))) continue;
    found.add(tok);
  }
  // The `ns:key` form, which survives when the namespace itself is unknown.
  for (const tok of text.match(
    /\b(?:web|admin|common|nav|enums|errors|validation|mobile|notification):[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*/g,
  ) ?? []) {
    found.add(tok);
  }
  return [...found];
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

/**
 * Boot the app in `locale` (and optionally a display currency).
 *
 * Written to localStorage before any page script runs: that is where i18next's
 * detector looks first, so it is the same switch the language picker throws —
 * minus the reload, and minus depending on a control that is `hidden sm:block`
 * and therefore invisible at the 375px widths half this file tests at.
 */
async function bootInLocale(page: Page, locale: string, currency?: string) {
  await page.addInitScript(
    ([lang, cur]) => {
      localStorage.setItem('lang', lang as string);
      if (cur) localStorage.setItem('currency', cur as string);
    },
    [locale, currency ?? ''] as const,
  );
}

/**
 * Navigate and wait for the page to paint.
 *
 * Not `networkidle` — both apps hold a chat socket open, so it never settles.
 * `h1` is the anchor because every page under test has exactly one (which the
 * accessibility block asserts) and, unlike `main`, it exists on the auth pages
 * too, which are mounted outside SiteLayout.
 */
async function visit(page: Page, url: string, settleMs = 1200) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(settleMs);
}

/** Seed the admin app's own origin with a signed-in admin session. */
async function signInAdminApp(page: Page, request: APIRequestContext) {
  const jwt = await token(request, DEMO.admin);
  // The cached login already carries the account record; `/auth/me` is throttled
  // and every console page load spends from the same bucket.
  const user = await currentUser(request, DEMO.admin);
  await page.goto(`${ADMIN}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ([t, u]) => {
      localStorage.setItem('token', t as string);
      localStorage.setItem('user', u as string);
    },
    [jwt, JSON.stringify(user)] as const,
  );
}

/**
 * Elements sticking out past the right (or left) edge of the viewport.
 *
 * `document.scrollWidth` cannot be used: `html, body { overflow-x: clip }` in
 * `index.css` is a deliberate guard against exactly this bug, so the document
 * never reports the overflow — the content is simply cut off instead, which is
 * the symptom users see. Measuring boxes finds what the guard is hiding.
 *
 * Excluded, because they are outside the viewport by design rather than by
 * accident: anything `position: fixed` (off-canvas chat drawers, toasts),
 * anything non-interactive (`pointer-events: none` decorative blur circles),
 * and anything inside a horizontal scroller (`overflow-x: auto|scroll` — wide
 * tables and chip rows are meant to be swiped).
 */
async function overflowing(page: Page, scope: 'header' | 'body'): Promise<string[]> {
  return page.evaluate((where) => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const inHeader = !!el.closest('header');
      if (where === 'header' ? !inHeader : inHeader) continue;

      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.right <= vw + 1 && r.left >= -1) continue;

      let deliberate = false;
      for (let p: Element | null = el; p; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.position === 'fixed' || cs.pointerEvents === 'none') {
          deliberate = true;
          break;
        }
        if (p !== el && (cs.overflowX === 'auto' || cs.overflowX === 'scroll')) {
          deliberate = true;
          break;
        }
      }
      if (deliberate) continue;

      const cls = typeof el.className === 'string' ? el.className : '';
      const label = (el as HTMLElement).innerText?.slice(0, 40).replace(/\s+/g, ' ') ?? '';
      out.push(
        `<${el.tagName.toLowerCase()} class="${cls.slice(0, 60)}"> spans ${Math.round(r.left)}..${Math.round(
          r.right,
        )} in a ${vw}px viewport — "${label}"`,
      );
    }
    return out;
  }, scope);
}

/** One h1, alt text on every image, an accessible name on every form control. */
async function auditA11y(page: Page) {
  return page.evaluate(() => {
    const named = (f: Element) =>
      !!(
        f.getAttribute('aria-label') ||
        f.getAttribute('aria-labelledby') ||
        f.getAttribute('title') ||
        // Not a substitute for a label, but it IS an accessible name per the
        // accname spec, so a control with one is at least announced.
        f.getAttribute('placeholder') ||
        (f.id && document.querySelector(`label[for="${CSS.escape(f.id)}"]`)) ||
        f.closest('label')
      );
    return {
      headings: Array.from(document.querySelectorAll('h1')).map((h) =>
        (h as HTMLElement).innerText.trim().slice(0, 60),
      ),
      imagesWithoutAlt: Array.from(document.querySelectorAll('img'))
        .filter((i) => !i.hasAttribute('alt'))
        .map((i) => i.getAttribute('src')?.slice(0, 80) ?? '(no src)'),
      controlsWithoutName: Array.from(document.querySelectorAll('input, select, textarea'))
        .filter((f) => (f as HTMLInputElement).type !== 'hidden' && !named(f))
        .map((f) => f.outerHTML.slice(0, 100)),
    };
  });
}

const PUBLIC_PAGES = ['/', '/market', '/services', '/pricing', '/register'];
const ADMIN_PAGES = ['/users', '/orders'];

// ---------------------------------------------------------------------------

test.describe('locales', () => {
  for (const locale of LOCALES) {
    test(`${locale} renders the public site in its own script`, async ({ page }) => {
      await bootInLocale(page, locale);

      for (const path of ['/', '/market', '/services']) {
        await visit(page, path);

        const html = page.locator('html');
        await expect(html, `${path}: <html lang> does not follow the chosen locale`).toHaveAttribute(
          'lang',
          locale,
        );
        // The plumbing is in `DocumentLang` (apps/web/src/i18n/index.tsx); this
        // asserts it agrees with the language, not with a second hard-coded list.
        await expect(html, `${path}: wrong text direction for ${locale}`).toHaveAttribute(
          'dir',
          RTL.has(locale) ? 'rtl' : 'ltr',
        );

        const body = await page.locator('body').innerText();
        expect(body.length, `${path} rendered almost nothing in ${locale}`).toBeGreaterThan(200);
        // A missing locale chunk falls back to English without any error, so the
        // only proof the catalog loaded is its script showing up on screen.
        expect(body, `${path} shows no ${locale} text — the catalog silently fell back`).toMatch(
          scriptFor(locale),
        );
      }
    });

    test(`${locale} leaks no raw i18n keys on the public site`, async ({ page }) => {
      await bootInLocale(page, locale);

      const leaks: string[] = [];
      for (const path of PUBLIC_PAGES) {
        await visit(page, path);
        for (const key of rawKeys(await page.locator('body').innerText(), 'web')) {
          leaks.push(`${path}: ${key}`);
        }
      }
      expect(leaks, `untranslated keys rendered to the screen in ${locale}`).toEqual([]);
    });
  }

  test('right-to-left locales flip the document direction', async ({ page }) => {
    const rtl = LOCALES.filter((l) => RTL.has(l));
    test.skip(
      rtl.length === 0,
      'no right-to-left locale is published — RTL_LOCALES is empty in packages/i18n',
    );

    for (const locale of rtl) {
      await bootInLocale(page, locale);
      await visit(page, '/');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      // Mirrored layouts overflow to the LEFT, which the same probe catches.
      expect(await overflowing(page, 'body'), `${locale} overflows in RTL`).toEqual([]);
    }
  });

  test('the site footer is translated', async ({ page }) => {
    const locale = LOCALES.find((l) => l !== 'en');
    test.skip(!locale, 'only English is published');
    await bootInLocale(page, locale!);
    await visit(page, '/');

    const labels = await page.locator('footer a').allInnerTexts();
    expect(labels.length, 'the footer rendered no links at all').toBeGreaterThan(5);

    const script = scriptFor(locale!);
    const untranslated = labels.map((l) => l.trim()).filter((l) => l && !script.test(l));
    expect(
      untranslated,
      `footer links still in English under "${locale}" — SiteFooter renders footerCols from src/mock/data.ts verbatim, never through t()`,
    ).toEqual([]);
  });
});

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  // English and Russian: the same layout, one short locale and one long one.
  // Russian labels are ~40% wider, which is what turns a tight row into a
  // clipped one.
  for (const locale of LOCALES) {
    test(`public page bodies fit a 375px viewport in ${locale}`, async ({ page }) => {
      await bootInLocale(page, locale);

      const offenders: string[] = [];
      for (const path of [...PUBLIC_PAGES, '/safe-deal']) {
        await visit(page, path);
        for (const o of await overflowing(page, 'body')) offenders.push(`${path} ${o}`);
      }
      expect(offenders, `content drifts off-screen at 375px in ${locale}`).toEqual([]);
    });

    test(`the signed-out site header fits a 375px viewport in ${locale}`, async ({ page }) => {
      await bootInLocale(page, locale);
      await visit(page, '/market');

      // The header's own comment promises the auth actions "stay on the bar at
      // EVERY width". At 375px they do not fit, and `overflow-x: clip` cuts the
      // sign-up button off rather than letting the page scroll to it.
      expect(
        await overflowing(page, 'header'),
        `the site header is cut off at 375px in ${locale}`,
      ).toEqual([]);
    });
  }

  test('console sections fit a 375px viewport in Russian', async ({ page, request }) => {
    const locale = LOCALES.find((l) => l !== 'en') ?? 'en';
    await bootInLocale(page, locale);
    await signIn(page, request, DEMO.buyer);

    const offenders: string[] = [];
    for (const section of ['/console/orders', '/console/wallet', '/console/hires']) {
      await visit(page, section);
      for (const o of await overflowing(page, 'body')) offenders.push(`${section} ${o}`);
    }
    expect(offenders, 'console content drifts off-screen at 375px').toEqual([]);
  });

  test('admin pages fit a 375px viewport in Russian', async ({ page, request }) => {
    const locale = LOCALES.find((l) => l !== 'en') ?? 'en';
    await bootInLocale(page, locale);
    await signInAdminApp(page, request);

    const offenders: string[] = [];
    for (const path of ADMIN_PAGES) {
      await visit(page, `${ADMIN}${path}`);
      for (const o of await overflowing(page, 'body')) offenders.push(`${path} ${o}`);
    }
    expect(offenders, 'admin content drifts off-screen at 375px').toEqual([]);
  });
});

test.describe('number, date and money formatting', () => {
  test('plan prices render in the selected currency and locale', async ({ page, request }) => {
    const locale = LOCALES.find((l) => l !== 'en') ?? 'en';
    const plans = await (await request.get(`${API}/billing/plans`)).json();
    const plan = (plans as { prices: { amountMinor: number; currency: string }[] }[]).find(
      (p) => p.prices?.length,
    );
    expect(plan, 'no subscription plan has a price — seed data missing').toBeTruthy();

    // Plan prices are stored in KOPECKS, not the USD cents everything else uses.
    // Getting the scale wrong shows a 2 900 ₽ plan as 290 000 ₽, which is the
    // failure this reproduces from the API's own numbers.
    const expected = plan!.prices.map((p) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: p.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(p.amountMinor / 100),
    );

    await bootInLocale(page, locale, plan!.prices[0].currency);
    await visit(page, '/pricing');

    const flat = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(
      expected.some((e) => flat.includes(e.replace(/\s+/g, ' '))),
      `no plan price rendered as any of ${expected.join(' / ')}`,
    ).toBeTruthy();
    expect(flat, 'a broken amount or date reached the page').not.toMatch(
      /NaN|Invalid Date|undefined|\bInfinity\b/,
    );
  });

  test('the wallet formats dates and negative amounts for the active locale', async ({
    page,
    request,
  }) => {
    const locale = LOCALES.find((l) => l !== 'en') ?? 'en';
    const jwt = await token(request, DEMO.buyer);
    const wallet = await (
      await request.get(`${API}/me/wallet`, { headers: { Authorization: `Bearer ${jwt}` } })
    ).json();
    expect(wallet.txns?.length, 'the buyer wallet has no transactions to format').toBeGreaterThan(0);

    await bootInLocale(page, locale);
    await signIn(page, request, DEMO.buyer);
    await visit(page, '/console/wallet');

    const body = await page.locator('body').innerText();
    expect(body, 'the wallet did not render its transaction list').toMatch(/\d{4}/);

    // `new Date(x).toLocaleDateString()` with no locale argument formats in the
    // BROWSER's locale, not the app's — so a Russian page prints 8/21/2026.
    // `formatDate(value, locale)` in @agrotraders/api-client exists for this.
    expect(
      body.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) ?? [],
      `US M/D/YYYY dates on a "${locale}" page`,
    ).toEqual([]);

    // Intl never emits "$-1,200": the sign goes before the symbol. Seeing it
    // means the amount was concatenated by hand instead of formatted.
    expect(
      body.match(/[$€₽£¥]\s?-\d/g) ?? [],
      'a negative amount rendered with the sign after the currency symbol',
    ).toEqual([]);
  });
});

test.describe('accessibility basics', () => {
  test('public pages have one h1, alt text and named form controls', async ({ page }) => {
    const locale = LOCALES.find((l) => l !== 'en') ?? 'en';
    await bootInLocale(page, locale);

    const problems: string[] = [];
    for (const path of PUBLIC_PAGES) {
      await visit(page, path);
      const { headings, imagesWithoutAlt, controlsWithoutName } = await auditA11y(page);
      if (headings.length !== 1) {
        problems.push(`${path}: ${headings.length} h1 elements (${headings.join(' | ') || 'none'})`);
      }
      for (const src of imagesWithoutAlt) problems.push(`${path}: <img> with no alt — ${src}`);
      for (const el of controlsWithoutName) problems.push(`${path}: unnamed control — ${el}`);
    }
    expect(problems, 'accessibility defects on the public site').toEqual([]);
  });

  test('admin pages have one h1, alt text and named form controls', async ({ page, request }) => {
    const locale = LOCALES.find((l) => l !== 'en') ?? 'en';
    await bootInLocale(page, locale);
    await signInAdminApp(page, request);

    const problems: string[] = [];
    for (const path of ADMIN_PAGES) {
      await visit(page, `${ADMIN}${path}`);
      const { headings, imagesWithoutAlt, controlsWithoutName } = await auditA11y(page);
      if (headings.length !== 1) {
        problems.push(`${path}: ${headings.length} h1 elements (${headings.join(' | ') || 'none'})`);
      }
      for (const src of imagesWithoutAlt) problems.push(`${path}: <img> with no alt — ${src}`);
      for (const el of controlsWithoutName) problems.push(`${path}: unnamed control — ${el}`);
    }
    expect(problems, 'accessibility defects in the admin console').toEqual([]);
  });
});

test.describe('admin console i18n', () => {
  test('renders in the second locale without leaking raw keys', async ({ page, request }) => {
    const locale = LOCALES.find((l) => l !== 'en');
    test.skip(!locale, 'only English is published');
    await bootInLocale(page, locale!);
    await signInAdminApp(page, request);

    const script = scriptFor(locale!);
    const leaks: string[] = [];
    for (const path of ADMIN_PAGES) {
      await visit(page, `${ADMIN}${path}`);

      await expect(page.locator('html'), `${path}: <html lang>`).toHaveAttribute('lang', locale!);
      const body = await page.locator('body').innerText();
      expect(body, `${path} shows no ${locale} text`).toMatch(script);

      // The whole page, not just <main>: the sidebar is where the nav labels
      // live, and a missing nav key is exactly what admin.pages.spec.ts (which
      // reads `main`) cannot see.
      for (const key of rawKeys(body, 'admin')) leaks.push(`${path}: ${key}`);
    }
    expect(leaks, 'untranslated keys rendered in the admin console').toEqual([]);
  });
});
