import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, DEMO, signIn, token, visit } from './helpers';

/**
 * Hiring: the escrow lifecycle, and who is allowed to move it.
 *
 * hire-and-money.spec.ts already covers creating a hire, the target-type
 * validator, the insufficient-funds refusal and contact masking. This one covers
 * what happens AFTER a hire exists — accept, decline, cancel, complete — because
 * that is where the money actually moves and where a wrong actor check lets
 * somebody pay themselves.
 *
 * Every test settles the hire it created (decline/cancel/complete), so the
 * escrow it held is always returned and the suite stays re-runnable.
 */

async function as(request: APIRequestContext, email: string) {
  return { Authorization: `Bearer ${await token(request, email)}` };
}

/** Wallet balance in cents, for the arithmetic assertions below. */
async function balance(request: APIRequestContext, email: string): Promise<number> {
  const res = await request.get(`${API}/me/wallet`, { headers: await as(request, email) });
  expect(res.ok(), `wallet read failed for ${email}: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return Number(body.balanceCents ?? body.balance ?? 0);
}

/**
 * Top up the requester so a hold can actually be taken.
 *
 * `POST /me/wallet/topup` takes `amount` in DOLLARS (see TopupDto in
 * apps/api/src/me/me.module.ts), while every balance and budget on this platform
 * is quoted in cents — so the conversion happens here, once.
 */
async function topUp(request: APIRequestContext, email: string, cents: number) {
  const res = await request.post(`${API}/me/wallet/topup`, {
    headers: await as(request, email),
    data: { amount: cents / 100 },
    failOnStatusCode: false,
  });
  expect(res.ok(), `top-up failed for ${email}: ${res.status()} ${await res.text()}`).toBeTruthy();
}

/** A transporter the seller may legitimately hire. */
async function transporterId(request: APIRequestContext): Promise<string> {
  const jwt = await token(request, DEMO.transporter);
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).sub as string;
}

const BUDGET = 5_000; // $50, comfortably above any minimum

/**
 * What the provider actually banks when a hire is released.
 *
 * The platform takes a configurable cut on settlement (CommissionService,
 * `escrowCommissionBps` in the admin billing settings), so the provider is paid
 * the budget MINUS that fee. Read live rather than hardcoded: the rate is
 * admin-editable and can be switched off entirely, and a hardcoded 5% would turn
 * a pricing change into a mystery test failure.
 */
async function payoutFor(request: APIRequestContext, grossCents: number): Promise<number> {
  const res = await request.get(`${API}/admin/billing/settings`, {
    headers: await as(request, DEMO.admin),
    failOnStatusCode: false,
  });
  if (!res.ok()) return grossCents;
  const s = await res.json();
  if (!s.commissionEnabled) return grossCents;
  const bps = Number(s.escrowCommissionBps ?? 0);
  if (bps <= 0) return grossCents;
  // Same arithmetic as CommissionService.fee — floor, capped at the gross.
  return grossCents - Math.min(grossCents, Math.floor((grossCents * bps) / 10_000));
}

/**
 * Put the demo transporter on a plan that does not cap hire responses.
 *
 * The Basic plan allows 5 accepts a month and every run of this spec spends one,
 * so by the sixth run `accept` starts answering 403 QUOTA_EXCEEDED and the
 * escrow assertions below never get to run. That 403 is the quota system working
 * correctly — it is not the thing under test here, so the fixture buys headroom
 * instead of asserting around it. Standard has `hireResponsesPerMonth: null`.
 */
let quotaReady: Promise<void> | null = null;
function ensureHireQuota(request: APIRequestContext) {
  quotaReady ??= (async () => {
    const auth = await as(request, DEMO.admin);
    const plans = await (await request.get(`${API}/admin/billing/plans`, { headers: auth })).json();
    const plan = (Array.isArray(plans) ? plans : (plans.items ?? [])).find(
      (p: { code: string }) => p.code === 'transporter_standard',
    );
    if (!plan) return;
    await request.post(`${API}/admin/billing/subscriptions/grant`, {
      headers: auth,
      data: { userId: await transporterId(request), planId: plan.id, cycle: 'monthly' },
      failOnStatusCode: false,
    });
  })();
  return quotaReady;
}

async function createHire(request: APIRequestContext, budgetCents = BUDGET) {
  const res = await request.post(`${API}/hires`, {
    headers: await as(request, DEMO.seller),
    data: {
      targetType: 'transporter',
      targetUserId: await transporterId(request),
      location: 'Mundra',
      budgetCents,
      // `message` is the free-text note; `details` is the per-service question
      // answers and is validated as an object (CreateHireDto).
      message: `e2e hire ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
    failOnStatusCode: false,
  });
  expect(res.ok(), `hire create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return await res.json();
}

test.describe('hire escrow lifecycle', () => {
  test('creating a hire holds the budget, declining it gives every cent back', async ({ request }) => {
    await topUp(request, DEMO.seller, BUDGET * 2);
    const before = await balance(request, DEMO.seller);

    const hire = await createHire(request);
    const held = await balance(request, DEMO.seller);
    expect(held, 'creating a hire did not hold exactly the budget').toBe(before - BUDGET);

    const declined = await request.post(`${API}/hires/${hire.id}/decline`, {
      headers: await as(request, DEMO.transporter),
      failOnStatusCode: false,
    });
    expect(declined.ok(), `decline failed: ${declined.status()} ${await declined.text()}`).toBeTruthy();

    // Conservation: a hold and a refund must net to zero, not to "about" zero.
    expect(await balance(request, DEMO.seller), 'declining did not refund the full hold').toBe(before);
  });

  test('cancelling a pending hire refunds it, and cancelling twice does not pay twice', async ({ request }) => {
    await topUp(request, DEMO.seller, BUDGET * 2);
    const before = await balance(request, DEMO.seller);

    const hire = await createHire(request);
    const first = await request.post(`${API}/hires/${hire.id}/cancel`, {
      headers: await as(request, DEMO.seller),
      failOnStatusCode: false,
    });
    expect(first.ok(), `cancel failed: ${first.status()} ${await first.text()}`).toBeTruthy();
    const afterFirst = await balance(request, DEMO.seller);
    expect(afterFirst, 'cancelling did not refund the hold').toBe(before);

    // BL-05: the held→refunded transition is a conditional claim precisely so a
    // replayed cancel cannot credit the wallet a second time.
    await request.post(`${API}/hires/${hire.id}/cancel`, {
      headers: await as(request, DEMO.seller),
      failOnStatusCode: false,
    });
    expect(await balance(request, DEMO.seller), 'a second cancel credited the wallet again').toBe(afterFirst);
  });

  test('the provider cannot complete their own hire and release their own pay', async ({ request }) => {
    await ensureHireQuota(request);
    await topUp(request, DEMO.seller, BUDGET * 2);
    const hire = await createHire(request);

    const accepted = await request.post(`${API}/hires/${hire.id}/accept`, {
      headers: await as(request, DEMO.transporter),
      failOnStatusCode: false,
    });
    expect(accepted.ok(), `accept failed: ${accepted.status()} ${await accepted.text()}`).toBeTruthy();

    const providerBefore = await balance(request, DEMO.transporter);

    // BL-04: completion is the requester's confirmation and the SOLE escrow
    // release path. A provider who can call it pays themselves for work nobody
    // signed off.
    const selfPay = await request.post(`${API}/hires/${hire.id}/complete`, {
      headers: await as(request, DEMO.transporter),
      failOnStatusCode: false,
    });
    expect(
      [400, 403, 404],
      `a provider completed their own hire (${selfPay.status()}) — escrow self-release`,
    ).toContain(selfPay.status());
    expect(await balance(request, DEMO.transporter), 'the provider paid themselves').toBe(providerBefore);

    // Settle it properly so the hold does not leak into the next run.
    const done = await request.post(`${API}/hires/${hire.id}/complete`, {
      headers: await as(request, DEMO.seller),
      failOnStatusCode: false,
    });
    expect(done.ok(), `requester completion failed: ${done.status()} ${await done.text()}`).toBeTruthy();
    expect(
      await balance(request, DEMO.transporter),
      'completing did not pay the provider the budget net of commission',
    ).toBe(providerBefore + (await payoutFor(request, BUDGET)));
  });

  test('a stranger can neither accept, decline nor cancel someone else’s hire', async ({ request }) => {
    await topUp(request, DEMO.seller, BUDGET * 2);
    const hire = await createHire(request);

    // The loading company is a provider role, so it passes the @Roles guard on
    // accept/decline — only the per-hire ownership check can refuse it.
    for (const action of ['accept', 'decline', 'cancel'] as const) {
      const res = await request.post(`${API}/hires/${hire.id}/${action}`, {
        headers: await as(request, DEMO.loaderco),
        failOnStatusCode: false,
      });
      expect(
        [400, 403, 404],
        `a stranger could ${action} another party's hire (${res.status()})`,
      ).toContain(res.status());
    }

    await request.post(`${API}/hires/${hire.id}/cancel`, {
      headers: await as(request, DEMO.seller),
      failOnStatusCode: false,
    });
  });

  test('a hire the provider declined stops showing as actionable to them', async ({ request }) => {
    await topUp(request, DEMO.seller, BUDGET * 2);
    const hire = await createHire(request);

    await request.post(`${API}/hires/${hire.id}/decline`, {
      headers: await as(request, DEMO.transporter),
      failOnStatusCode: false,
    });

    const incoming = await (
      await request.get(`${API}/hires/incoming`, { headers: await as(request, DEMO.transporter) })
    ).json();
    const row = (Array.isArray(incoming) ? incoming : (incoming.items ?? [])).find(
      (h: { id: string }) => h.id === hire.id,
    );
    // Either gone from the queue or clearly marked — what must not happen is it
    // sitting there still labelled pending.
    if (row) expect(row.status, 'a declined hire still reads as pending').not.toBe('pending');
  });
});

