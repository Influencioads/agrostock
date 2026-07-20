import { describe, expect, it } from 'vitest';
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
});
