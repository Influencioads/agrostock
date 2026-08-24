import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, DEMO, signIn, token } from './helpers';

/**
 * Order management, end to end.
 *
 * An order is the only object on this platform that moves goods, stock, escrow
 * and an invoice at the same time, so these tests assert the *numbers* and the
 * *refusals*, not that a panel painted. Every test creates its own order and
 * closes it again, so the suite is re-runnable against the shared demo data:
 *   - cancelling an order releases the stock it reserved,
 *   - the one test that actually delivers (and therefore consumes stock) puts
 *     the listing's count back in a `finally`.
 */

// ── fixtures ─────────────────────────────────────────────────────

async function as(request: APIRequestContext, email: string) {
  return { Authorization: `Bearer ${await token(request, email)}` };
}

/** The account id inside a JWT — the platform exposes no `/me` identity route. */
function userId(jwt: string): string {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).sub as string;
}

interface Listing {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  moq: string | null;
  stockQty: number | null;
}

/**
 * The seller's own listing, resolved rather than hardcoded: an auction lot or an
 * unpriced listing is deliberately NOT buyable, so the tests must pick one that
 * the direct-buy path accepts.
 */
async function listing(request: APIRequestContext): Promise<Listing> {
  const res = await request.get(`${API}/products/mine`, { headers: await as(request, DEMO.seller) });
  expect(res.ok(), `products/mine failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  const rows = (Array.isArray(body) ? body : (body.items ?? [])) as Record<string, unknown>[];
  const p = rows.find((r) => r.status === 'live' && !r.isAuction && Number(r.priceCents ?? 0) > 0);
  expect(p, 'the seller has no live, priced, non-auction listing to order').toBeTruthy();
  return {
    id: String(p!.id),
    slug: String(p!.slug),
    name: String(p!.name),
    priceCents: Number(p!.priceCents),
    moq: (p!.moq as string | null) ?? null,
    stockQty: (p!.stockQty as number | null) ?? null,
  };
}

/** The smallest quantity the listing accepts, stated in the listing's own unit. */
const minQty = (l: Listing) => Math.max(1, Math.ceil(Number(String(l.moq ?? '').replace(/[^\d.]/g, '')) || 1));

/** What the console renders for a USD-cents amount (`console/lib.ts#usd`). */
const usd = (cents: number) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** What the checkout renders (`formatMoney`, USD at rate 1). */
const money = (cents: number) =>
  new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(cents / 100);

/** The destination every order in this file ships to. */
const DESTINATION = {
  deliveryCity: 'Dubai',
  deliveryCountry: 'United Arab Emirates',
  deliveryAddress: 'Plot 7, Al Quoz Industrial 3',
  deliveryPostcode: '00000',
  deliveryMarket: 'Al Aweer Central Market',
  deliveryLocation: 'Al Quoz',
  deliveryName: 'E2E Consignee',
  deliveryPhone: '+971 50 000 0000',
  deliveryEmail: 'e2e-consignee@example.com',
};

async function place(request: APIRequestContext, l: Listing, extra: Record<string, unknown> = {}) {
  const res = await request.post(`${API}/orders`, {
    headers: await as(request, DEMO.buyer),
    data: { productSlug: l.slug, qty: minQty(l), ...DESTINATION, ...extra },
  });
  expect(res.ok(), `place order failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

/**
 * Best-effort teardown. A dispatched order has no cancel edge at all — its only
 * way out is a dispute — so both routes are tried and neither is asserted.
 */
async function close(request: APIRequestContext, id: string) {
  const headers = await as(request, DEMO.buyer);
  const move = (status: string) => request.patch(`${API}/orders/${id}/status`, { headers, data: { status } });
  if ((await move('cancelled')).ok()) return;
  await move('dispute');
  await move('cancelled');
}

async function stockOf(request: APIRequestContext, slug: string) {
  const p = await (await request.get(`${API}/products/${slug}`)).json();
  return { stockQty: p.stockQty as number | null, reservedQty: Number(p.reservedQty ?? 0) };
}

/** Put a delivered order's consumed units back, so the file can run again. */
async function restock(request: APIRequestContext, l: Listing) {
  if (l.stockQty === null) return;
  await request.patch(`${API}/products/${l.id}`, {
    headers: await as(request, DEMO.seller),
    data: { stockQty: l.stockQty },
  });
}

// ── lifecycle & money, through the API ───────────────────────────

test.describe('order lifecycle', () => {
  test('a buy-now order is priced at unit price × quantity and reaches both parties', async ({ request }) => {
    const l = await listing(request);
    const qty = minQty(l);
    const order = await place(request, l);

    try {
      // The arithmetic, not "a number rendered".
      expect(order.unitPriceCents, 'the order did not take the listing price').toBe(l.priceCents);
      expect(order.qtyValue).toBe(qty);
      expect(order.amountCents, 'order total is not unit price × quantity').toBe(l.priceCents * qty);
      expect(order.currency).toBe('USD');
      // The display string is derived from the cents and must not drift from it.
      expect(Math.round(Number(String(order.amount).replace(/[^\d.]/g, '')) * 100)).toBe(order.amountCents);
      expect(order.status).toBe('processing');
      expect(order.deliveryCity).toBe(DESTINATION.deliveryCity);

      const mine = await (await request.get(`${API}/orders/mine`, { headers: await as(request, DEMO.buyer) })).json();
      const asBuyer = mine.find((o: { id: string }) => o.id === order.id);
      expect(asBuyer, 'the placed order is missing from the buyer list').toBeTruthy();

      const incoming = await (
        await request.get(`${API}/orders/incoming`, { headers: await as(request, DEMO.seller) })
      ).json();
      const asSeller = incoming.find((o: { id: string }) => o.id === order.id);
      expect(asSeller, 'the placed order never reached the seller').toBeTruthy();

      // Both sides must be looking at the same money.
      expect(asSeller.amountCents).toBe(asBuyer.amountCents);
      expect(asSeller.amount).toBe(asBuyer.amount);
      expect(asSeller.currency).toBe(asBuyer.currency);
      expect(asSeller.qty).toBe(asBuyer.qty);

      // And nobody else's list carries it.
      const others = await (
        await request.get(`${API}/orders/transporting`, { headers: await as(request, DEMO.transporter) })
      ).json();
      expect(
        others.some((o: { id: string }) => o.id === order.id),
        'an undispatched order showed up in a transporter work queue',
      ).toBeFalsy();
    } finally {
      await close(request, order.id);
    }
  });

  test('the order detail is readable by both parties and refused to everyone else', async ({ request }) => {
    const l = await listing(request);
    const order = await place(request, l);

    try {
      const buyerRes = await request.get(`${API}/orders/${order.id}`, { headers: await as(request, DEMO.buyer) });
      expect(buyerRes.status()).toBe(200);
      const buyerView = await buyerRes.json();
      expect(buyerView.parties).toEqual(['buyer']);
      expect(buyerView.reference).toBe(order.reference);

      const sellerRes = await request.get(`${API}/orders/${order.id}`, { headers: await as(request, DEMO.seller) });
      expect(sellerRes.status()).toBe(200);
      expect((await sellerRes.json()).parties).toEqual(['seller']);

      // A logged-in stranger is not a party to this trade.
      const stranger = await request.get(`${API}/orders/${order.id}`, {
        headers: await as(request, DEMO.transporter),
      });
      expect(stranger.status(), 'an unrelated account could read the order').toBe(403);
      expect((await stranger.json()).message).toContain('Not your order');

      const loader = await request.get(`${API}/orders/${order.id}`, { headers: await as(request, DEMO.loaderco) });
      expect(loader.status()).toBe(403);

      // Admins oversee every order.
      const admin = await request.get(`${API}/orders/${order.id}`, { headers: await as(request, DEMO.admin) });
      expect(admin.status()).toBe(200);

      const missing = await request.get(`${API}/orders/no-such-order-id`, { headers: await as(request, DEMO.buyer) });
      expect(missing.status()).toBe(404);
    } finally {
      await close(request, order.id);
    }
  });

  test('illegal transitions and other-party moves are refused', async ({ request }) => {
    const l = await listing(request);
    const buyer = await as(request, DEMO.buyer);
    const seller = await as(request, DEMO.seller);
    const order = await place(request, l);

    try {
      const move = (headers: Record<string, string>, status: string) =>
        request.patch(`${API}/orders/${order.id}/status`, { headers, data: { status } });

      // The OTP handshake owns dispatched/in_transit/delivered — a plain PATCH
      // must never be able to walk an order past a pickup that never happened.
      for (const status of ['delivered', 'in_transit', 'dispatched']) {
        const res = await move(buyer, status);
        expect(res.status(), `buyer moved the order straight to ${status}`).toBe(400);
        expect((await res.json()).message).toMatch(/dispatch|OTP/i);
      }

      // Packing is the seller's move, on the seller's goods.
      const buyerPacks = await move(buyer, 'packed');
      expect(buyerPacks.status(), 'the buyer packed the seller’s order').toBe(403);
      expect((await buyerPacks.json()).message).toContain('Only the seller');

      // Still `processing` after all of that.
      const detail = await (await request.get(`${API}/orders/${order.id}`, { headers: buyer })).json();
      expect(detail.status).toBe('processing');

      // Cancelled is terminal — no re-opening it into a live order.
      expect((await move(buyer, 'cancelled')).ok()).toBeTruthy();
      const reopen = await move(seller, 'processing');
      expect(reopen.status(), 'a cancelled order was re-opened').toBe(400);
      const repack = await move(seller, 'packed');
      expect(repack.status(), 'a cancelled order was packed').toBe(400);
    } finally {
      await close(request, order.id);
    }
  });

  test('an enquiry becomes a quote, and accepting it is the buyer’s move alone', async ({ request }) => {
    const l = await listing(request);
    const qty = minQty(l);
    const buyer = await as(request, DEMO.buyer);
    const seller = await as(request, DEMO.seller);

    const res = await request.post(`${API}/orders/enquiry`, {
      headers: buyer,
      data: { productSlug: l.slug, qty, note: 'e2e enquiry', ...DESTINATION },
    });
    expect(res.ok(), `enquiry failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    const order = await res.json();

    try {
      expect(order.status).toBe('enquiry');
      // An enquiry is quoted at the listed price until the seller says otherwise.
      expect(order.amountCents).toBe(l.priceCents * qty);

      // The seller re-prices; the total has to follow the new unit price.
      const quoted = l.priceCents + 600;
      const respond = await request.patch(`${API}/orders/${order.id}/respond`, {
        headers: seller,
        data: { unitPriceCents: quoted, note: 'e2e quote' },
      });
      expect(respond.ok(), `respond failed: ${respond.status()} ${await respond.text()}`).toBeTruthy();
      const quote = await respond.json();
      expect(quote.status).toBe('quote');
      expect(quote.unitPriceCents).toBe(quoted);
      expect(quote.amountCents, 'the requote did not re-multiply the quantity').toBe(quoted * qty);
      expect(Math.round(Number(String(quote.amount).replace(/[^\d.]/g, '')) * 100)).toBe(quote.amountCents);

      // A seller cannot accept their own quote on the buyer's behalf.
      const selfAccept = await request.patch(`${API}/orders/${order.id}/status`, {
        headers: seller,
        data: { status: 'processing' },
      });
      expect(selfAccept.status(), 'the seller accepted their own quote').toBe(403);
      expect((await selfAccept.json()).message).toContain('Only the buyer');

      // Accepting reserves stock, exactly as buy-now does.
      const before = await stockOf(request, l.slug);
      const accept = await request.patch(`${API}/orders/${order.id}/status`, {
        headers: buyer,
        data: { status: 'processing' },
      });
      expect(accept.ok()).toBeTruthy();
      const accepted = await accept.json();
      expect(accepted.status).toBe('processing');
      expect(accepted.amountCents, 'the accepted order lost the quoted price').toBe(quoted * qty);
      if (before.stockQty !== null) {
        expect((await stockOf(request, l.slug)).reservedQty).toBe(before.reservedQty + qty);
      }

      // A quote is answered once.
      const again = await request.patch(`${API}/orders/${order.id}/respond`, {
        headers: seller,
        data: { unitPriceCents: quoted + 100 },
      });
      expect(again.status(), 'the seller re-quoted an order the buyer had accepted').toBe(400);

      // Cancelling hands the reservation back.
      const cancel = await request.patch(`${API}/orders/${order.id}/status`, {
        headers: buyer,
        data: { status: 'cancelled' },
      });
      expect(cancel.ok()).toBeTruthy();
      if (before.stockQty !== null) {
        expect(
          (await stockOf(request, l.slug)).reservedQty,
          'cancelling stranded the stock the order was holding',
        ).toBe(before.reservedQty);
      }
    } finally {
      await close(request, order.id);
    }
  });

  test('dispatch → pickup OTP → delivery OTP closes the order and consumes the stock', async ({ request }) => {
    const l = await listing(request);
    const qty = minQty(l);
    const buyer = await as(request, DEMO.buyer);
    const seller = await as(request, DEMO.seller);
    const before = await stockOf(request, l.slug);
    const order = await place(request, l);

    try {
      if (before.stockQty !== null) {
        expect((await stockOf(request, l.slug)).reservedQty).toBe(before.reservedQty + qty);
      }

      // Dispatch is gated on the goods being packed.
      const early = await request.post(`${API}/orders/${order.id}/dispatch`, {
        headers: seller,
        data: { mode: 'external', transporterName: 'E2E Carrier' },
      });
      expect(early.status(), 'an unpacked order was dispatched').toBe(400);

      expect(
        (await request.patch(`${API}/orders/${order.id}/status`, { headers: seller, data: { status: 'packed' } })).ok(),
      ).toBeTruthy();

      const dispatchRes = await request.post(`${API}/orders/${order.id}/dispatch`, {
        headers: seller,
        data: { mode: 'external', transporterName: 'E2E Carrier', vehiclePlate: 'E2E-0001', driverName: 'E2E Driver' },
      });
      expect(dispatchRes.ok(), `dispatch failed: ${dispatchRes.status()} ${await dispatchRes.text()}`).toBeTruthy();
      const dispatched = await dispatchRes.json();
      expect(dispatched.status).toBe('dispatched');
      expect(dispatched.dispatchMode).toBe('external');
      expect(dispatched.transporterName).toBe('E2E Carrier');
      expect(dispatched.pickupOtp, 'dispatch minted no pickup code').toMatch(/^\d{4,8}$/);

      // Each party holds exactly one half of the handshake.
      const buyerView = await (await request.get(`${API}/orders/${order.id}`, { headers: buyer })).json();
      const sellerView = await (await request.get(`${API}/orders/${order.id}`, { headers: seller })).json();
      expect(buyerView.pickupOtp, 'the buyer was shown the seller’s pickup code').toBeNull();
      expect(buyerView.deliveryOtp).toMatch(/^\d{4,8}$/);
      expect(sellerView.deliveryOtp, 'the seller was shown the buyer’s delivery code').toBeNull();
      expect(sellerView.pickupOtp).toBe(dispatched.pickupOtp);

      // Nothing is delivered before it is collected.
      const tooEarly = await request.post(`${API}/orders/${order.id}/delivery/verify`, {
        headers: buyer,
        data: { otp: buyerView.deliveryOtp },
      });
      expect(tooEarly.status(), 'delivery was confirmed before pickup').toBe(400);
      expect((await tooEarly.json()).message).toContain('not in transit');

      // A guessed code is refused.
      const guess = await request.post(`${API}/orders/${order.id}/pickup/verify`, {
        headers: seller,
        data: { otp: '000000' },
      });
      expect(guess.status()).toBe(400);
      expect((await guess.json()).message).toContain('Incorrect pickup OTP');

      // On an external dispatch, pickup is the seller's to confirm — even holding
      // the right code, the buyer is not the party that hands the goods over.
      const wrongParty = await request.post(`${API}/orders/${order.id}/pickup/verify`, {
        headers: buyer,
        data: { otp: dispatched.pickupOtp },
      });
      expect(wrongParty.status(), 'the buyer confirmed the seller’s pickup').toBe(403);

      const pickup = await request.post(`${API}/orders/${order.id}/pickup/verify`, {
        headers: seller,
        data: { otp: dispatched.pickupOtp },
      });
      expect(pickup.ok(), `pickup verify failed: ${await pickup.text()}`).toBeTruthy();
      expect((await pickup.json()).status).toBe('in_transit');

      const delivery = await request.post(`${API}/orders/${order.id}/delivery/verify`, {
        headers: buyer,
        data: { otp: buyerView.deliveryOtp },
      });
      expect(delivery.ok(), `delivery verify failed: ${await delivery.text()}`).toBeTruthy();
      expect((await delivery.json()).status).toBe('delivered');

      // Delivery consumes the units the order had been holding.
      if (before.stockQty !== null) {
        const after = await stockOf(request, l.slug);
        expect(after.stockQty, 'a delivered order did not draw its units out of stock').toBe(before.stockQty - qty);
        expect(after.reservedQty).toBe(before.reservedQty);
      }

      // Delivered is terminal: no cancelling a trade that already completed.
      const late = await request.patch(`${API}/orders/${order.id}/status`, {
        headers: buyer,
        data: { status: 'cancelled' },
      });
      expect(late.status(), 'a delivered order was cancelled').toBe(400);

      // The timeline is the real sequence of events, with no invented steps.
      const closed = await (await request.get(`${API}/orders/${order.id}`, { headers: buyer })).json();
      expect(closed.events.map((e: { toStatus: string }) => e.toStatus)).toEqual([
        'processing',
        'packed',
        'dispatched',
        'in_transit',
        'delivered',
      ]);
      expect(closed.deliveryVerifiedAt).toBeTruthy();
    } finally {
      // A mid-test failure can leave the order holding its reservation; a
      // delivered one shrugs both of these off.
      await close(request, order.id);
      await restock(request, l);
    }
  });

  test('an order invoice bills exactly the order total, to the buyer, on both sides', async ({ request }) => {
    const l = await listing(request);
    const seller = await as(request, DEMO.seller);
    const buyer = await as(request, DEMO.buyer);
    const order = await place(request, l);
    let invoiceId: string | undefined;

    try {
      const res = await request.post(`${API}/invoices`, {
        headers: seller,
        data: { kind: 'order', subjectId: order.id, taxCents: 0 },
      });
      expect(res.ok(), `invoice failed: ${res.status()} ${await res.text()}`).toBeTruthy();
      const invoice = await res.json();
      invoiceId = invoice.id;

      expect(invoice.orderId).toBe(order.id);
      expect(invoice.recipientId, 'the invoice was not addressed to the buyer').toBe(userId(await token(request, DEMO.buyer)));
      expect(invoice.currency).toBe(order.currency);
      expect(invoice.subtotalCents, 'invoice subtotal does not match the order total').toBe(order.amountCents);
      expect(invoice.totalCents).toBe(invoice.subtotalCents + invoice.taxCents);

      // The line has to restate the same trade, not just carry the same number.
      expect(invoice.lines).toHaveLength(1);
      const line = invoice.lines[0];
      expect(line.qty).toBe(order.qtyValue);
      expect(line.unit).toBe(order.qtyUnit);
      expect(line.unitPriceCents).toBe(order.unitPriceCents);
      expect(line.amountCents, 'invoice line is not qty × unit price').toBe(line.qty * line.unitPriceCents);
      expect(line.description).toContain(order.reference);

      // A seller cannot bill more than the order the buyer committed to.
      const inflated = await request.post(`${API}/invoices`, {
        headers: seller,
        data: { kind: 'order', subjectId: order.id, taxCents: order.amountCents },
      });
      expect(inflated.status(), 'the seller invoiced above the agreed order total').toBe(400);

      // Only the seller may bill their own order.
      const notMine = await request.post(`${API}/invoices`, {
        headers: await as(request, DEMO.transporter),
        data: { kind: 'order', subjectId: order.id },
      });
      expect(notMine.status()).toBeGreaterThanOrEqual(400);

      // Both sides can see it, with the same total.
      const issued = await (await request.get(`${API}/invoices/mine?direction=issued`, { headers: seller })).json();
      const received = await (await request.get(`${API}/invoices/mine?direction=received`, { headers: buyer })).json();
      const onSeller = issued.find((i: { id: string }) => i.id === invoice.id);
      const onBuyer = received.find((i: { id: string }) => i.id === invoice.id);
      expect(onSeller, 'the invoice is missing from the seller’s issued list').toBeTruthy();
      expect(onBuyer, 'the invoice never reached the buyer').toBeTruthy();
      expect(onBuyer.totalCents).toBe(onSeller.totalCents);
      expect(onBuyer.totalCents).toBe(order.amountCents);

      // And it hangs off the order itself.
      const detail = await (await request.get(`${API}/orders/${order.id}`, { headers: buyer })).json();
      expect(detail.invoices.map((i: { id: string }) => i.id)).toContain(invoice.id);
    } finally {
      if (invoiceId) {
        await request.patch(`${API}/invoices/${invoiceId}/status`, { headers: seller, data: { status: 'void' } });
      }
      await close(request, order.id);
    }
  });
});

