import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALL_SERVICE_HIRE_FIELDS,
  hireBlockForService,
  hireFieldsForService,
  isFieldVisible,
  sanitizeHireDetails,
  SERVICE_HIRE_BLOCKS,
  SERVICE_HIRE_DETAIL_FIELDS,
} from '@agrotraders/types';

/**
 * The per-service hire questions.
 *
 * Three things can silently break here and none of them throw: a taxonomy group
 * that resolves to no block (the buyer gets a bare form and the provider gets an
 * enquiry they cannot quote), a spec field with no label (the form shows a raw
 * key), and a `details` payload that is not actually whitelisted (free-shaped
 * Json straight into the database). One suite, all three.
 */

interface Node {
  name: string;
  slug: string;
  kind: 'SECTION' | 'GROUP' | 'COUNTRY' | 'SUBGROUP' | 'SERVICE';
  children?: Node[];
}

const DOC = JSON.parse(
  readFileSync(join(__dirname, '..', 'prisma', 'seeds', 'service-taxonomy.json'), 'utf8'),
) as { sections: Node[] };

const EN = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'packages', 'i18n', 'locales', 'en', 'web.json'), 'utf8'),
) as { hireQ: Record<string, unknown> & { opt: Record<string, Record<string, string>> } };

function walk(nodes: Node[]): Node[] {
  return nodes.flatMap((n) => [n, ...walk(n.children ?? [])]);
}
const ALL = walk(DOC.sections);
const GROUPS = ALL.filter((n) => n.kind === 'GROUP');
const LEAVES = ALL.filter((n) => n.kind === 'SERVICE');

describe('service → question block', () => {
  it('resolves every group in the taxonomy, including the ones with no leaves yet', () => {
    const orphans = GROUPS.filter((g) => hireBlockForService(g.slug) === null).map((g) => g.slug);
    expect(orphans).toEqual([]);
  });

  it('resolves every leaf service', () => {
    const orphans = LEAVES.filter((l) => hireBlockForService(l.slug) === null).map((l) => l.slug);
    expect(orphans).toEqual([]);
  });

  it('prefers the specific prefix over the section catch-all', () => {
    // Both sit under `processing`, which would otherwise swallow them.
    expect(hireBlockForService('processing/quality-testing/moisture-testing')).toBe('inspection');
    expect(hireBlockForService('processing/packaging/carton-packing')).toBe('packing');
    expect(hireBlockForService('processing/roasting/dry-roasting')).toBe('processing');
    // Warehousing and packing must not fall through to the logistics catch-all.
    expect(hireBlockForService('logistics-and-handling/warehousing/cold-storage')).toBe('warehousing');
    expect(hireBlockForService('logistics-and-handling/transportation/air-freight')).toBe('transport');
  });

  it('does not match a sibling by bare prefix', () => {
    // `logistics-and-handling/packing` must not claim `…/packing-materials-x`
    // through a separator-less startsWith.
    expect(hireBlockForService('logistics-and-handling/packingx/thing')).toBe('transport');
    expect(hireBlockForService('not-a-section/whatever')).toBeNull();
  });

  it('asks common + branch + tail, and only the tail when nothing is picked', () => {
    const none = hireFieldsForService(null).map((f) => f.key);
    expect(none).toEqual(['cargo', 'qty', 'qtyUnit', 'frequency', 'neededDate', 'message']);

    const roasting = hireFieldsForService('processing/roasting/dry-roasting').map((f) => f.key);
    expect(roasting[0]).toBe('cargo');
    expect(roasting).toContain('outputSpec');
    expect(roasting.at(-1)).toBe('message');
  });
});

