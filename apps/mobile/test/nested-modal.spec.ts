import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * On iOS a React Native <Modal> presents its view controller from the nearest
 * UIViewController ABOVE it in the view hierarchy. Two modals that are siblings
 * in the React tree therefore resolve to the same presenting controller — and
 * once the first is up, UIKit silently refuses to present the second. The sheet
 * never appears and every tap on the row that opens it looks dead.
 *
 * The cure is nesting: a modal rendered INSIDE another modal's children
 * presents from that modal's own controller. Android creates each Dialog
 * against the Activity regardless, so it never showed the bug and never
 * notices the fix — which is exactly why this needs a test rather than a
 * second pair of eyes.
 */
describe('modals that can be open at the same time are nested, not siblings', () => {
  it('opens the category picker from inside the filter sheet', () => {
    const src = read('src/screens/components/FilterSheet.tsx');
    expect(src.indexOf('<CategorySheet')).toBeGreaterThan(-1);
    expect(src.indexOf('<CategorySheet')).toBeLessThan(src.indexOf('</Sheet>'));
  });

  it('opens the category picker from inside the post-a-bid sheet', () => {
    const src = read('src/screens/buyer/Bids.tsx');
    expect(src.indexOf('<CategorySheet')).toBeGreaterThan(-1);
    expect(src.indexOf('<CategorySheet')).toBeLessThan(src.indexOf('</Modal>'));
  });
});