// ── OTP disclosure ───────────────────────────────────────────────

test.describe('order OTP disclosure', () => {
  /**
   * The two-code handshake only works while no single account holds both codes:
   * the seller reads the pickup OTP, the buyer reads the delivery OTP, and the
   * carrier is given each one by hand.
   *
   * `GET /orders/:id` masks them correctly. The three LIST routes
   * (`mine` / `incoming` / `transporting`) return the raw Order row.
   */
  test('the order list endpoints must not hand a party the other side’s OTP', async ({ request }) => {
    const l = await listing(request);
    const buyer = await as(request, DEMO.buyer);
    const seller = await as(request, DEMO.seller);
    const carrier = await as(request, DEMO.transporter);
    const order = await place(request, l);

    try {
      expect(
        (await request.patch(`${API}/orders/${order.id}/status`, { headers: seller, data: { status: 'packed' } })).ok(),
      ).toBeTruthy();

      const res = await request.post(`${API}/orders/${order.id}/dispatch`, {
        headers: seller,
        data: { mode: 'platform', transporterUserId: userId(await token(request, DEMO.transporter)) },
      });
      expect(res.ok(), `dispatch failed: ${res.status()} ${await res.text()}`).toBeTruthy();
      const dispatched = await res.json();
      expect(dispatched.pickupOtp, 'dispatch minted no pickup code').toBeTruthy();

      const find = async (path: string, headers: Record<string, string>) => {
        const rows = await (await request.get(`${API}${path}`, { headers })).json();
        const row = rows.find((o: { id: string }) => o.id === order.id);
        expect(row, `${path} did not return the dispatched order`).toBeTruthy();
        return row as { pickupOtp: string | null; deliveryOtp: string | null };
      };

      const mine = await find('/orders/mine', buyer);
      expect(mine.pickupOtp ?? null, 'GET /orders/mine handed the buyer the seller’s pickup OTP').toBeNull();

      const incoming = await find('/orders/incoming', seller);
      expect(
        incoming.deliveryOtp ?? null,
        'GET /orders/incoming handed the seller the buyer’s delivery OTP',
      ).toBeNull();

      // The worst of the three: the carrier is meant to receive NEITHER code —
      // holding both lets them confirm their own pickup and their own delivery,
      // which closes the order, consumes the stock and releases escrow to the
      // seller without either party ever handing anything over.
      const transporting = await find('/orders/transporting', carrier);
      expect(
        transporting.pickupOtp ?? null,
        'GET /orders/transporting handed the carrier the seller’s pickup OTP',
      ).toBeNull();
      expect(
        transporting.deliveryOtp ?? null,
        'GET /orders/transporting handed the carrier the buyer’s delivery OTP',
      ).toBeNull();
    } finally {
      await close(request, order.id);
    }
  });
});

