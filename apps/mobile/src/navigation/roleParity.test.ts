import { describe, expect, it } from 'vitest';
import { SERVICE_ROLES } from '@agrotraders/types';
import { ROLE_MENU } from './menu';
import { SECTION_REGISTRY_KEYS } from '../screens/sectionRegistryKeys';

describe('role menu parity', () => {
  it('does not expose menu items that fall through to placeholders', () => {
    const registered = new Set<string>(SECTION_REGISTRY_KEYS);
    const missing = Object.entries(ROLE_MENU).flatMap(([role, items]) =>
      items
        .map((item) => `${role}:${item.id}`)
        .filter((key) => !registered.has(key)),
    );

    expect(missing).toEqual([]);
  });

  it('exposes invoice centers for seller, loader company, and worker roles', () => {
    expect(ROLE_MENU.seller.map((i) => i.id)).toContain('invoices');
    expect(ROLE_MENU.loaderco.map((i) => i.id)).toContain('invoices');
    expect(ROLE_MENU.worker.map((i) => i.id)).toContain('invoices');
  });

  /**
   * The reverse of the check above, and the gap a menu-only test cannot see: a
   * section can be registered and still be unreachable. `labour` shipped that
   * way — the screen existed, nothing navigated to it.
   */
  it('lets every account that publishes rates reach the labour screen', () => {
    for (const role of ['loaderco', 'workerco', 'worker']) {
      expect(ROLE_MENU[role]?.map((i) => i.id) ?? []).toContain('labour');
    }
  });

  /**
   * Every role with its own tab stack needs a menu, or its More/Account hub
   * renders empty — which is what `workerco` did, since MoreHub falls back to
   * `[]` for an unknown role.
   */
  it('gives every routed role a non-empty menu', () => {
    const routed = ['buyer', 'seller', 'transporter', 'loaderco', 'workerco', 'worker', ...SERVICE_ROLES];
    for (const role of routed) expect(ROLE_MENU[role] ?? []).not.toHaveLength(0);
  });
});
