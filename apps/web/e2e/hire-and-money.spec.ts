import { expect, test } from '@playwright/test';
import { API, DEMO, token } from './helpers';

/**
 * Hiring and the money it moves.
 *
 * Every path here debits a wallet or holds escrow, so these assert the guards as
 * hard as the happy path — a hire that succeeds without a hold is worse than one
 * that fails.
 */

/** Ensure the buyer can afford the holds these tests take. */
async function fund(request: Parameters<typeof token>[0], auth: Record<string, string>) {
  await request.post(`${API}/me/wallet/topup`, { headers: auth, data: { amount: 5000 } });
}

test('a hire can be sent to every provider type the platform supports', async ({ request }) => {
  const auth = { Authorization: `Bearer ${await token(request, DEMO.seller)}` };
  await fund(request, auth);

  const pick = async (path: string) => {
    const body = await (await request.get(`${API}${path}`)).json();
    return (body.items ?? body)[0];
  };

  const targets = [
    { targetType: 'transporter', row: await pick('/directory/transporters') },
    { targetType: 'loaderco', row: await pick('/directory/loaders') },
    { targetType: 'service_provider', row: await pick('/services/providers') },
  ];

  for (const { targetType, row } of targets) {
    expect(row, `no ${targetType} seeded`).toBeTruthy();
    const targetUserId = row.user?.id ?? row.id;

    const res = await request.post(`${API}/hires`, {
      headers: auth,
      data: {
        targetType,
        targetUserId,
        location: 'Mundra',
        fromCity: 'Mundra',
        toCity: 'Dubai',
        message: `e2e ${targetType}`,
        budgetCents: 25_000,
      },
    });
    expect(res.status(), `hire to ${targetType} failed: ${await res.text()}`).toBeLessThan(300);
    const hire = await res.json();
    expect(hire.reference, `${targetType} hire has no reference`).toBeTruthy();
    expect(hire.status).toBe('pending');
    expect(hire.targetType).toBe(targetType);
  }
});

test('the hire validator accepts every target type the schema declares', async ({ request }) => {
  // The bug this guards: the DTO kept a hand-written list, so a target type the
  // enum and the service both handled was rejected before reaching either.
  const auth = { Authorization: `Bearer ${await token(request, DEMO.seller)}` };
  const res = await request.post(`${API}/hires`, {
    headers: auth,
    data: { targetType: 'not_a_real_type', targetUserId: 'x' },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  const message = JSON.stringify(body.message);
  for (const known of ['transporter', 'loaderco', 'workerco', 'worker', 'service_provider']) {
    expect(message, `${known} missing from the accepted target types`).toContain(known);
  }
});

test('a hire is refused when the wallet cannot cover the hold', async ({ request }) => {
  // The buyer demo account is not funded by the seed, so this is the real path a
  // new user hits rather than a contrived one.
  const auth = { Authorization: `Bearer ${await token(request, DEMO.buyer)}` };
  const wallet = await (await request.get(`${API}/me/wallet`, { headers: auth })).json();

  const loaders = await (await request.get(`${API}/directory/loaders`)).json();
  const target = (loaders.items ?? loaders)[0];

  const res = await request.post(`${API}/hires`, {
    headers: auth,
    data: {
      targetType: 'loaderco',
      targetUserId: target.id,
      location: 'Mundra',
      budgetCents: (wallet.balanceCents ?? 0) + 10_000_00,
    },
  });
  expect(res.status(), 'a hire beyond the wallet balance must be refused').toBe(400);
  expect(await res.text()).toMatch(/balance|funds/i);
});

test('a provider sees the hire it was sent', async ({ request }) => {
  const buyerAuth = { Authorization: `Bearer ${await token(request, DEMO.seller)}` };
  await fund(request, buyerAuth);

  const providers = await (await request.get(`${API}/services/providers`)).json();
  const packer = providers.find((p: { user: { name: string } }) => p.companyName === 'Harbour Pack Solutions');
  expect(packer, 'the packer demo provider is missing').toBeTruthy();

  const created = await request.post(`${API}/hires`, {
    headers: buyerAuth,
    data: {
      targetType: 'service_provider',
      targetUserId: packer.user.id,
      location: 'Chennai',
      message: 'e2e incoming check',
      budgetCents: 15_000,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { reference } = await created.json();

  const providerAuth = { Authorization: `Bearer ${await token(request, DEMO.packer)}` };
  const incoming = await (await request.get(`${API}/hires/incoming`, { headers: providerAuth })).json();
  const refs = incoming.map((h: { reference: string }) => h.reference);
  expect(refs, 'the provider cannot see the hire it was sent').toContain(reference);
});

test('private contact details stay masked while a hire is pending', async ({ request }) => {
  const auth = { Authorization: `Bearer ${await token(request, DEMO.seller)}` };
  const mine = await (await request.get(`${API}/hires/mine`, { headers: auth })).json();
  const pending = mine.find((h: { status: string }) => h.status === 'pending');
  test.skip(!pending, 'no pending hire to inspect');

  // Anyone can POST a hire from the public directory; if contact leaked on the
  // response, the directory's own privacy rule would be trivially bypassed.
  expect(pending.targetUser?.email ?? null).toBeNull();
  expect(pending.targetUser?.profile?.phone ?? null).toBeNull();
});
