import { tempRangeText } from '@agrotraders/types';

/**
 * The public shape of a Vehicle — one place, so no endpoint can leak a field by
 * forgetting to strip it.
 *
 * Vehicles are browsable without login, which means everything here is world
 * readable and scrapeable. The projection is therefore an ALLOW-LIST: a new
 * column added to the model is invisible publicly until someone adds it below
 * deliberately. The reverse (deny-list) is what leaks fields during a refactor.
 */

/** Columns the public projection needs. Anything not listed is never selected. */
export const PUBLIC_VEHICLE_SELECT = {
  id: true,
  type: true,
  vehicleType: true,
  plate: true,
  capacityMt: true,
  capacityTons: true,
  bodyLengthFt: true,
  status: true,
  availableFrom: true,
  photoUrl: true,
  photos: true,
  refrigerated: true,
  tempMinC: true,
  tempMaxC: true,
  gpsTracking: true,
  driverCount: true,
  city: true,
  country: true,
  servicingCities: true,
  ratePerKmCents: true,
  ratePerTripCents: true,
  rateCurrency: true,
  loadingIncluded: true,
  insuranceExpiry: true,
  permitExpiry: true,
  makeModel: true,
  year: true,
  notes: true,
  createdAt: true,
  ownerId: true,
} as const;

/**
 * Mask a registration number for public display: keep enough for a buyer to tell
 * two trucks apart, not enough to impersonate one.
 *
 * A plate identifies a physical asset. Published in full it enables a common
 * freight fraud — quoting a real, verifiable vehicle you do not own — so the
 * public listing shows `DXB-01-••-1234` and the full value stays with the owner
 * and admins. The first and last groups survive because that is what a buyer
 * reads back over the phone once a booking exists.
 */
export function maskPlate(plate: string | null | undefined): string | null {
  const raw = (plate ?? '').trim();
  if (!raw) return null;

  // Grouped plates ("DXB-01-AB-1234", "KA 01 MM 2222"): blank the middle groups.
  const groups = raw.split(/([\s-]+)/);
  const words = groups.filter((_, i) => i % 2 === 0);
  if (words.length >= 3) {
    let seen = 0;
    return groups
      .map((part, i) => {
        if (i % 2 === 1) return part; // separator, kept as typed
        seen += 1;
        const isEdge = seen === 1 || seen === words.length;
        return isEdge ? part : '•'.repeat(part.length);
      })
      .join('');
  }

  // Ungrouped ("MH12AB1234"): keep the first 2 and last 3 characters.
  if (raw.length <= 5) return '•'.repeat(raw.length);
  return `${raw.slice(0, 2)}${'•'.repeat(Math.max(1, raw.length - 5))}${raw.slice(-3)}`;
}

/** A Vehicle row as selected by PUBLIC_VEHICLE_SELECT. */
export interface VehicleRow {
  plate: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  photoUrl: string | null;
  photos: string[];
  [key: string]: unknown;
}

/**
 * Shape one row for a public response.
 *
 * - `plate` is replaced by `plateMasked`; the raw column never survives.
 * - `tempRange` is derived here so the client never re-implements the format.
 * - `photos` is normalised so a row that only ever had the single `photoUrl`
 *   still returns a one-entry gallery — the client renders one code path.
 */
export function toPublicVehicle<T extends VehicleRow>(row: T) {
  const { plate, ...rest } = row;
  const photos = row.photos?.length ? row.photos : row.photoUrl ? [row.photoUrl] : [];
  return {
    ...rest,
    plateMasked: maskPlate(plate),
    photos,
    photoUrl: photos[0] ?? null,
    tempRange: row.refrigerated ? tempRangeText(row.tempMinC, row.tempMaxC) : null,
  };
}
