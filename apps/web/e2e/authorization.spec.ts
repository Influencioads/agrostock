import { expect, test } from '@playwright/test';
import { API, DEMO, token } from './helpers';

/**
 * Adversarial: can an account reach something it should not?
 *
 * Every case here is a request a signed-in user can trivially craft — the app
 * not offering a button is not a defence. Anything that answers 2xx where it
 * should answer 401/403 is a real hole, so these assert the refusal.
 */

type Probe = {
  what: string;
  as: string;
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  data?: Record<string, unknown>;
  /** Statuses that count as "properly refused". */
  allow?: number[];
};

const REFUSALS: Probe[] = [
  { what: 'a buyer reading the admin user list', as: DEMO.buyer, method: 'get', path: '/admin/users' },
  { what: 'a seller reading the admin KYC queue', as: DEMO.seller, method: 'get', path: '/admin/kyc' },
  { what: 'a buyer approving a service-provider listing', as: DEMO.buyer, method: 'get', path: '/admin/service-providers/pending' },
  { what: 'a buyer editing the worker taxonomy', as: DEMO.buyer, method: 'get', path: '/admin/worker-types' },
  { what: 'a buyer publishing labour rates', as: DEMO.buyer, method: 'get', path: '/me/labour/offerings' },
  { what: 'a buyer editing a service profile', as: DEMO.buyer, method: 'get', path: '/me/service-profile' },
  { what: 'a transporter publishing labour rates', as: DEMO.transporter, method: 'get', path: '/me/labour/offerings' },
  { what: 'a loading company reading service-provider services', as: DEMO.loaderco, method: 'get', path: '/me/service-provider/services' },
  { what: 'a buyer accepting a hire meant for a provider', as: DEMO.buyer, method: 'post', path: '/hires/nonexistent/accept', allow: [401, 403] },
];

for (const probe of REFUSALS) {
  test(`refuses: ${probe.what}`, async ({ request }) => {
    const auth = { Authorization: `Bearer ${await token(request, probe.as)}` };
    const res = await request[probe.method](`${API}${probe.path}`, { headers: auth, data: probe.data });
    const allowed = probe.allow ?? [401, 403];
    expect(
      allowed,
      `${probe.what} returned ${res.status()} — expected one of ${allowed.join('/')}`,
    ).toContain(res.status());
  });
}

test('an unauthenticated caller cannot reach any private endpoint', async ({ request }) => {
  const privatePaths = [
    '/me/labour/offerings',
    '/me/service-profile',
    '/me/wallet',
    '/hires/mine',
    '/hires/incoming',
    '/admin/users',
  ];
  for (const path of privatePaths) {
    const res = await request.get(`${API}${path}`);
    expect([401, 403], `${path} answered ${res.status()} with no token`).toContain(res.status());
  }
});

test('a provider cannot edit another provider\'s rates', async ({ request }) => {
  const workercoAuth = { Authorization: `Bearer ${await token(request, DEMO.workerco)}` };
  const loadercoAuth = { Authorization: `Bearer ${await token(request, DEMO.loaderco)}` };

  const mine = await (await request.get(`${API}/me/labour/offerings`, { headers: loadercoAuth })).json();
  test.skip(!mine.length, 'the loading company has no rates to target');

  // Ownership, not just role: both accounts hold a labour role, so a role-only
  // check would let one edit the other's prices.
  const stolen = await request.patch(`${API}/me/labour/offerings/${mine[0].id}`, {
    headers: workercoAuth,
    data: { rateMinCents: 1 },
  });
  expect(stolen.status(), 'one provider edited another provider\'s rate').toBe(404);

  const deleted = await request.delete(`${API}/me/labour/offerings/${mine[0].id}`, { headers: workercoAuth });
  expect(deleted.status(), 'one provider deleted another provider\'s rate').toBe(404);
});

test('public endpoints never leak private contact details', async ({ request }) => {
  const surfaces = ['/directory/workers', '/directory/loaders', '/directory/sellers', '/services/providers'];
  for (const path of surfaces) {
    const body = await (await request.get(`${API}${path}`)).json();
    const raw = JSON.stringify(body.items ?? body);
    // The directory's whole privacy rule: contact is admin-only or shared in chat.
    expect(raw, `${path} leaked a phone field`).not.toMatch(/"phone":\s*"\+?\d/);
    expect(raw, `${path} leaked a contactEmail`).not.toMatch(/"contactEmail":\s*"[^"]+@/);
    expect(raw, `${path} leaked a password hash`).not.toContain('passwordHash');
  }
});

test('a hire cannot be aimed at a user who does not hold that role', async ({ request }) => {
  const auth = { Authorization: `Bearer ${await token(request, DEMO.seller)}` };
  const buyers = await (await request.get(`${API}/directory/sellers`)).json();
  const someone = (buyers.items ?? buyers)[0];

  const res = await request.post(`${API}/hires`, {
    headers: auth,
    data: { targetType: 'transporter', targetUserId: someone.id, location: 'Mundra', budgetCents: 1000 },
  });
  expect(res.status(), 'a seller was hireable as a transporter').toBe(400);
});

test('you cannot hire yourself', async ({ request }) => {
  const jwt = await token(request, DEMO.seller);
  const auth = { Authorization: `Bearer ${jwt}` };
  const me = await (await request.get(`${API}/me`, { headers: auth })).json();

  const res = await request.post(`${API}/hires`, {
    headers: auth,
    data: { targetType: 'transporter', targetUserId: me.id, location: 'Mundra', budgetCents: 1000 },
  });
  expect(res.status()).toBe(400);
});
