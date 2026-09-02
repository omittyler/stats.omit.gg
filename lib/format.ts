/** 1 -> "1st", 2 -> "2nd", 5 -> "5th", 11 -> "11th", 21 -> "21st" */
export function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

/** (1, 1) -> "1st"; (5, 6) -> "5th-6th" */
export function formatPlacementOrdinal(min: number, max: number): string {
  return min === max ? ordinal(min) : `${ordinal(min)}-${ordinal(max)}`;
}

/** "2026 Cup 1" -> "BO7 Cup 1" - used in Events section listings (Team page,
 *  Player page) so the season year prefix reads as the game title instead.
 *  Only replaces the specific "2026 " prefix (not any 4-digit year) since
 *  all current data is Black Ops 7 - a future Modern Warfare 4 season would
 *  get its own real year, which shouldn't be silently relabeled BO7 too. */
export function formatEventNameForEventsList(eventName: string): string {
  return eventName.replace(/^2026 /, 'BO7 ');
}

/** "2026-07-19" -> "7/19". Parses the date string's own components directly
 *  rather than `new Date(...)`, which would shift the day depending on the
 *  server's timezone. */
export function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${Number(month)}/${Number(day)}`;
}

/** "2026-07-19" -> "Sunday, July 19, 2026" - date-group headers on the full
 *  /matches list. Builds the Date as UTC-midnight and formats with
 *  timeZone: 'UTC' throughout, so the weekday/day never shifts based on the
 *  server or viewer's own timezone (the same class of bug formatShortDate's
 *  manual parsing avoids, just via the Intl API instead since we need the
 *  weekday name here). */
export function formatFullDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** The single best (lowest placementMin) entry in a history list, or null if empty. */
export function findBestFinish<T extends { placementMin: number }>(history: T[]): T | null {
  if (!history.length) return null;
  return history.reduce((best, h) => (h.placementMin < best.placementMin ? h : best));
}
