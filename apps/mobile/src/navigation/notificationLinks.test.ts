import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROLE_ALIAS, SECTION_REGISTRY_KEYS } from '../screens/sectionRegistryKeys';

const API_SRC = join(dirname(fileURLToPath(import.meta.url)), '../../../../apps/api/src');

/**
 * Every `linkUrl` the API attaches to a notification, read from the API itself.
 *
 * Hardcoding the list would let it drift the moment someone adds a notification —
 * which is how mobile ended up resolving 3 of 13 shapes while the other 10 dropped
 * the user on the notification index instead of the screen the message was about.
 */
function emittedLinkUrls(): string[] {
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name));
      else if (e.name.endsWith('.ts')) {
        const src = readFileSync(join(dir, e.name), 'utf8');
        for (const m of src.matchAll(/linkUrl: *[`'"]([^`'"]+)[`'"]/g)) {
          out.add(m[1].replace(/\$\{[^}]+\}/g, ':id'));
        }
      }
    }
  };
  walk(API_SRC);
  return [...out];
}

/** Mirrors the `/console/...` branch of navigateToLink. */
const CONSOLE_SCREEN_ALIASES = new Set(['settings/verification']);
/** Console paths whose mobile home is a tab rather than a registry section. */
const CONSOLE_TAB_ALIASES = new Set(['orders', 'products']);
/**
 * Console paths with no mobile destination at all, so a tap falls back to the
 * notification list. `/console/loaders` is the job-creator's view of a claimed
 * loading job; mobile has no such screen for a seller. Listed rather than ignored
 * so building one removes an entry here instead of going unnoticed.
 */
const NO_MOBILE_HOME = new Set(['loaders']);
const registered = new Set(SECTION_REGISTRY_KEYS);
const hasSection = (role: string, section: string) =>
  registered.has(`${role}:${section}`) || registered.has(`${ROLE_ALIAS[role] ?? role}:${section}`);

/** Roles whose tab stack can receive a console link. */
const ROLES = ['buyer', 'seller', 'transporter', 'loaderco', 'workerco', 'worker', 'accountant'];

describe('notification link routing', () => {
  const links = emittedLinkUrls();

  it('finds the link targets the API actually emits', () => {
    // Guards the scraper itself: an empty list would make every test below vacuous.
    expect(links.length).toBeGreaterThan(8);
    expect(links).toContain('/console/billing');
  });

  it('resolves every /console link for at least one role', () => {
    const unroutable = links
      .filter((l) => l.startsWith('/console'))
      .filter((l) => {
        const path = l.replace(/^\/console\/?/, '') || 'dashboard';
        if (CONSOLE_SCREEN_ALIASES.has(path)) return false;
        if (CONSOLE_TAB_ALIASES.has(path)) return false;
        if (NO_MOBILE_HOME.has(path)) return false;
        return !ROLES.some((r) => hasSection(r, path));
      });
    expect(unroutable).toEqual([]);
  });

  it('keeps the unroutable list honest', () => {
    // If a screen gets built for one of these, its entry must go — otherwise the
    // exemption silently keeps swallowing a link that now has somewhere to land.
    for (const path of NO_MOBILE_HOME) {
      expect(ROLES.some((r) => hasSection(r, path)), `${path} now has a section`).toBe(false);
    }
  });

  it('routes the money links every earning role is sent', () => {
    for (const role of ['seller', 'transporter', 'loaderco', 'worker']) {
      expect(hasSection(role, 'wallet'), `${role} wallet`).toBe(true);
      expect(hasSection(role, 'invoices'), `${role} invoices`).toBe(true);
      expect(hasSection(role, 'billing'), `${role} billing`).toBe(true);
    }
  });
});
