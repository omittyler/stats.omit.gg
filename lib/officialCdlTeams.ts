// The 12 official Call of Duty League franchises (confirmed by user
// 2026-09-01, PROJECT.md §8x) - CDL runs its own separate points system, so
// a player's Challengers CDC points don't roll into one of these teams'
// standing while that's their current team. Not the same list as
// lib/excludedTeams.ts (which fully hides ad-hoc pickup squads from the
// site) - these teams stay fully visible, including their own real
// Exhibition-event prize money; only the CDC-points team rollup is skipped.
export const OFFICIAL_CDL_TEAMS = new Set([
  'OpTic Texas',
  'Miami Heretics',
  'Riyadh Falcons',
  'Los Angeles Thieves',
  'Paris Gentle Mates',
  'Toronto KOI',
  'G2 Minnesota',
  'FaZe Vegas',
  'Cloud9 New York',
  'Carolina Royal Ravens',
  'Vancouver Surge',
  'Boston Breach',
]);