test.describe('service providers', () => {
  test('the public service directory exposes providers without leaking contact details', async ({ request }) => {
    const res = await request.get(`${API}/services/providers`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.items ?? []);
    expect(items.length, 'no service providers listed').toBeGreaterThan(0);

    const raw = JSON.stringify(items);
    expect(raw, 'the service directory leaked a phone number').not.toMatch(/"phone":\s*"\+?\d/);
    expect(raw, 'the service directory leaked a contact email').not.toMatch(/"contactEmail":\s*"[^"]+@/);
  });

  test('a service provider sees its own enquiries and nobody else’s', async ({ request }) => {
    const mine = await request.get(`${API}/hires/incoming`, { headers: await as(request, DEMO.packer) });
    expect(mine.ok(), `provider enquiries failed: ${mine.status()}`).toBeTruthy();

    const packerJwt = await token(request, DEMO.packer);
    const packerId = JSON.parse(Buffer.from(packerJwt.split('.')[1], 'base64url').toString()).sub;
    const rows = await mine.json();
    for (const h of Array.isArray(rows) ? rows : (rows.items ?? [])) {
      expect(
        h.targetUserId ?? h.targetUser?.id ?? packerId,
        'a provider was shown an enquiry aimed at somebody else',
      ).toBe(packerId);
    }
  });

  test('the service taxonomy is published and carries real names, not slugs', async ({ request }) => {
    const res = await request.get(`${API}/services/taxonomy`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const nodes = Array.isArray(body) ? body : (body.items ?? []);
    expect(nodes.length, 'the service taxonomy is empty').toBeGreaterThan(0);

    for (const n of nodes.slice(0, 20)) {
      expect(n.name, `a taxonomy node has no name: ${JSON.stringify(n).slice(0, 120)}`).toBeTruthy();
      // A node rendering its own slug means the label lookup fell through.
      expect(String(n.name), 'a taxonomy node rendered its slug as its name').not.toMatch(/^[a-z0-9]+(-[a-z0-9]+)+$/);
    }
  });
});

test.describe('the hires console', () => {
  test('a hire the seller sent appears in their Hires section', async ({ page, request }) => {
    await topUp(request, DEMO.seller, BUDGET * 2);
    const hire = await createHire(request);

    await signIn(page, request, DEMO.seller);
    await visit(page, '/console/hires');

    const text = await page.locator('main').first().innerText();
    expect(text, 'the Hires section did not list the hire just created').toContain(hire.reference ?? hire.id.slice(0, 6));

    await request.post(`${API}/hires/${hire.id}/cancel`, {
      headers: await as(request, DEMO.seller),
      failOnStatusCode: false,
    });
  });
});
