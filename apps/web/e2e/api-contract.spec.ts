import { expect, test, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { API, DEMO, token } from './helpers';

/**
 * Contract: every endpoint the shared API client calls must actually exist.
 *
 * web, admin AND mobile all talk to the API through `@agrotraders/api-client`,
 * so the set of paths in that one file is the union of what all three apps can
 * request. This is the only place a React Native screen's API surface is
 * reachable from Playwright — driving the mobile app itself needs an emulator,
 * but the endpoints it depends on are right here.
 *
 * The bug this catches: an endpoint gets renamed or dropped in the API and one
 * of the three clients keeps calling the old path. On web you notice; on mobile
 * it ships as an empty screen nobody opened.
 *
 * Paths are read out of the client source at runtime rather than copied into a
 * list here — a hand-maintained copy silently stops covering new endpoints,
 * which is the failure mode this test exists to prevent.
 */

const CLIENT_SRC = fileURLToPath(
  new URL('../../../packages/api-client/src/index.ts', import.meta.url),
);

/** Every `verb('/path')` literal in the client. Template paths (`${id}`) are excluded. */
function declaredGetPaths(): string[] {
  const src = readFileSync(CLIENT_SRC, 'utf8');
  const re = /(?:^|[^a-zA-Z.])(?:http\.)?(get|post|put|patch|del|delete)\s*(?:<[^()]*?>)?\s*\(\s*([`'"])([^`'"]*?)\2/g;
  const paths = new Set<string>();
  for (const m of src.matchAll(re)) {
    const verb = m[1] === 'del' ? 'delete' : m[1];
    const path = m[3];
    // GET only: a POST/PATCH probe would mutate seeded data, and a DELETE probe
    // would destroy it. Reachability is what is being asserted.
    if (verb !== 'get' || !path.startsWith('/')) continue;
    // Paths with an interpolated id need a real id, which is a different test.
    if (path.includes('${')) continue;
    paths.add(path);
  }
  return [...paths].sort();
}

/** Roles to try an endpoint as, widest privilege first. */
const ROLES = [
  DEMO.admin,
  DEMO.buyer,
  DEMO.seller,
  DEMO.transporter,
  DEMO.loaderco,
  DEMO.worker,
  DEMO.packer,
] as const;

/**
 * Endpoints that require a query parameter to mean anything. Probing them bare
 * answers 400, which is a correct refusal rather than a missing endpoint — the
 * required params are supplied so the probe tests reachability, not validation.
 */
const REQUIRED_PARAMS: Record<string, Record<string, string>> = {
  '/geo/cities': { country: 'IN' },
  '/geo/geocode': { q: 'Mundra' },
  '/geo/route': { from: 'Mundra', to: 'Kandla' },
  '/reviews/eligibility': { kind: 'order' },
  '/community/search': { q: 'wheat' },
};

test('every GET the shared client declares is reachable on the API', async ({ request }) => {
  const paths = declaredGetPaths();
  // A silent drop to zero (a refactor moved the client) would make this test
  // pass while asserting nothing.
  expect(paths.length, 'no endpoints parsed out of the api-client source').toBeGreaterThan(100);

  const tokens = new Map<string, string>();
  for (const email of ROLES) tokens.set(email, await token(request, email));

  const missing: string[] = [];
  const broken: string[] = [];

  for (const path of paths) {
    const params = REQUIRED_PARAMS[path];
    let bestStatus = 0;
    let sawServerError = '';

    // An endpoint may legitimately refuse a role (401/403) — that is not a
    // missing endpoint. It is only dead if NO role can reach it.
    for (const email of ROLES) {
      const res = await request.get(`${API}${path}`, {
        headers: { Authorization: `Bearer ${tokens.get(email)}` },
        params,
        failOnStatusCode: false,
      });
      const status = res.status();
      if (status >= 500) sawServerError = `${status} as ${email.split('@')[0]}`;
      if (status < 400) {
        bestStatus = status;
        break;
      }
      // Prefer remembering a refusal over a 404 — a refusal proves it exists.
      if (status !== 404) bestStatus = status;
      else if (bestStatus === 0) bestStatus = 404;
    }

    if (sawServerError) broken.push(`${path} -> ${sawServerError}`);
    else if (bestStatus === 404) missing.push(path);
  }

  expect(broken, 'endpoints the client calls that throw a 5xx').toEqual([]);
  expect(missing, 'endpoints the client calls that do not exist (404 for every role)').toEqual([]);
});

/**
 * A list endpoint that answers 200 with something other than a list is the other
 * half of the contract — the clients map over these, and a shape change renders
 * a blank screen rather than an error.
 */
const LIST_ENDPOINTS: { path: string; as: string }[] = [
  { path: '/products', as: DEMO.buyer },
  { path: '/categories', as: DEMO.buyer },
  { path: '/auctions', as: DEMO.buyer },
  { path: '/directory/sellers', as: DEMO.buyer },
  { path: '/directory/transporters', as: DEMO.buyer },
  { path: '/directory/loaders', as: DEMO.buyer },
  { path: '/directory/workers', as: DEMO.buyer },
  { path: '/services/providers', as: DEMO.buyer },
  { path: '/orders/mine', as: DEMO.buyer },
  { path: '/orders/incoming', as: DEMO.seller },
  { path: '/invoices/mine', as: DEMO.buyer },
  { path: '/notifications', as: DEMO.buyer },
  { path: '/admin/users', as: DEMO.admin },
  { path: '/admin/orders', as: DEMO.admin },
  { path: '/admin/products', as: DEMO.admin },
];

for (const { path, as } of LIST_ENDPOINTS) {
  test(`list endpoint returns a list: ${path}`, async ({ request }) => {
    const res = await request.get(`${API}${path}`, {
      headers: { Authorization: `Bearer ${await token(request, as)}` },
      failOnStatusCode: false,
    });
    expect(res.status(), `${path} did not answer 200`).toBe(200);

    const body = await res.json();
    // Both shapes are used across the API; either is fine, a bare object is not.
    const items = Array.isArray(body) ? body : body.items;
    expect(Array.isArray(items), `${path} returned ${JSON.stringify(body).slice(0, 120)}`).toBe(true);
  });
}

/**
 * The mobile app registers a section for every role/section pair its menu
 * offers. A menu entry with no registered screen is a dead tap — the exact
 * class of mobile bug an emulator-free run can still catch, because both
 * modules are plain TypeScript with no React Native imports.
 */
test('mobile: every menu entry has a registered screen', async () => {
  const menu = fileURLToPath(new URL('../../mobile/src/navigation/menu.ts', import.meta.url));
  const keys = fileURLToPath(new URL('../../mobile/src/screens/sectionRegistryKeys.ts', import.meta.url));
  const menuSrc = readFileSync(menu, 'utf8');
  const keysSrc = readFileSync(keys, 'utf8');

  // ROLE_MENU is `role: [{ id, icon }]`; capture each role block and its ids.
  const registered = new Set([...keysSrc.matchAll(/'([a-z]+:[a-zA-Z]+)'/g)].map((m) => m[1]));
  expect(registered.size, 'no registry keys parsed').toBeGreaterThan(20);

  const dead: string[] = [];
  for (const block of menuSrc.matchAll(/^\s{2}([a-z]+):\s*\[([\s\S]*?)^\s{2}\]/gm)) {
    const role = block[1];
    for (const item of block[2].matchAll(/id:\s*'([a-zA-Z]+)'/g)) {
      const key = `${role}:${item[1]}`;
      // Aliased roles fall through to their target's keys (workerco -> loaderco,
      // the service roles -> service), so a miss there is not a dead entry.
      if (!registered.has(key) && !registered.has(`${role}:${item[1]}`)) dead.push(key);
    }
  }

  expect(dead, 'mobile menu entries with no registered screen').toEqual([]);
});
