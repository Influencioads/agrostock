import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { API, DEMO, token } from './helpers';

/**
 * Auth, account and access — driven through the REAL forms.
 *
 * Everywhere else in this suite `signIn()` seeds localStorage, which is exactly
 * right when the subject is something other than auth. Here the subject IS auth,
 * so every session in this file is opened by typing into /login or /register.
 *
 * Two things shape the whole file:
 *
 *  1. **Verify-before-login.** With SMTP_HOST configured (it is, in the root
 *     .env) `POST /auth/register` returns `{ pendingVerification: true }` and
 *     issues NO session; login then answers 403 `auth.email_not_verified`. The
 *     confirmation token is only ever emailed, so a test can never click the
 *     link. The repo documents three escape hatches — this file uses hatch #2:
 *     **admin-provisioned accounts are stamped `emailVerifiedAt` at creation**
 *     (admin.module.ts `createUser`), so anything that needs a *usable* fresh
 *     account is created over `POST /admin/users` and deleted again afterwards.
 *
 *  2. **The throttler is shared.** /auth/* carries per-route limits far tighter
 *     than the global one (3/min on the mailing routes, 10/min on register,
 *     30/min on login). Failed logins are deliberately NOT brute-forced to 429:
 *     that would poison the bucket for every other spec. The 429 is asserted on
 *     forgot-password instead, where the limit is 3 and the address used belongs
 *     to nobody, so no mail is ever sent.
 *
 * Data hygiene: accounts created here use a `@example.invalid` address (an
 * unroutable TLD — the fire-and-forget SMTP send goes nowhere) and are deleted
 * through the admin API before the test ends, so the suite is re-runnable.
 */

/** Nobody's address, on a TLD that cannot resolve — safe to mail into a void. */
const nowhere = (tag: string) => `e2e-${tag}-${Date.now()}@example.invalid`;

