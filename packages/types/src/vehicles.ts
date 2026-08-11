/**
 * Vehicle body types and the small amount of formatting every surface shares.
 *
 * The IDs are the *stored* value (`Vehicle.vehicleType`). Labels are translated
 * as `enums:vehicleType.<ID>` — never hardcode them in a view, the same rule the
 * unit and delivery enums follow.
 */
export const VEHICLE_TYPES = [
  'reefer',
  'open_truck',
  'container',
  'tanker',
  'tipper',
  'mini_truck',
  'trailer',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export function isVehicleType(value: unknown): value is VehicleType {
  return typeof value === 'string' && (VEHICLE_TYPES as readonly string[]).includes(value);
}

/** Body types that are refrigerated by definition, so the flag follows the type. */
export const REFRIGERATED_TYPES: readonly VehicleType[] = ['reefer'];

/**
 * The reefer operating range as one display string — "-18°C to +4°C".
 *
 * Stored as two integers so a buyer can filter on them; this is the only place
 * that renders them, so the card, the detail page and the API's `tempRange` all
 * read identically. `null` when the vehicle isn't refrigerated or the range was
 * never set — callers hide the row rather than printing an empty range.
 */
export function tempRangeText(minC?: number | null, maxC?: number | null): string | null {
  const has = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  if (!has(minC) && !has(maxC)) return null;
  const deg = (n: number) => `${n > 0 ? '+' : ''}${n}°C`;
  if (has(minC) && has(maxC)) return `${deg(minC)} to ${deg(maxC)}`;
  return has(minC) ? `from ${deg(minC)}` : `up to ${deg(maxC as number)}`;
}

/**
 * Capacity for display, preferring the canonical number and falling back to the
 * legacy free-text column for rows the migration could not parse.
 *
 * Returns a `{ tons }` shape rather than a string so the caller can translate
 * the unit; `text` is the un-translatable legacy fallback.
 */
export function vehicleCapacity(
  capacityTons?: number | null,
  capacityMt?: string | null,
): { tons: number } | { text: string } | null {
  if (typeof capacityTons === 'number' && Number.isFinite(capacityTons) && capacityTons > 0) {
    return { tons: capacityTons };
  }
  const text = (capacityMt ?? '').trim();
  return text ? { text } : null;
}
