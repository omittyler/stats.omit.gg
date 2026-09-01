// Maps data/incoming/player_details.csv's "origin" column to a flag emoji.
// England/Scotland/Wales use the real Unicode regional flag tag sequences
// (not the generic UK flag) since the roster has enough UK-nations players
// for the distinction to matter; Northern Ireland has no such sequence in
// Unicode, so it falls back to the UK flag. Grows as new origins show up in
// player_details.csv - an origin not listed here just renders no flag.
const FLAGS: Record<string, string> = {
  Argentina: '🇦🇷',
  Australia: '🇦🇺',
  Bahrain: '🇧🇭',
  Belgium: '🇧🇪',
  Canada: '🇨🇦',
  Colombia: '🇨🇴',
  'Dominican Republic': '🇩🇴',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  France: '🇫🇷',
  Germany: '🇩🇪',
  India: '🇮🇳',
  Italy: '🇮🇹',
  Jamaica: '🇯🇲',
  Lithuania: '🇱🇹',
  Mexico: '🇲🇽',
  'New Zealand': '🇳🇿',
  'Northern Ireland': '🇬🇧',
  Pakistan: '🇵🇰',
  'Puerto Rico': '🇵🇷',
  'Republic of Ireland': '🇮🇪',
  'Saudi Arabia': '🇸🇦',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Spain: '🇪🇸',
  'United States': '🇺🇸',
  Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
};

export function flagForOrigin(origin: string | null | undefined): string {
  if (!origin) return '';
  return FLAGS[origin] ?? '';
}
