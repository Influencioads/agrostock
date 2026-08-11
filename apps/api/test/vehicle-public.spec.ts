import { describe, expect, it } from 'vitest';
import { maskPlate, toPublicVehicle, PUBLIC_VEHICLE_SELECT } from '../src/transport/vehicle-public';

/**
 * Vehicles are readable without login, so this projection is the only thing
 * standing between the Vehicle table and the open internet. These tests exist to
 * fail loudly if a refactor lets the raw plate through.
 */
describe('maskPlate', () => {
  it('keeps the first and last groups of a grouped plate', () => {
    expect(maskPlate('DXB-01-AB-1234')).toBe('DXB-••-••-1234');
    expect(maskPlate('KA 01 MM 2222')).toBe('KA •• •• 2222');
  });

  it('preserves the separators the transporter typed', () => {
    // A buyer reads the plate back over the phone; the shape has to survive.
    expect(maskPlate('GJ-01-IJ-7788')).toContain('-');
  });

  it('masks the middle of an ungrouped plate', () => {
    expect(maskPlate('MH12AB1234')).toBe('MH•••••234');
  });

  it('fully masks a plate too short to partially reveal', () => {
    expect(maskPlate('AB12')).toBe('••••');
  });

  it('returns null for an absent plate rather than an empty mask', () => {
    expect(maskPlate(null)).toBeNull();
    expect(maskPlate('   ')).toBeNull();
  });
});

describe('toPublicVehicle', () => {
  const row = {
    id: 'v1',
    plate: 'DXB-01-AB-1234',
    refrigerated: true,
    tempMinC: -18,
    tempMaxC: 4,
    photos: [] as string[],
    photoUrl: null as string | null,
  };

  it('never returns the raw plate', () => {
    const out = toPublicVehicle({ ...row });
    expect(out).not.toHaveProperty('plate');
    expect(out.plateMasked).toBe('DXB-••-••-1234');
    expect(JSON.stringify(out)).not.toContain('AB-1234');
  });

  it('derives the temperature range only for refrigerated vehicles', () => {
    expect(toPublicVehicle({ ...row }).tempRange).toBe('-18°C to +4°C');
    // A non-reefer with stale min/max must not advertise a range.
    expect(toPublicVehicle({ ...row, refrigerated: false }).tempRange).toBeNull();
  });

  it('normalises a legacy single photo into the gallery', () => {
    const out = toPublicVehicle({ ...row, photoUrl: '/uploads/vehicles/a.webp' });
    expect(out.photos).toEqual(['/uploads/vehicles/a.webp']);
    expect(out.photoUrl).toBe('/uploads/vehicles/a.webp');
  });

  it('elects the first gallery entry as the cover', () => {
    const out = toPublicVehicle({ ...row, photos: ['/b.webp', '/c.webp'], photoUrl: '/stale.webp' });
    expect(out.photoUrl).toBe('/b.webp');
  });

  it('returns an empty gallery rather than a null hole', () => {
    expect(toPublicVehicle({ ...row }).photos).toEqual([]);
  });

  it('is an allow-list — no select key exposes owner-private columns', () => {
    // `plate` is selected (it has to be, to mask it) but must never be a KEY of
    // the output. Nothing else owner-private may appear in the select at all.
    const selected = Object.keys(PUBLIC_VEHICLE_SELECT);
    expect(selected).not.toContain('trips');
    expect(selected).not.toContain('owner');
  });
});