/**
 * Pin English. The i18n detector reads `localStorage.lang` first and only then
 * sniffs `navigator.languages`, so on a Russian-locale machine every assertion
 * below would be comparing against the wrong catalog.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
});

async function adminAuth(request: APIRequestContext) {
  return { Authorization: `Bearer ${await token(request, DEMO.admin)}` };
}

/** Escape hatch #2: an admin-provisioned account is verified from birth. */
async function createVerifiedUser(
  request: APIRequestContext,
  body: { email: string; name: string; role: string },
): Promise<string> {
  const res = await request.post(`${API}/admin/users`, {
    headers: await adminAuth(request),
    data: { ...body, password: DEMO.password },
  });
  expect(res.ok(), `admin could not provision ${body.email}: ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()).id as string;
}

async function grantRole(request: APIRequestContext, userId: string, role: string) {
  const res = await request.post(`${API}/admin/users/${userId}/roles`, {
    headers: await adminAuth(request),
    data: { role },
  });
  expect(res.ok(), `granting ${role} failed: ${res.status()}`).toBeTruthy();
}

async function deleteUser(request: APIRequestContext, userId: string) {
  await request.delete(`${API}/admin/users/${userId}`, { headers: await adminAuth(request) });
}

/** Delete by address — used for accounts born through the signup form, which returns no id. */
async function deleteUserByEmail(request: APIRequestContext, email: string) {
  const headers = await adminAuth(request);
  const res = await request.get(`${API}/admin/users`, { headers, params: { search: email } });
  if (!res.ok()) return;
  for (const u of (await res.json()) as { id: string; email: string }[]) {
    if (u.email === email) await request.delete(`${API}/admin/users/${u.id}`, { headers });
  }
}

/** Records every request the page makes to a given /auth route. */
function watchAuthCalls(page: Page, route: string) {
  const calls: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes(`/auth/${route}`)) calls.push(r.url());
  });
  return calls;
}

async function openRegister(page: Page) {
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
}

async function fillSignup(page: Page, v: { name?: string; email: string; password: string; confirm: string }) {
  if (v.name) await page.getByLabel('Full name / company').fill(v.name);
  await page.getByLabel('Email', { exact: true }).fill(v.email);
  await page.getByLabel('Password', { exact: true }).fill(v.password);
  await page.getByLabel('Confirm password').fill(v.confirm);
}

/** The signup submit button. Matched by shape, not by name — see the i18n bug test. */
const signupSubmit = (page: Page) => page.locator('form button[type="submit"]');

async function signInThroughForm(page: Page, email: string, password: string = DEMO.password) {
  await page.getByLabel('Email or phone').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

/* ────────────────────────── registration ────────────────────────── */

test.describe('registration', () => {
  test('a short password is refused before the request leaves the browser', async ({ page }) => {
    await openRegister(page);
    const posts = watchAuthCalls(page, 'register');

    await fillSignup(page, { name: 'E2E Short', email: nowhere('short'), password: 'abc123', confirm: 'abc123' });
    await signupSubmit(page).click();

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
    expect(posts, 'a password the client already rejected still hit the API').toEqual([]);
    await expect(page).toHaveURL(/\/register$/);
  });

  test('a mismatched confirmation is refused before the request leaves the browser', async ({ page }) => {
    await openRegister(page);
    const posts = watchAuthCalls(page, 'register');

    await fillSignup(page, {
      name: 'E2E Mismatch',
      email: nowhere('mismatch'),
      password: 'password123',
      confirm: 'password124',
    });
    await signupSubmit(page).click();

    await expect(page.getByText("Passwords don't match")).toBeVisible();
    expect(posts, 'a mismatched confirmation still hit the API').toEqual([]);
  });

  test('signup will not submit while a required field is empty', async ({ page }) => {
    await openRegister(page);
    const posts = watchAuthCalls(page, 'register');

    // Everything but the name.
    await fillSignup(page, { email: nowhere('noname'), password: 'password123', confirm: 'password123' });
    await signupSubmit(page).click();
    await page.waitForTimeout(600);

    expect(posts, 'a nameless signup was sent to the API').toEqual([]);
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Confirm your email' })).toHaveCount(0);
  });

  test('an address that already exists is refused with a useful message', async ({ page }) => {
    await openRegister(page);

    await fillSignup(page, {
      name: 'E2E Duplicate',
      email: DEMO.buyer,
      password: 'password123',
      confirm: 'password123',
    });
    await signupSubmit(page).click();

    // 409 auth.email_taken → the page's own copy, not the generic failure text.
    await expect(page.getByText(/already registered/i)).toBeVisible();
    await expect(page.getByText('Could not create the account')).toHaveCount(0);
  });

  test('picking a role reveals that role’s operating fields', async ({ page }) => {
    await openRegister(page);

    // Buyer/Seller is the default and asks for none of this.
    await expect(page.getByText('Operating details')).toHaveCount(0);

    await page.getByRole('button', { name: /Move cargo, run a fleet/ }).click();

    await expect(page.getByText('Operating details')).toBeVisible();
    // TagInput renders its label as a bare span (no `for`), hence getByText.
    await expect(page.getByText('Countries you operate in')).toBeVisible();
    await expect(page.getByLabel('Minimum trip distance (km)')).toBeVisible();
    // A transporter never supplies loading crew, so the crew threshold stays hidden.
    await expect(page.getByText('Minimum crew size')).toHaveCount(0);
    await expect(signupSubmit(page)).toHaveText(/Create Transporter account/);
  });

  test('the signup form never renders a raw translation key', async ({ page }) => {
    await openRegister(page);

    // BUG: `console.role.buyer_seller` exists in no locale, so the DEFAULT
    // signup button interpolates the key itself and renders
    // "Create console.role.buyer_seller account". The role *card* was special-
    // cased ("Buyer / Seller"); the button was not.
    const label = (await signupSubmit(page).innerText()).trim();
    expect(label, 'the submit button is showing an i18n key').not.toMatch(/console\.role\./);

    const body = await page.locator('body').innerText();
    expect(body, 'an untranslated key leaked into the signup page').not.toMatch(/console\.role\.[a-z_]+/);
  });

  test('a new account starts unverified and cannot sign in until it is confirmed', async ({ page, request }) => {
    const email = nowhere('signup');
    try {
      await openRegister(page);
      await fillSignup(page, {
        name: 'E2E Signup',
        email,
        password: 'password123',
        confirm: 'password123',
      });
      await signupSubmit(page).click();

      // Verify-before-login: no session, no /console — a "check your inbox" panel.
      // (If this fails with a redirect to /console, SMTP_HOST is unset and the
      // register() escape hatch auto-verified the account.)
      await expect(page.getByRole('heading', { name: 'Confirm your email' })).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('token')), 'signup issued a session').toBeNull();

      // The gate itself: correct credentials, unconfirmed address → refused.
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await signInThroughForm(page, email);

      await expect(page.getByText(/Confirm your email address before signing in/i)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Resend confirmation link' })).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      expect(await page.evaluate(() => localStorage.getItem('token')), 'unverified account got a session').toBeNull();
    } finally {
      await deleteUserByEmail(request, email);
    }
  });
});

/* ────────────────────────────── sign in ────────────────────────────── */

test.describe('sign in', () => {
  test('a wrong password is refused and stores nothing', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signInThroughForm(page, DEMO.buyer, 'definitely-not-the-password');

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
    // A wrong password must not be mistaken for an unconfirmed address.
    await expect(page.getByRole('button', { name: 'Resend confirmation link' })).toHaveCount(0);
  });

  test('signing in returns the visitor to the page that bounced them', async ({ page }) => {
    // ProtectedRoute remembers the target in router state.
    await page.goto('/console/wallet', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login$/);

    await signInThroughForm(page, DEMO.buyer);

    await expect(page).toHaveURL(/\/console\/wallet$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeTruthy();
  });

  test('?from= cannot be used to redirect off-site', async ({ page }) => {
    // A protocol-relative target is the classic open-redirect payload; the page
    // must ignore it and fall back to the console.
    await page.goto('/login?from=//evil.example.com/steal', { waitUntil: 'domcontentloaded' });
    await signInThroughForm(page, DEMO.buyer);

    await expect(page).toHaveURL(/localhost:\d+\/console$/);
  });

  test('an administrator is refused on the consumer site', async ({ page }) => {
    // Admin is subdomain-only in this repo: the API signs the admin in, and the
    // web client must throw the token away rather than open a console.
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signInThroughForm(page, DEMO.admin);

    await expect(page.getByText(/admin\.agrotraders\.org/)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token')), 'an admin token was persisted on the public site').toBeNull();
  });

  test('protected routes bounce a signed-out visitor to login', async ({ page }) => {
    for (const path of ['/console', '/console/orders', '/onboarding', '/checkout']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page, `${path} did not bounce a signed-out visitor`).toHaveURL(/\/login$/);
    }
  });
});

/* ──────────────────────── session & role access ──────────────────────── */

test.describe('session and roles', () => {
  test('logging out clears the session and re-locks the console', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signInThroughForm(page, DEMO.buyer);
    await expect(page).toHaveURL(/\/console$/);

    // The sidebar is rendered twice (desktop aside + mobile drawer).
    await page.getByRole('button', { name: 'Log out' }).first().click();

    await expect(page).toHaveURL(/localhost:\d+\/$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('user'))).toBeNull();

    await page.goto('/console', { waitUntil: 'domcontentloaded' });
    await expect(page, 'the console was still reachable after logging out').toHaveURL(/\/login$/);
  });

  test('an account with two roles switches dashboards without signing in again', async ({ page, request }) => {
    const email = nowhere('dual');
    const id = await createVerifiedUser(request, { email, name: 'E2E Dual Role', role: 'buyer' });
    await grantRole(request, id, 'seller');

    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await signInThroughForm(page, email);
      await expect(page).toHaveURL(/\/console$/);

      const before = await page.evaluate(() => localStorage.getItem('token'));
      expect(before).toBeTruthy();

      // Buyer dashboard first.
      await expect(page.getByRole('button', { name: 'Browse', exact: true }).first()).toBeVisible();

      await page.getByRole('button', { name: 'Seller', exact: true }).click();

      // Seller nav replaces buyer nav, and the switch is a view change, not a re-auth.
      await expect(page).toHaveURL(/\/console\/dashboard$/);
      await expect(page.getByRole('button', { name: 'Add Product' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Inventory' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Browse', exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem('activeRole'))).toBe('seller');
      expect(await page.evaluate(() => localStorage.getItem('token')), 'switching role re-authenticated').toBe(before);
    } finally {
      await deleteUser(request, id);
    }
  });

  test('the role switcher offers only the roles the account actually holds', async ({ page, request }) => {
    const email = nowhere('single');
    const id = await createVerifiedUser(request, { email, name: 'E2E Single Role', role: 'buyer' });

    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await signInThroughForm(page, email);
      await expect(page).toHaveURL(/\/console$/);

      await page.goto('/console/access', { waitUntil: 'domcontentloaded' });
      const main = page.locator('main');
      await expect(main.getByRole('heading', { name: 'Roles & Access' })).toBeVisible();

      await expect(main.getByText('Buyer', { exact: true }).first()).toBeVisible();
      // Roles nobody granted must be neither listed nor switchable.
      await expect(main.getByText('Seller', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Seller', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Transporter', exact: true })).toHaveCount(0);
      await expect(main.getByText('No requests yet')).toBeVisible();
    } finally {
      await deleteUser(request, id);
    }
  });

  test('roles & access lets the account request a role', async ({ page, request }) => {
    const email = nowhere('request');
    const id = await createVerifiedUser(request, { email, name: 'E2E Role Request', role: 'buyer' });

    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await signInThroughForm(page, email);
      await expect(page).toHaveURL(/\/console$/);

      // The "Request access" chip in the switcher bar is the advertised entry point.
      await page.getByRole('button', { name: 'Request access' }).click();
      await expect(page).toHaveURL(/\/console\/access$/);

      const main = page.locator('main');
      await expect(main.getByText(/Request a new role/)).toBeVisible();

      // One button per role the account does NOT hold; this one is buyer-only, so
      // Seller is offered. Named exactly — /Request/i matches all ten of them.
      const requestSeller = main.getByRole('button', { name: 'Request Seller', exact: true });
      await expect(
        requestSeller,
        'the access section promises a role request but offers no way to make one',
      ).toBeVisible();

      // A button that renders but posts nothing is the same dead end, so submit it
      // and require the request to come back in the history list.
      await requestSeller.click();
      await expect(
        main.getByText('pending', { exact: true }),
        'the request was never recorded',
      ).toBeVisible();
      await expect(main.getByText('No requests yet')).toHaveCount(0);
    } finally {
      await deleteUser(request, id);
    }
  });
});

/* ──────────────────── passwordless & password recovery ──────────────────── */

test.describe('passwordless and recovery', () => {
  test('the OTP flow emails a code and refuses a wrong one', async ({ page }) => {
    await page.goto('/otp-login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Sign in with a code' })).toBeVisible();

    // An address nobody owns: request-otp is enumeration-safe, so the UI advances
    // either way and no mail is actually generated.
    await page.getByLabel('Email').fill(nowhere('otp'));
    await page.getByRole('button', { name: 'Email me a code' }).click();

    await expect(page.getByText(/a code is on its way/i)).toBeVisible();
    const code = page.getByLabel('6-digit code');
    await expect(code).toBeVisible();

    await code.fill('000000');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.getByText(/Invalid or expired code/i)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token')), 'a bad code opened a session').toBeNull();
  });

  test('forgot-password answers the same for everyone and survives its own rate limit', async ({ page }) => {
    const email = nowhere('reset');
    let rateLimited = false;

    // POST /auth/forgot-password is capped at 3/min because it sends mail. Keep
    // asking until the API says 429 — that is the deliberate throttle assertion.
    for (let i = 0; i < 8 && !rateLimited; i++) {
      await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
      const field = page.getByLabel('Email');
      await expect(field).toBeVisible();
      await field.fill(email);

      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/auth/forgot-password') && r.request().method() === 'POST'),
        page.getByRole('button', { name: 'Send reset link' }).click(),
      ]);

      if (res.status() === 429) rateLimited = true;
      else {
        expect(res.status(), `forgot-password answered ${res.status()}`).toBeLessThan(400);
        // Enumeration-safe: an address nobody owns gets the same confirmation.
        await expect(page.getByText(/a reset link is on its way/i)).toBeVisible();
      }
    }

    expect(rateLimited, 'forgot-password never rate-limited — the 3/min cap is gone').toBe(true);

    // BUG: `ForgotPasswordPage.submit` has no catch, so the 429 rejects into an
    // unhandled promise and the page reports NOTHING — the visitor is left
    // staring at the form with no idea their request was dropped. LoginPage
    // handles the same case (errors:net.rate_limited exists for exactly this).
    await expect(
      page.getByText(/a reset link is on its way|Too many attempts|wait a minute/i),
      'a rate-limited reset request failed silently — no confirmation and no error',
    ).toBeVisible();
  });

  test('the reset page refuses a link with no token and offers a fresh one', async ({ page }) => {
    await page.goto('/reset-password', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('This reset link is invalid or has expired')).toBeVisible();
    // No password fields at all — nothing to submit against a missing token.
    await expect(page.getByLabel('New password')).toHaveCount(0);

    await page.getByRole('button', { name: 'Request a new link' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test('the reset page validates locally, then refuses a forged token', async ({ page }) => {
    await page.goto('/reset-password?token=not-a-real-token', { waitUntil: 'domcontentloaded' });
    const pw = page.getByLabel('New password');
    await expect(pw).toBeVisible();
    const confirm = page.getByLabel('Confirm password');
    const submit = page.getByRole('button', { name: 'Set new password' });
    const posts = watchAuthCalls(page, 'reset-password');

    await pw.fill('short');
    await confirm.fill('short');
    await submit.click();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();

    await pw.fill('password12345');
    await confirm.fill('password54321');
    await submit.click();
    await expect(page.getByText("Passwords don't match")).toBeVisible();
    expect(posts, 'a locally-invalid reset was still sent to the API').toEqual([]);

    // Valid input, forged token → the API must reject it and no session may open.
    await confirm.fill('password12345');
    await submit.click();
    await expect(page.getByText(/Invalid reset link/i)).toBeVisible();
    await expect(page).toHaveURL(/\/reset-password/);
    expect(await page.evaluate(() => localStorage.getItem('token')), 'a forged reset token opened a session').toBeNull();
  });

  test('a forged confirmation link is refused and routes back to sign in', async ({ page }) => {
    await page.goto('/verify-email?token=not-a-real-token', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'We could not confirm this link' })).toBeVisible();
    await expect(page.getByText(/confirmation link is not valid/i)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token')), 'a forged token opened a session').toBeNull();

    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('verify-email with no token at all never calls the API', async ({ page }) => {
    const posts = watchAuthCalls(page, 'verify-email');
    await page.goto('/verify-email', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'We could not confirm this link' })).toBeVisible();
    expect(posts, 'an empty token was sent to the API').toEqual([]);
  });
});
