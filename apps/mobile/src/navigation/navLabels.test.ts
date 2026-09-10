import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '@agrotraders/i18n';
import { ROLE_MENU } from './menu';

/**
 * Every navigation label the app renders has to exist in the catalog.
 *
 * i18next returns the KEY when a lookup misses, so a missing entry does not
 * throw or warn — it silently paints the key on screen. `nav:stack.SafeDeal`
 * shipped that way: the Safe Deal header read "stack.SafeDeal" in every locale,
 * and nothing caught it because `tsc` cannot see into a JSON catalog and the
 * screen renders fine.
 *
 * These read the real source and the real locale files, so they fail the moment
 * a screen or menu item is added without its label.
 */
const NAV = (locale: string) =>
  JSON.parse(readFileSync(join(__dirname, `../../../../packages/i18n/locales/${locale}/nav.json`), 'utf8')) as {
    stack: Record<string, string>;
    section: Record<string, string>;
  };

/** Names passed to RootNavigator's `title()` helper, read straight from the source. */
function stackTitleNames(): string[] {
  const src = readFileSync(join(__dirname, 'RootNavigator.tsx'), 'utf8');
  return [...new Set([...src.matchAll(/title\('([A-Za-z]+)'\)/g)].map((m) => m[1]))];
}

describe('navigation labels', () => {
  it('finds at least one title() call (the regex still matches the source)', () => {
    // Guards the guard: a refactor of `title()` would otherwise make the checks
    // below pass vacuously against an empty list.
    expect(stackTitleNames().length).toBeGreaterThan(10);
  });

  for (const locale of LOCALES) {
    it(`has a nav:stack entry for every stack screen (${locale})`, () => {
      const { stack } = NAV(locale);
      expect(stackTitleNames().filter((name) => !stack[name])).toEqual([]);
    });

    it(`has a nav:section entry for every menu item (${locale})`, () => {
      const { section } = NAV(locale);
      const ids = [...new Set(Object.values(ROLE_MENU).flatMap((items) => items.map((i) => i.id)))];
      expect(ids.filter((id) => !section[id])).toEqual([]);
    });
  }
});