// ── the console, through the browser ─────────────────────────────

test.describe('orders in the console', () => {
  test('checkout places a real order from the cart at the listed price', async ({ page, request }) => {
    const l = await listing(request);
    const qty = minQty(l);
    const expected = l.priceCents * qty;

    const crashes: string[] = [];
    page.on('pageerror', (e) => crashes.push(e.message));
    const serverErrors: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/api/') && r.status() >= 500) serverErrors.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });

    await signIn(page, request, DEMO.buyer);
    await page.evaluate(
      ([slug, q]) => localStorage.setItem('agrotraders.cart', JSON.stringify([{ slug, qty: q }])),
      [l.slug, qty] as const,
    );

    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });

    const placeButton = page.getByRole('button', { name: 'Place order' });
    await expect(placeButton).toBeVisible();
    // The estimate is the same multiplication the server will do.
    await expect(page.getByText(money(expected)).first(), 'checkout total is not price × quantity').toBeVisible();

    // Registration never captures a street, so this is the one field a buyer
    // always has to fill before anything can be shipped.
    await page.getByPlaceholder('Street, building, warehouse gate').fill(DESTINATION.deliveryAddress);
    await placeButton.click();

    const outcome = page.locator('li').filter({ hasText: /AG-[A-Z0-9-]+ placed/ });
    await expect(outcome, 'checkout reported no placed order').toHaveCount(1, { timeout: 20_000 });
    const reference = (await outcome.innerText()).match(/AG-[A-Z0-9-]+/)![0];

    // A placed line leaves the cart, so there is nothing left to order.
    await expect(placeButton, 'the placed line stayed in the cart').toBeDisabled();

    const mine = await (await request.get(`${API}/orders/mine`, { headers: await as(request, DEMO.buyer) })).json();
    const order = mine.find((o: { reference: string }) => o.reference === reference);
    try {
      expect(order, 'the reference the UI showed matches no real order').toBeTruthy();
      expect(order.amountCents, 'the order the UI placed is priced differently to the listing').toBe(expected);
      expect(order.qtyValue).toBe(qty);
      expect(order.status).toBe('processing');
      // The destination the form collected actually reached the order.
      expect(order.deliveryAddress).toBe(DESTINATION.deliveryAddress);
      expect(crashes, 'the checkout page threw').toEqual([]);
      expect(serverErrors, '5xx while checking out').toEqual([]);
    } finally {
      if (order) await close(request, order.id);
    }
  });

  test('the buyer console lists the order it just placed', async ({ page, request }) => {
    const l = await listing(request);
    const order = await place(request, l);

    try {
      await signIn(page, request, DEMO.buyer);
      await page.goto('/console/orders', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { name: 'My Orders' })).toBeVisible();
      // Exactly the line BuyerOrders renders: reference · quantity · seller.
      await expect(
        page.getByText(`#${order.reference} · ${order.qty} · ${order.seller.name}`),
        'the order is not listed for the buyer',
      ).toBeVisible();
      await expect(page.getByText(order.amount, { exact: true }).first()).toBeVisible();
      // A `processing` order is one the buyer is still allowed to walk away from.
      await expect(page.getByRole('button', { name: 'Cancel order' }).first()).toBeVisible();
    } finally {
      await close(request, order.id);
    }
  });

  test('the seller console shows the same order, buyer and total', async ({ page, request }) => {
    const l = await listing(request);
    const order = await place(request, l);

    try {
      await signIn(page, request, DEMO.seller);
      await page.goto('/console/orders', { waitUntil: 'domcontentloaded' });

      await expect(page.getByRole('heading', { name: 'Incoming Orders' })).toBeVisible();
      const row = page.locator('tr').filter({ hasText: order.reference });
      await expect(row, 'the order never reached the seller’s table').toHaveCount(1);

      // Same money on the other side of the trade, to the character.
      await expect(row).toContainText(order.amount);
      await expect(row).toContainText(order.buyer.name);
      await expect(row).toContainText(order.product.name);
      await expect(row).toContainText('Processing');
      // A processing order is the seller's to pack next.
      await expect(row.getByRole('button', { name: 'Mark Packed & ready' })).toBeVisible();
    } finally {
      await close(request, order.id);
    }
  });

  test('an order deep link opens that order for the buyer', async ({ page, request }) => {
    const l = await listing(request);
    const order = await place(request, l);

    try {
      await signIn(page, request, DEMO.buyer);
      // What every order notification links to.
      await page.goto(`/orders/${order.id}`, { waitUntil: 'domcontentloaded' });

      const drawer = page.getByRole('dialog');
      await expect(drawer, 'the deep link did not open the order').toBeVisible();
      await expect(page.getByRole('heading', { name: `Order ${order.reference}` })).toBeVisible();
      // The drawer is unambiguously this order, so the total can be asserted here.
      await expect(drawer).toContainText(order.amount);
      await expect(drawer).toContainText(order.qty);
      await expect(drawer.getByRole('heading', { name: 'Timeline' })).toBeVisible();
      // Real events off the order, not an invented stepper.
      await expect(drawer).toContainText('Processing');
      // The destination the buyer named at checkout.
      await expect(drawer).toContainText(DESTINATION.deliveryAddress);
      await expect(drawer).toContainText(DESTINATION.deliveryName);
    } finally {
      await close(request, order.id);
    }
  });

  test('an order deep link opens that order for the seller', async ({ page, request }) => {
    const l = await listing(request);
    const order = await place(request, l);

    try {
      await signIn(page, request, DEMO.seller);
      // Sellers are notified about their orders too (`order.new_order`,
      // `order.status_changed`) and every one of those notifications links to
      // /orders/:id, so the same deep link has to open the same order here.
      await page.goto(`/orders/${order.id}`, { waitUntil: 'domcontentloaded' });

      const drawer = page.getByRole('dialog');
      await expect(drawer, 'the seller’s order deep link opened nothing').toBeVisible();
      await expect(page.getByRole('heading', { name: `Order ${order.reference}` })).toBeVisible();
      await expect(drawer).toContainText(order.amount);
    } finally {
      await close(request, order.id);
    }
  });

  test('arranging logistics is scoped to the order and its route', async ({ page, request }) => {
    const l = await listing(request);
    const order = await place(request, l);

    try {
      await signIn(page, request, DEMO.seller);
      await page.goto('/console/orders', { waitUntil: 'domcontentloaded' });

      const row = page.locator('tr').filter({ hasText: order.reference });
      await expect(row).toHaveCount(1);
      await row.getByRole('button', { name: 'Logistics' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      // Scoped to THIS order, not a generic provider browser.
      await expect(page.getByRole('heading', { name: new RegExp(`Arrange logistics.*#${order.reference}`) })).toBeVisible();
      // And filtered to the route the order actually runs on.
      await expect(
        dialog.getByText(new RegExp(`Showing providers who serve .*${DESTINATION.deliveryCity}`)),
        'the provider list is not filtered to this order’s route',
      ).toBeVisible();

      await expect(dialog.getByRole('button', { name: 'Transporters' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Loading companies' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Workers' })).toBeVisible();
      // At least one carrier serving this lane, hireable straight off the order.
      await expect(
        dialog.getByRole('button', { name: 'Hire' }).first(),
        'no transporter serving this route was offered',
      ).toBeVisible();
    } finally {
      await close(request, order.id);
    }
  });

  test('the order invoice shows the same total in both consoles', async ({ page, request }) => {
    const l = await listing(request);
    const seller = await as(request, DEMO.seller);
    const order = await place(request, l);
    const res = await request.post(`${API}/invoices`, {
      headers: seller,
      data: { kind: 'order', subjectId: order.id, taxCents: 0 },
    });
    expect(res.ok(), `invoice failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    const invoice = await res.json();
    const shown = usd(invoice.totalCents);

    try {
      expect(invoice.totalCents, 'the invoice does not bill the order total').toBe(order.amountCents);

      await signIn(page, request, DEMO.buyer);
      await page.goto('/console/invoices', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(invoice.number), 'the invoice is missing from the buyer’s console').toBeVisible();
      // The buyer's row names the order it bills, which is what ties the two together.
      await expect(page.getByText(`#${order.reference}`).first()).toBeVisible();
      await expect(page.getByText(shown, { exact: true }).first()).toBeVisible();

      await signIn(page, request, DEMO.seller);
      await page.goto('/console/invoices', { waitUntil: 'domcontentloaded' });
      // The seller's list row is a button, so the amount can be asserted on the
      // row itself rather than merely somewhere on a page full of invoices.
      const row = page.getByRole('button').filter({ hasText: invoice.number });
      await expect(row, 'the invoice is missing from the seller’s console').toHaveCount(1);
      await expect(row, 'the two sides of the trade show different invoice totals').toContainText(shown);

      await row.click();
      const detail = page.getByRole('dialog');
      await expect(page.getByRole('heading', { name: `Invoice ${invoice.number}` })).toBeVisible();
      // The billed line is the order, restated: description, quantity, money.
      await expect(detail).toContainText(order.reference);
      await expect(detail).toContainText(`${order.qtyValue} ${order.qtyUnit}`);
      await expect(detail).toContainText(shown);
    } finally {
      await request.patch(`${API}/invoices/${invoice.id}/status`, { headers: seller, data: { status: 'void' } });
      await close(request, order.id);
    }
  });
});
