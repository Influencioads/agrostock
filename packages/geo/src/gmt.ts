/**
 * Fixed GMT offsets for the timezone pickers.
 *
 * Values keep the convention already stored in `Profile.timezone` and the seed
 * (`GMT+4`, `GMT+5:30`): no leading zero, minutes omitted when they are `:00`.
 * That means no data migration — existing rows already sit on a list value, and
 * `normalizeGmt` snaps the near-misses (`GMT+05:30`, `UTC+5:30`, `+5:30`) onto
 * one so the select shows the right option instead of blanking the field.
 */
export interface GmtOffset {
  /** Stored value, e.g. `GMT+5:30`. */
  value: string;
  /** Picker label, e.g. `GMT+5:30 (UTC+05:30)`. */
  label: string;
}

/** Minutes offset for every zone in real-world use, west to east. */
const OFFSET_MINUTES: number[] = [
  -720, -660, -600, -570, -540, -480, -420, -360, -300, -270, -240, -210, -180, -120, -60, 0, 60,
  120, 180, 210, 240, 270, 300, 330, 345, 360, 390, 420, 480, 525, 540, 570, 600, 630, 660, 720,
  765, 780, 840,
];

/** `330` → `GMT+5:30`, `-210` → `GMT-3:30`, `0` → `GMT+0`. */
export function formatGmt(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** `330` → `UTC+05:30` — the unambiguous form, shown alongside the value. */
function formatUtc(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

export const GMT_OFFSETS: GmtOffset[] = OFFSET_MINUTES.map((minutes) => ({
  value: formatGmt(minutes),
  label: `${formatGmt(minutes)} (${formatUtc(minutes)})`,
}));

const byValue = new Set(GMT_OFFSETS.map((o) => o.value));

/**
 * Snap a stored/typed timezone onto a list value. Returns `''` when the input
 * cannot be read as an offset, which the pickers render as "not set".
 */
export function normalizeGmt(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (byValue.has(trimmed)) return trimmed;
  const m = /^(?:gmt|utc)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec(trimmed);
  if (!m) return '';
  const minutes = (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
  const value = formatGmt(minutes);
  return byValue.has(value) ? value : '';
}

/** The viewer's own offset as a list value — a sensible default for a new profile. */
export function localGmt(): string {
  // getTimezoneOffset is minutes *behind* UTC, so the sign is inverted.
  return normalizeGmt(formatGmt(-new Date().getTimezoneOffset()));
}
