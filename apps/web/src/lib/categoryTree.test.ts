import { describe, expect, it } from 'vitest';
import type { ApiSubcategory } from '@agrotraders/api-client';
import { buildSubcategoryTree, findSubcategoryPath, resolveAttrFields } from '@agrotraders/api-client';
import type { AttrField } from '@agrotraders/types';

const sub = (id: string, name: string, parentId: string | null = null, attrFields?: AttrField[]): ApiSubcategory =>
  ({ id, name, slug: id, parentId, categoryId: 'cat', sort: 0, emoji: null, options: [], attrFields, _count: { products: 0 } }) as ApiSubcategory;

describe('category tree helpers', () => {
  it('finds the full drill path for a nested subcategory', () => {
    const tree = buildSubcategoryTree([
      sub('grain', 'Grain'),
      sub('rice', 'Rice', 'grain'),
      sub('basmati', 'Basmati', 'rice'),
      sub('fruit', 'Fruit'),
    ]);

    expect(findSubcategoryPath(tree, 'basmati').map((node) => node.name)).toEqual(['Grain', 'Rice', 'Basmati']);
  });
});

/* The real shape: Nuts › Almond owns the fields, and levels 3-5 restate them. */
const ALMOND_FIELDS: AttrField[] = [
  { key: 'form', label: 'Form', type: 'select', options: ['In-shell', 'Natural kernel', 'Sliced', 'Blanched', 'Flour / meal'] },
  { key: 'variety', label: 'Variety type', type: 'select', options: ['Nonpareil', 'Carmel', 'Monterey', 'Mamra'] },
  { key: 'count_per_oz', label: 'Kernel size (count per oz)', type: 'select', options: ['18/20', '23/25', '30/32', '32/34'] },
  { key: 'shell_size_mm', label: 'In-shell size (mm)', type: 'select', options: ['30/32 mm', '32/34 mm'] },
  { key: 'processing', label: 'Processing', type: 'select', options: ['Raw', 'Roasted', 'Salted'] },
  { key: 'moisture_pct', label: 'Moisture', type: 'number', unit: '%' },
];

const almondTree = buildSubcategoryTree([
  sub('almond', 'Almond', null, ALMOND_FIELDS),
  sub('inshell', 'In-shell almond', 'almond'),
  sub('nonpareil', 'Nonpareil in-shell', 'inshell'),
  sub('size3234', 'Size 32/34 mm', 'nonpareil'),
  sub('natural', 'Natural almond kernels', 'almond'),
  sub('kcount', 'Count 32/34 per oz', 'natural'),
  sub('roasted', 'Roasted almond', 'almond'),
]);

const keysAt = (id: string) => resolveAttrFields(findSubcategoryPath(almondTree, id)).map((f) => f.key);

describe('resolveAttrFields', () => {
  it('keeps the whole set at the node that owns it', () => {
    expect(keysAt('almond')).toEqual(['form', 'variety', 'count_per_oz', 'shell_size_mm', 'processing', 'moisture_pct']);
  });

  it('drops each field as the path answers it, level by level', () => {
    // "In-shell almond" states form=In-shell.
    expect(keysAt('inshell')).toEqual(['variety', 'count_per_oz', 'shell_size_mm', 'processing', 'moisture_pct']);
    // …then "Nonpareil in-shell" states variety=Nonpareil.
    expect(keysAt('nonpareil')).toEqual(['count_per_oz', 'shell_size_mm', 'processing', 'moisture_pct']);
    // …then "Size 32/34 mm" states the caliber. Processing is still unanswered.
    expect(keysAt('size3234')).toEqual(['processing', 'moisture_pct']);
  });

  it('tells shell millimetres apart from kernel count-per-oz', () => {
    // The taxonomy sizes in-shell lots in mm and kernels in count/oz, and "32/34"
    // means both. The unit in the option value is what keeps them apart: a kernel
    // node answers count_per_oz only…
    expect(keysAt('kcount')).toContain('shell_size_mm');
    expect(keysAt('kcount')).not.toContain('count_per_oz');
    // …while the mm node answers both, since "32/34 mm" contains "32/34".
    expect(keysAt('size3234')).not.toContain('shell_size_mm');
  });

  it('matches across plurals and filler words, not just exact labels', () => {
    // "Natural almond kernels" answers form="Natural kernel" despite the plural
    // and the interposed "almond".
    expect(keysAt('natural')).not.toContain('form');
    expect(keysAt('roasted')).not.toContain('processing');
    // …and does not over-match: Roasted almond says nothing about variety.
    expect(keysAt('roasted')).toContain('variety');
  });
});
