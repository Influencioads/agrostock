/**
 * Splits the `"City, Country"` value the unscoped city search returns
 * (`GET /geo/cities?q=`) into the two stored fields. A value with no comma is a
 * bare city; a city that itself contains a comma keeps everything before the
 * LAST one.
 */
export function splitPlace(value: string): { city: string; country: string } {
  const i = value.lastIndexOf(',');
  if (i < 0) return { city: value.trim(), country: '' };
  return { city: value.slice(0, i).trim(), country: value.slice(i + 1).trim() };
}
