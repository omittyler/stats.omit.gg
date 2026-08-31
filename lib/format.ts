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

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** The single best (lowest placementMin) entry in a history list, or null if empty. */
export function findBestFinish<T extends { placementMin: number }>(history: T[]): T | null {
  if (!history.length) return null;
  return history.reduce((best, h) => (h.placementMin < best.placementMin ? h : best));
}
