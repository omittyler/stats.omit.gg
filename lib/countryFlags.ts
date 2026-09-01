// Maps data/incoming/player_details.csv's "origin" column to a flag-icons
// (https://github.com/lipis/flag-icons) code, e.g. "us" or "gb-eng" for
// `<span className={`fi fi-${code}`} />`. Real image flags, not emoji -
// Windows Chrome doesn't reliably render flag emoji (regional-indicator
// pairs show up as literal two-letter text, e.g. "US", instead of an image;
// confirmed by the user 2026-09-01), so this avoids relying on the OS/browser
// emoji font entirely. flag-icons ships gb-eng/gb-sct/gb-wls/gb-nir as extra
// (non-ISO) codes, which is why it was picked over a plain ISO-country-only
// flag set - the roster has enough UK-nations players for the England/
// Scotland/Wales distinction to matter, same reasoning as the old emoji map.
// Grows as new origins show up in player_details.csv - an origin not listed
// here just renders no flag.
const FLAG_CODES: Record<string, string> = {
  Argentina: 'ar',
  Australia: 'au',
  Bahrain: 'bh',
  Belgium: 'be',
  Canada: 'ca',
  Colombia: 'co',
  'Dominican Republic': 'do',
  England: 'gb-eng',
  France: 'fr',
  Germany: 'de',
  India: 'in',
  Italy: 'it',
  Jamaica: 'jm',
  Lithuania: 'lt',
  Mexico: 'mx',
  'New Zealand': 'nz',
  'Northern Ireland': 'gb-nir',
  Pakistan: 'pk',
  'Puerto Rico': 'pr',
  'Republic of Ireland': 'ie',
  'Saudi Arabia': 'sa',
  Scotland: 'gb-sct',
  Spain: 'es',
  'United States': 'us',
  Wales: 'gb-wls',
};

export function flagCodeForOrigin(origin: string | null | undefined): string {
  if (!origin) return '';
  return FLAG_CODES[origin] ?? '';
}
