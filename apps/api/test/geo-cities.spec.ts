import { describe, expect, it } from 'vitest';
import { CityRefService } from '../src/geo/geo.module';

/**
 * The city reference lists behind every country/city picker. The pickers stopped
 * accepting free text, so a place that cannot be found here cannot be entered at
 * all — these assert the two lookup shapes they rely on.
 */
describe('CityRefService', () => {
  const svc = new CityRefService();

  it('finds a city within its country, prefix matches first', async () => {
    const hits = await svc.cities('India', 'bangalore');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].toLowerCase().startsWith('bangalore')).toBe(true);
    // Scoped hits are bare names — the country is already known from the form.
    expect(hits[0]).not.toContain(',');
  });

  it('searches every country when none is given, labelling each hit', async () => {
    const hits = await svc.cities('', 'mumbai');
    expect(hits).toContain('Mumbai, India');
  });

  // The dataset carries only the current spelling, so without the alias map
  // "bangalore" returns the two districts and never the city itself.
  it('matches a former name onto the current one', async () => {
    expect(await svc.cities('India', 'bangalore')).toContain('Bengaluru');
    expect(await svc.cities('', 'bombay')).toContain('Mumbai, India');
  });

  it('refuses an unscoped search that is too short to narrow anything', async () => {
    expect(await svc.cities('', 'b')).toEqual([]);
    expect(await svc.cities('', '')).toEqual([]);
  });

  it('returns nothing for a country outside the dataset', async () => {
    expect(await svc.cities('Atlantis', 'x')).toEqual([]);
  });
});
