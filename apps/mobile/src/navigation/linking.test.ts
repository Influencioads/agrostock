import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SCREEN_PATHS } from './linkingPaths';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * A screen can be registered, routable and completely unreachable by link.
 *
 * `Services` shipped that way: `types.ts` even called it "the mobile twin of web's
 * `/services`", the screen existed and the tabs could reach it, but `linking.ts`
 * had no path for it — so a shared URL, an email link or a push route could never
 * land there. `Hires` was the same. A menu-shaped test cannot see this, because
 * nothing about the menu is wrong.
 */
const screens: Record<string, string> = SCREEN_PATHS;

/** RootStackParamList keys, read from source — the types themselves are erased at runtime. */
function paramListKeys(): string[] {
  const src = readFileSync(join(HERE, 'types.ts'), 'utf8');
  const body = src.slice(
    src.indexOf('RootStackParamList = {') + 'RootStackParamList = {'.length,
    src.indexOf('\n};'),
  );
  return [...body.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
}

describe('deep links', () => {
  it('gives every root screen a path', () => {
    const missing = paramListKeys().filter((name) => !(name in screens));
    expect(missing).toEqual([]);
  });

  it('maps no path to a screen the root stack does not have', () => {
    const known = new Set(paramListKeys());
    expect(Object.keys(screens).filter((name) => !known.has(name))).toEqual([]);
  });

  it('never points two screens at the same path', () => {
    const paths = Object.values(screens);
    expect(paths.length).toBe(new Set(paths).size);
  });

  /**
   * The app claims `https://agrotraders.org` as a link prefix, so any web URL it
   * DOES map must mean the same thing on both platforms. These are the paths the
   * web router (apps/web/src/App.tsx) serves; a mismatch here would open the app on
   * the wrong screen for a link that works in a browser.
   */
  it('agrees with the web router on the paths it shares', () => {
    const shared: Record<string, string> = {
      ProductDetail: 'product/:slug',
      Offices: 'offices',
      SafeDeal: 'safe-deal',
      AuctionsBoard: 'auctions',
      BuyerBidsBoard: 'bids',
      BuyerBidRoom: 'bid/:id',
      Requirements: 'requirements',
      PublicProfile: 'u/:userId',
      Checkout: 'checkout',
      Services: 'services',
    };
    for (const [screen, path] of Object.entries(shared)) {
      expect(screens[screen], `${screen} lost its deep link`).toBe(path);
    }
  });
});
