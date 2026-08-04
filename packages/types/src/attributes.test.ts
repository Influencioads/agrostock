import { describe, expect, it } from 'vitest';
import { fieldsNotOnPath, nameStatesValue, type AttrField } from './attributes';

/**
 * The seller's option values and the buyer's taxonomy node names are two
 * hand-authored datasets describing the same goods. Every case here is a real
 * pair that failed to see itself across them.
 */
describe('nameStatesValue', () => {
  it('reads a slash between words as alternative spellings', () => {
    expect(nameStatesValue('Purple artichoke', 'Purple/Violet')).toBe(true);
    expect(nameStatesValue('Williams (Bartlett)', 'Williams / Bartlett')).toBe(true);
    // …but a slash between digits is one size code, not two readings.
    expect(nameStatesValue('Count 18/20 per oz', '18/20')).toBe(true);
    expect(nameStatesValue('Count 18/20 per oz', '20/22')).toBe(false);
  });

  it('ignores accents, plurals and US/UK spelling', () => {
    expect(nameStatesValue('Rosehip purée', 'Puree')).toBe(true);
    expect(nameStatesValue('Oblačinska', 'Oblacinska')).toBe(true);
    expect(nameStatesValue('Pasteurised milk', 'Pasteurized')).toBe(true);
    expect(nameStatesValue('Optical colour sorters', 'Color sorter')).toBe(true);
    expect(nameStatesValue('Hatcheries', 'Hatchery')).toBe(true);
    expect(nameStatesValue('Briquette presses', 'Briquette press')).toBe(true);
    expect(nameStatesValue('Farmhouses', 'Farmhouse')).toBe(true);
  });

  it('measures a value as a whole before calling it too weak to match', () => {
    // Every token is two characters, but the value is not ambiguous.
    expect(nameStatesValue('Beetroot 60-90 mm', '60-90 mm')).toBe(true);
    expect(nameStatesValue('US Fancy almond', 'US')).toBe(false);
  });

  it('strips a parenthetical before splitting, so its slash is not a reading', () => {
    expect(nameStatesValue('Cattle horns', 'Cattle (cow/ox)')).toBe(true);
  });

  it('still refuses a value the name does not state', () => {
    expect(nameStatesValue('Roasted almond', 'Nonpareil')).toBe(false);
    expect(nameStatesValue('Natural almond kernels', 'In-shell')).toBe(false);
  });
});

describe('fieldsNotOnPath', () => {
  const fields: AttrField[] = [
    { key: 'form', label: 'Form', type: 'select', options: ['In-shell', 'Natural kernel'] },
    { key: 'color', label: 'Colour', type: 'select', options: ['Green', 'Purple/Violet'] },
  ];

  it('drops only the field the path has answered', () => {
    expect(fieldsNotOnPath(fields, ['Artichoke', 'Purple artichoke']).map((f) => f.key)).toEqual(['form']);
  });

  it('returns the same array when nothing drops', () => {
    expect(fieldsNotOnPath(fields, ['Artichoke'])).toBe(fields);
  });
});