describe('field spec integrity', () => {
  it('gives every field a label in the English catalog', () => {
    const missing = ALL_SERVICE_HIRE_FIELDS.filter((f) => typeof EN.hireQ[f.key] !== 'string').map((f) => f.key);
    expect(missing).toEqual([]);
  });

  it('gives every option a label, except units which reuse the unit catalog', () => {
    const missing: string[] = [];
    for (const f of ALL_SERVICE_HIRE_FIELDS) {
      if (!f.options || f.key === 'qtyUnit') continue;
      for (const o of f.options) {
        if (typeof EN.hireQ.opt[f.key]?.[o] !== 'string') missing.push(`${f.key}.${o}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('only names real HireRequest columns as `col`', () => {
    const columns = ['cargo', 'location', 'fromCity', 'toCity', 'neededDate', 'message'];
    const bad = ALL_SERVICE_HIRE_FIELDS.filter((f) => f.col && !columns.includes(f.key)).map((f) => f.key);
    expect(bad).toEqual([]);
  });

  it('points every showIf at a field in the same block', () => {
    for (const [block, fields] of Object.entries(SERVICE_HIRE_BLOCKS)) {
      const keys = new Set(fields.map((f) => f.key));
      for (const f of fields) {
        if (f.showIf) expect(keys.has(f.showIf.key), `${block}.${f.key}`).toBe(true);
      }
    }
  });

  it('hides a conditional field until its trigger is answered', () => {
    const tempC = SERVICE_HIRE_BLOCKS.warehousing.find((f) => f.key === 'tempC')!;
    expect(isFieldVisible(tempC, {})).toBe(false);
    expect(isFieldVisible(tempC, { storageType: 'ambient' })).toBe(false);
    expect(isFieldVisible(tempC, { storageType: 'frozen' })).toBe(true);
  });
});

describe('sanitizeHireDetails', () => {
  it('drops keys the spec does not declare', () => {
    expect(sanitizeHireDetails({ hsCode: '0801', __proto__: 'x', evil: 'y' })).toEqual({ hsCode: '0801' });
  });

  it('never lets a column field through as a detail', () => {
    // These belong on the row, not in the blob — two homes for one answer is how
    // the card and the blob start disagreeing.
    expect(sanitizeHireDetails({ cargo: 'Cashew', message: 'hi', location: 'Mundra' })).toEqual({});
    expect(SERVICE_HIRE_DETAIL_FIELDS.some((f) => f.col)).toBe(false);
  });

  it('narrows to the picked service own questions when a slug is given', () => {
    const roasting = 'processing/roasting/dry-roasting';
    // `outputSpec` is a processing question; `storageType` belongs to warehousing.
    expect(sanitizeHireDetails({ outputSpec: 'Medium roast', storageType: 'frozen' }, roasting))
      .toEqual({ outputSpec: 'Medium roast' });
    // …and the reverse, so the narrowing is not one-directional luck.
    expect(sanitizeHireDetails({ outputSpec: 'Medium roast', storageType: 'frozen' }, 'logistics-and-handling/warehousing/cold-storage'))
      .toEqual({ storageType: 'frozen' });
    // Common questions survive in both.
    expect(sanitizeHireDetails({ frequency: 'weekly' }, roasting)).toEqual({ frequency: 'weekly' });
  });

  it('accepts any declared key when no service is named', () => {
    expect(sanitizeHireDetails({ outputSpec: 'x', storageType: 'frozen' }))
      .toEqual({ outputSpec: 'x', storageType: 'frozen' });
  });

  it('holds a select to its declared options', () => {
    expect(sanitizeHireDetails({ mode: 'sea' })).toEqual({ mode: 'sea' });
    expect(sanitizeHireDetails({ mode: 'teleport' })).toEqual({});
  });

  it('filters and de-dupes a multiselect, and wraps a lone string', () => {
    expect(sanitizeHireDetails({ testParams: ['moisture', 'moisture', 'nonsense'] })).toEqual({ testParams: ['moisture'] });
    expect(sanitizeHireDetails({ testParams: 'colour' })).toEqual({ testParams: ['colour'] });
    expect(sanitizeHireDetails({ testParams: ['nope'] })).toEqual({});
  });

  it('coerces numbers and rejects the un-coercible', () => {
    expect(sanitizeHireDetails({ containers: '3' })).toEqual({ containers: 3 });
    expect(sanitizeHireDetails({ containers: 'three' })).toEqual({});
    expect(sanitizeHireDetails({ containers: -5 })).toEqual({});
  });

  it('caps free text so "any Json" is not "any size"', () => {
    const long = 'x'.repeat(5000);
    const out = sanitizeHireDetails({ hsCode: long, claimsHistory: long });
    expect((out.hsCode as string).length).toBe(200);
    expect((out.claimsHistory as string).length).toBe(1000);
  });

  it('survives a non-object payload', () => {
    expect(sanitizeHireDetails(null)).toEqual({});
    expect(sanitizeHireDetails('nope')).toEqual({});
    expect(sanitizeHireDetails([1, 2, 3])).toEqual({});
  });
});
