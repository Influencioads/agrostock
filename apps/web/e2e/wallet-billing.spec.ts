import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, DEMO, signIn, token } from './helpers';

/**
 * Money: wallet, escrow, earnings, statements, invoices, plans.
 *
 * Everything here asserts an AMOUNT, not a rendered div. A wallet screen that
 * paints is worthless if the number on it is not the number in the ledger, and
 * an escrow cycle that "works" while minting or burning a cent is the one bug
 * class this platform cannot ship. So each test either checks exact arithmetic
 * (before + amount === after, to the cent) or a refusal that protects it.
 */

type Headers = Record<string, string>;

interface Tx {
  id: string;
  amountCents: number;
  type: string;
  note: string | null;
  idempotencyKey: string | null;
}
interface Wallet {
  balanceCents: number;
  txns: Tx[];
}

async function auth(request: APIRequestContext, email: string): Promise<Headers> {
  return { Authorization: `Bearer ${await token(request, email)}` };
}

async function wallet(request: APIRequestContext, headers: Headers): Promise<Wallet> {
  const res = await request.get(`${API}/me/wallet`, { headers });
  expect(res.ok(), `GET /me/wallet: ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

const balanceOf = async (request: APIRequestContext, headers: Headers) => (await wallet(request, headers)).balanceCents;

/** The exact string the console renders for a cent amount — console/lib.ts `usd`. */
const usd = (cents: number) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/**
 * The seeded packing company. Chosen over a loader/transporter on purpose: the
 * service ladder's free tier declares no `hireResponsesPerMonth` limit, so these
 * tests can accept a hire on every run without eating a monthly quota and
 * failing the fifth time someone runs the suite.
 */
async function packerUserId(request: APIRequestContext): Promise<string> {
  const providers = (await (await request.get(`${API}/services/providers`)).json()) as {
    companyName: string;
    user: { id: string };
  }[];
  const packer = providers.find((p) => p.companyName === 'Harbour Pack Solutions');
  expect(packer, 'the packer demo provider is missing from the seed').toBeTruthy();
  return packer!.user.id;
}

/** Make sure a wallet can cover what the test is about to hold. */
async function fund(request: APIRequestContext, headers: Headers, cents: number) {
  if ((await balanceOf(request, headers)) >= cents) return;
  await request.post(`${API}/me/wallet/topup`, { headers, data: { amount: Math.max(1, Math.ceil(cents / 100)) } });
}

/** Minimal RFC4180 reader — enough for the five columns the statement writes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/* ── wallet ───────────────────────────────────────────────────────── */

test.describe('wallet', () => {
  test('a top-up moves the balance by exactly the amount, and a keyed replay moves it once', async ({ request }) => {
    const headers = await auth(request, DEMO.buyer);
    const before = await balanceOf(request, headers);

    // $1.00–$9.99, so the replay row is findable and the DTO's Min(1) is met.
    const cents = 100 + Math.floor(Math.random() * 900);
    const key = `e2e-topup-${Date.now()}-${cents}`;

    const first = await request.post(`${API}/me/wallet/topup`, {
      headers,
      data: { amount: cents / 100, idempotencyKey: key },
    });
    expect(first.ok(), `top-up failed: ${first.status()} ${await first.text()}`).toBeTruthy();
    const afterFirst = (await first.json()) as Wallet;

    expect(afterFirst.balanceCents, 'a top-up must move the balance by exactly its amount').toBe(before + cents);
    const newest = afterFirst.txns[0];
    expect(newest.type).toBe('topup');
    expect(newest.amountCents, 'the ledger row must record the same amount the balance moved').toBe(cents);

    // Double-tapping Pay must credit once — the money-safety half of BL-15.
    const replay = await request.post(`${API}/me/wallet/topup`, {
      headers,
      data: { amount: cents / 100, idempotencyKey: key },
    });
    const afterReplay = (await replay.json()) as Wallet;
    expect(afterReplay.balanceCents, 'a replayed top-up must not credit twice').toBe(before + cents);
    expect(
      afterReplay.txns.filter((t) => t.idempotencyKey?.endsWith(key)).length,
      'a replayed top-up must not write a second ledger row',
    ).toBe(1);
  });

  test('withdrawing more than the balance is refused and moves nothing', async ({ request }) => {
    const headers = await auth(request, DEMO.buyer);
    const before = await balanceOf(request, headers);

    const res = await request.post(`${API}/me/wallet/withdraw`, {
      headers,
      // One dollar past the balance — inside the DTO's Max, so a 400 here can
      // only be the balance guard and not the validator.
      data: { amount: Math.floor(before / 100) + 1 },
    });
    expect(res.status(), 'withdrawing past the balance must be refused').toBe(400);
    expect(await res.text()).toMatch(/exceeds your available balance/i);
    expect(await balanceOf(request, headers), 'a refused withdrawal must not move money').toBe(before);
  });

  test('a payout request reserves the amount without debiting the wallet', async ({ request }) => {
    const headers = await auth(request, DEMO.buyer);
    const before = await balanceOf(request, headers);

    const requested = await request.post(`${API}/me/wallet/withdraw`, { headers, data: { amount: 1 } });
    expect(requested.ok(), `withdraw request failed: ${await requested.text()}`).toBeTruthy();
    // Funds leave on admin approval, never on the request itself.
    expect(await balanceOf(request, headers), 'requesting a payout must not debit the wallet').toBe(before);

    // …but the pending request is reserved, so the whole balance is no longer available.
    const second = await request.post(`${API}/me/wallet/withdraw`, {
      headers,
      data: { amount: Math.floor(before / 100) },
    });
    expect(second.status(), 'a pending payout must reserve its amount').toBe(400);
    expect(await second.text()).toMatch(/exceeds your available balance/i);

    // Clean up so re-runs do not pile reservations onto the demo buyer.
    const adminHeaders = await auth(request, DEMO.admin);
    const pending = (await (
      await request.get(`${API}/admin/payouts?status=pending`, { headers: adminHeaders })
    ).json()) as { id: string; amountCents: number; user: { email: string } }[];
    for (const p of pending.filter((p) => p.amountCents === 100 && p.user.email === DEMO.buyer)) {
      await request.post(`${API}/admin/payouts/${p.id}/decide`, {
        headers: adminHeaders,
        data: { status: 'rejected', note: 'e2e cleanup' },
      });
    }
  });

  test('the wallet screen shows exactly the balance and the top-up the ledger holds', async ({ page, request }) => {
    const headers = await auth(request, DEMO.buyer);
    const cents = 100 + Math.floor(Math.random() * 900);
    await request.post(`${API}/me/wallet/topup`, { headers, data: { amount: cents / 100 } });
    const { balanceCents } = await wallet(request, headers);

    await signIn(page, request, DEMO.buyer);
    await page.goto('/console/wallet', { waitUntil: 'domcontentloaded' });

    const label = page.getByText('Available balance');
    await expect(label).toBeVisible();
    // The figure is the sibling div of the label inside the balance card.
    await expect(
      label.locator('xpath=following-sibling::div[1]'),
      'the wallet card must show the ledger balance, to the cent',
    ).toHaveText(usd(balanceCents));

    // The top-up we just made is the newest row: amount and type must both match.
    const amount = page.getByText(usd(cents), { exact: true }).first();
    await expect(amount).toBeVisible();
    await expect(amount.locator('xpath=..'), 'the row for a top-up must be labelled as one').toContainText('top-up');
  });
});

/* ── escrow ───────────────────────────────────────────────────────── */

test.describe('escrow', () => {
  test('a hire hold and refund round trip conserves the balance to the cent', async ({ request }) => {
    const headers = await auth(request, DEMO.seller);
    const targetUserId = await packerUserId(request);
    const budgetCents = 1234;
    await fund(request, headers, budgetCents);

    const before = await balanceOf(request, headers);
    const created = await request.post(`${API}/hires`, {
      headers,
      data: { targetType: 'service_provider', targetUserId, location: 'Chennai', message: 'e2e escrow refund', budgetCents },
    });
    expect(created.ok(), `hire failed: ${created.status()} ${await created.text()}`).toBeTruthy();
    const hire = (await created.json()) as { id: string };

    const held = await wallet(request, headers);
    expect(held.balanceCents, 'creating a hire must hold exactly the budget').toBe(before - budgetCents);
    expect(held.txns[0]).toMatchObject({ type: 'escrow_hold', amountCents: -budgetCents });
    expect(held.txns[0].idempotencyKey).toBe(`escrow:hold:hire:${hire.id}`);

    const cancelled = await request.post(`${API}/hires/${hire.id}/cancel`, { headers });
    expect(cancelled.ok(), `cancel failed: ${await cancelled.text()}`).toBeTruthy();
    expect(await cancelled.json()).toMatchObject({ status: 'cancelled', escrowState: 'refunded' });

    const after = await wallet(request, headers);
    expect(after.balanceCents, 'a hold + refund round trip must leave the balance untouched').toBe(before);
    expect(after.txns[0]).toMatchObject({ type: 'refund', amountCents: budgetCents });
    expect(after.txns[0].idempotencyKey).toBe(`escrow:refund:hire:${hire.id}`);
  });

  test('completing a hire pays the provider the budget minus commission, and mints nothing', async ({ request }) => {
    const sellerHeaders = await auth(request, DEMO.seller);
    const packerHeaders = await auth(request, DEMO.packer);
    const adminHeaders = await auth(request, DEMO.admin);
    const targetUserId = await packerUserId(request);

    // The take rate is an admin setting, so read it rather than assume a number.
    const settings = (await (await request.get(`${API}/admin/billing/settings`, { headers: adminHeaders })).json()) as {
      escrowCommissionBps: number;
      commissionEnabled: boolean;
      platformUserId: string | null;
    };
    const platformBalance = async () => {
      if (!settings.platformUserId) return 0;
      const res = await request.get(`${API}/admin/wallets/${settings.platformUserId}`, { headers: adminHeaders });
      return ((await res.json()) as { balanceCents: number }).balanceCents;
    };

    // 733 at 5% is 36.65 — the fee has to round DOWN, or the platform takes a
    // cent the provider was owed.
    const budgetCents = 733;
    const bps = settings.commissionEnabled && settings.platformUserId ? settings.escrowCommissionBps : 0;
    const fee = Math.min(budgetCents, Math.floor((budgetCents * bps) / 10_000));

    await fund(request, sellerHeaders, budgetCents);
    const [sellerBefore, packerBefore, platformBefore] = [
      await balanceOf(request, sellerHeaders),
      await balanceOf(request, packerHeaders),
      await platformBalance(),
    ];

    const created = await request.post(`${API}/hires`, {
      headers: sellerHeaders,
      data: { targetType: 'service_provider', targetUserId, location: 'Chennai', message: 'e2e escrow release', budgetCents },
    });
    expect(created.ok(), `hire failed: ${await created.text()}`).toBeTruthy();
    const hire = (await created.json()) as { id: string };

    const accepted = await request.post(`${API}/hires/${hire.id}/accept`, { headers: packerHeaders });
    expect(accepted.ok(), `accept failed: ${accepted.status()} ${await accepted.text()}`).toBeTruthy();
    const completed = await request.post(`${API}/hires/${hire.id}/complete`, { headers: sellerHeaders });
    expect(completed.ok(), `complete failed: ${completed.status()} ${await completed.text()}`).toBeTruthy();
    expect(await completed.json()).toMatchObject({ escrowState: 'released' });

    const sellerDelta = (await balanceOf(request, sellerHeaders)) - sellerBefore;
    const packerDelta = (await balanceOf(request, packerHeaders)) - packerBefore;
    const platformDelta = (await platformBalance()) - platformBefore;

    expect(sellerDelta, 'the payer is debited exactly the budget, once').toBe(-budgetCents);
    expect(packerDelta, 'the provider is paid the budget net of the take rate').toBe(budgetCents - fee);
    expect(platformDelta, 'the platform keeps exactly the fee').toBe(fee);
    expect(sellerDelta + packerDelta + platformDelta, 'settlement must neither mint nor burn money').toBe(0);
  });

  test('a top-up never counts as earnings', async ({ request }) => {
    // Earnings and the wallet are separate surfaces on purpose: money you added
    // is not money you earned, and conflating them inflates every payout report.
    const headers = await auth(request, DEMO.transporter);
    const earnedBefore = ((await (await request.get(`${API}/me/earnings`, { headers })).json()) as { earnedCents: number })
      .earnedCents;
    const balanceBefore = await balanceOf(request, headers);

    const topped = await request.post(`${API}/me/wallet/topup`, { headers, data: { amount: 5 } });
    expect(topped.ok()).toBeTruthy();

    const earnings = (await (await request.get(`${API}/me/earnings`, { headers })).json()) as {
      earnedCents: number;
      txns: { type: string }[];
    };
    expect(await balanceOf(request, headers), 'the wallet takes the top-up').toBe(balanceBefore + 500);
    expect(earnings.earnedCents, 'earnings must ignore a top-up entirely').toBe(earnedBefore);
    expect(
      earnings.txns.map((t) => t.type).filter((t) => t !== 'payout' && t !== 'escrow_release'),
      'earnings history may only contain money earned from work',
    ).toEqual([]);
  });

  test('the earnings screen and the wallet screen show their own, different figures', async ({ page, request }) => {
    const headers = await auth(request, DEMO.transporter);
    const earned = ((await (await request.get(`${API}/me/earnings`, { headers })).json()) as { earnedCents: number })
      .earnedCents;
    const balance = await balanceOf(request, headers);
    // The seeded transporter has earned less than it holds; if that ever stops
    // being true the two assertions below stop distinguishing the surfaces.
    expect(earned, 'earnings and balance must differ for this test to mean anything').not.toBe(balance);

    await signIn(page, request, DEMO.transporter);

    await page.goto('/console/earnings', { waitUntil: 'domcontentloaded' });
    const earnedLabel = page.getByText('Total earned');
    await expect(earnedLabel).toBeVisible();
    await expect(earnedLabel.locator('xpath=following-sibling::div[1]')).toHaveText(usd(earned));

    await page.goto('/console/wallet', { waitUntil: 'domcontentloaded' });
    const balanceLabel = page.getByText('Available balance');
    await expect(balanceLabel).toBeVisible();
    await expect(balanceLabel.locator('xpath=following-sibling::div[1]')).toHaveText(usd(balance));
  });
});

/* ── statements ───────────────────────────────────────────────────── */

test.describe('statements', () => {
  async function statementUrl(request: APIRequestContext, headers: Headers, kind: 'csv' | 'pdf') {
    const res = await request.post(`${API}/me/wallet/statement/token`, { headers });
    expect(res.ok(), `minting a statement token failed: ${res.status()}`).toBeTruthy();
    const { token: stmt } = (await res.json()) as { token: string };
    return `${API}/me/wallet/statement.${kind}?token=${stmt}`;
  }

  test('the CSV statement is a complete ledger that totals to the wallet balance', async ({ request }) => {
    const headers = await auth(request, DEMO.buyer);
    const url = await statementUrl(request, headers, 'csv');
    const { balanceCents } = await wallet(request, headers);

    const res = await request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/csv');
    expect(res.headers()['content-disposition']).toContain('attachment');

    const rows = parseCsv(await res.text());
    expect(rows[0]).toEqual(['Date', 'Type', 'Note', 'Amount', 'Balance']);
    const body = rows.slice(1);
    expect(body.length, 'the demo buyer has a ledger to export').toBeGreaterThan(0);

    // The whole point of a statement: it accounts for the balance. Every signed
    // amount summed must land exactly on what the wallet says it holds.
    const cents = (v: string) => Math.round(Number(v.replace(/^'/, '')) * 100);
    const summed = body.reduce((n, r) => n + cents(r[3]), 0);
    expect(summed, 'the statement must add up to the wallet balance').toBe(balanceCents);
    expect(cents(body[body.length - 1][4]), 'the running balance must end on the current balance').toBe(balanceCents);
  });

  test('statement amounts are numbers a spreadsheet can total', async ({ request }) => {
    // BUG: the CSV escaper neutralises formula injection on EVERY cell, so any
    // negative amount ("-250.00") is emitted as the text cell "'-250.00". The
    // injection guard belongs on the user-controlled Note column; applied to the
    // server's own toFixed(2) money columns it makes every debit unsummable in
    // Excel/Sheets — a statement that cannot be totalled is not a statement.
    const headers = await auth(request, DEMO.buyer);
    const res = await request.get(await statementUrl(request, headers, 'csv'));
    const body = parseCsv(await res.text()).slice(1);
    const unparseable = body.filter((r) => Number.isNaN(Number(r[3])) || Number.isNaN(Number(r[4])));
    expect(unparseable.map((r) => r.slice(3)), 'money columns must parse as numbers').toEqual([]);
  });

  test('the PDF statement streams a real PDF', async ({ request }) => {
    const headers = await auth(request, DEMO.buyer);
    const res = await request.get(await statementUrl(request, headers, 'pdf'));
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
    const body = await res.body();
    expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(body.byteLength, 'an empty PDF is a broken download').toBeGreaterThan(1000);
  });

  test('a statement download refuses anything but a minted statement token', async ({ request }) => {
    // F16: statement tokens are signed with a purpose-derived key, so an ordinary
    // access token must not open someone's whole financial history over a URL.
    const access = await token(request, DEMO.buyer);
    for (const query of ['', '?token=', `?token=${access}`, '?token=not-a-token']) {
      const res = await request.get(`${API}/me/wallet/statement.csv${query}`);
      expect(res.status(), `unauthenticated statement download accepted "${query}"`).toBe(401);
    }
  });
});

/* ── invoices ─────────────────────────────────────────────────────── */

test.describe('invoices', () => {
  interface Invoice {
    id: string;
    number: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    lines: { qty: number; unitPriceCents: number; amountCents: number }[];
  }

  test('invoice totals add up from their line items', async ({ request }) => {
    const headers = await auth(request, DEMO.seller);
    const res = await request.get(`${API}/invoices/mine`, { headers });
    expect(res.ok(), `GET /invoices/mine: ${res.status()}`).toBeTruthy();
    const invoices = (await res.json()) as Invoice[];
    expect(invoices.length, 'the seller has invoices to check').toBeGreaterThan(0);

    for (const inv of invoices) {
      for (const line of inv.lines) {
        expect(line.amountCents, `${inv.number}: line amount must be price × qty`).toBe(
          Math.round(line.unitPriceCents * line.qty),
        );
      }
      const subtotal = inv.lines.reduce((n, l) => n + l.amountCents, 0);
      expect(inv.subtotalCents, `${inv.number}: subtotal must be the sum of its lines`).toBe(subtotal);
      expect(inv.totalCents, `${inv.number}: total must be subtotal + tax`).toBe(inv.subtotalCents + inv.taxCents);
    }
  });

  test('a seller cannot invoice an order for more than the order total', async ({ request }) => {
    // F14: the order total is server-authoritative. Without this cap an issuer
    // can bill any number they like against a committed order.
    const headers = await auth(request, DEMO.seller);
    const orders = (await (await request.get(`${API}/orders/incoming`, { headers })).json()) as {
      id: string;
      amountCents: number | null;
    }[];
    const order = orders.find((o) => (o.amountCents ?? 0) > 0);
    expect(order, 'the seller needs a priced order to invoice').toBeTruthy();

    const over = await request.post(`${API}/invoices`, {
      headers,
      data: {
        kind: 'order',
        subjectId: order!.id,
        lines: [{ description: 'e2e over-cap', qty: 1, unitPriceCents: order!.amountCents! + 1 }],
      },
    });
    expect(over.status(), 'billing past the agreed amount must be refused').toBe(400);
    expect(await over.text()).toMatch(/cannot exceed the agreed amount/i);

    // The cap covers the GRAND total, so tax must not be a way around it.
    const viaTax = await request.post(`${API}/invoices`, {
      headers,
      data: {
        kind: 'order',
        subjectId: order!.id,
        lines: [{ description: 'e2e over-cap via tax', qty: 1, unitPriceCents: order!.amountCents! }],
        taxCents: 1,
      },
    });
    expect(viaTax.status(), 'tax must not lift the invoice past the order total').toBe(400);
  });

  test('an invoice PDF needs its own signed token', async ({ request }) => {
    const headers = await auth(request, DEMO.seller);
    const invoices = (await (await request.get(`${API}/invoices/mine`, { headers })).json()) as Invoice[];
    const invoice = invoices[0];
    expect(invoice, 'the seller has an invoice to download').toBeTruthy();

    const minted = await request.post(`${API}/invoices/${invoice.id}/pdf-token`, { headers });
    expect(minted.ok(), `pdf-token failed: ${minted.status()}`).toBeTruthy();
    const { token: pdfToken } = (await minted.json()) as { token: string };

    const ok = await request.get(`${API}/invoices/${invoice.id}/pdf?token=${pdfToken}`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()['content-type']).toContain('application/pdf');
    expect(ok.headers()['content-disposition']).toContain(invoice.number);
    const body = await ok.body();
    expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');

    const forged = await request.get(`${API}/invoices/${invoice.id}/pdf?token=not-a-token`);
    expect(forged.status(), 'an unsigned link must not open an invoice').toBe(401);
  });
});

/* ── plans, quotas and checkout ───────────────────────────────────── */

test.describe('subscriptions', () => {
  interface Plan {
    id: string;
    code: string;
    role: string;
    tier: number;
    name: string;
    active: boolean;
    prices: { cycle: 'monthly' | 'quarterly' | 'yearly'; amountMinor: number; perMonthMinor: number; currency: string }[];
  }

  const MONTHS = { monthly: 1, quarterly: 3, yearly: 12 } as const;

  test('the published price card is arithmetically honest', async ({ request }) => {
    const res = await request.get(`${API}/billing/plans`);
    expect(res.ok()).toBeTruthy();
    const plans = (await res.json()) as Plan[];
    expect(plans.length, 'the catalogue is empty — the pricing page has nothing to sell').toBeGreaterThan(0);

    for (const plan of plans) {
      for (const price of plan.prices) {
        expect(price.amountMinor, `${plan.code}/${price.cycle}: a published price must be positive`).toBeGreaterThan(0);
        expect(price.currency, `${plan.code}: prices are charged in rubles`).toBe('RUB');
        // The per-month figure printed beside a yearly price: rounded to whole
        // rubles, never a straight division that leaks kopecks onto the page.
        expect(price.perMonthMinor, `${plan.code}/${price.cycle}: per-month equivalent is wrong`).toBe(
          Math.round(price.amountMinor / MONTHS[price.cycle] / 100) * 100,
        );
      }
      const monthly = plan.prices.find((p) => p.cycle === 'monthly');
      const yearly = plan.prices.find((p) => p.cycle === 'yearly');
      if (monthly && yearly) {
        expect(
          yearly.perMonthMinor,
          `${plan.code}: the yearly cycle is advertised as a saving — it must cost less per month`,
        ).toBeLessThan(monthly.amountMinor);
      }
    }
  });

  test('the pricing page switches billing cycle and reprices', async ({ page, request }) => {
    const plans = ((await (await request.get(`${API}/billing/plans?role=seller`)).json()) as Plan[]).filter((p) => p.active);
    const paid = plans.find((p) => p.prices.length > 0);
    expect(paid, 'no paid seller plan to price').toBeTruthy();

    // Signed out on purpose: a price behind a login does not get sold.
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: paid!.name, exact: true })).toBeVisible();

    // Yearly is the default, and a yearly price is only legible next to its
    // per-month equivalent.
    const column = page.getByRole('heading', { name: paid!.name, exact: true }).locator('xpath=..');
    await expect(column).toContainText('/ month, billed for the full term');
    const yearlyText = await column.locator('.font-numeric').first().innerText();

    await page.getByRole('button', { name: 'Monthly', exact: true }).click();
    await expect(page).toHaveURL(/cycle=monthly/);
    await expect(column).toContainText('per month');
    await expect(column).not.toContainText('billed for the full term');
    const monthlyText = await column.locator('.font-numeric').first().innerText();

    // Whatever currency the visitor is shown, a year must cost more than a month.
    const digits = (s: string) => Number(s.replace(/[^\d]/g, ''));
    expect(digits(yearlyText), `yearly "${yearlyText}" vs monthly "${monthlyText}"`).toBeGreaterThan(digits(monthlyText));
  });

  test('the billing console shows the plan and quota meters the API reports', async ({ page, request }) => {
    const headers = await auth(request, DEMO.loaderco);
    const overview = (await (await request.get(`${API}/me/billing`, { headers })).json()) as {
      entitlements: Record<string, { planName: string }>;
      usage: Record<string, { key: string; used: number; limit: number | null; enforced: boolean }[]>;
    };
    const meters = (overview.usage.loaderco ?? []).filter((r) => r.enforced && r.limit !== null);
    expect(meters.length, 'the loader company should have enforced quotas to meter').toBeGreaterThan(0);

    await signIn(page, request, DEMO.loaderco);
    await page.goto('/console/billing', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: overview.entitlements.loaderco.planName })).toBeVisible();
    const usage = page.getByRole('heading', { name: 'Your usage' }).locator('xpath=..');
    for (const row of meters) {
      // "1 of 5 used" — a swapped used/limit reads "5 of 1 used" and fails here.
      await expect(usage, `meter for ${row.key}`).toContainText(`${row.used} of ${row.limit} used`);
    }
  });

  test('the payment return page never claims success on its own', async ({ page, request }) => {
    // Landing on this URL proves only that a browser followed a link. The
    // verified webhook is the sole authority on whether money arrived.
    await signIn(page, request, DEMO.seller);
    await page.goto('/billing/return?payment=not-a-real-payment', { waitUntil: 'domcontentloaded' });

    // React Query retries the 404 a few times before it settles into an error.
    await expect(page.getByText('We could not find that payment.')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('heading', { name: 'Payment received' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Confirming your payment' })).toBeVisible();

    // …and it does report a payment the API confirms as paid.
    const headers = await auth(request, DEMO.seller);
    const billing = (await (await request.get(`${API}/me/billing`, { headers })).json()) as {
      payments: { id: string; status: string }[];
    };
    const paid = billing.payments.find((p) => p.status === 'succeeded');
    test.skip(!paid, 'no settled payment on the demo seller to confirm');
    await page.goto(`/billing/return?payment=${paid!.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible();
  });
});
