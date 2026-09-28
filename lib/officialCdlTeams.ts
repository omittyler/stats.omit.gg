import type { GameValue } from './season';

// The 12 official Call of Duty League franchises (confirmed by user
// 2026-09-01, PROJECT.md §8x) - CDL runs its own separate points system, so
// a player's Challengers CDC points don't roll into one of these teams'
// standing while that's their current team. Not the same list as
// lib/excludedTeams.ts (which fully hides ad-hoc pickup squads from the
// site) - these teams stay fully visible, including their own real
// Exhibition-event prize money; only the CDC-points team rollup is skipped.
//
// This is the BO7 lineup; franchises rebranded for a later season are
// listed in CDL_TEAM_RENAMES below.
const BASE_CDL_TEAMS = [
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
];

// Per-season franchise rebrands (old name -> new name). The new name is its
// own row in the `teams` table (data/incoming/teams.csv), so it carries its
// own logo.
const CDL_TEAM_RENAMES: Partial<Record<GameValue, Record<string, string>>> = {
  'Modern Warfare 4': { 'Boston Breach': 'M80 Boston' },
};

/** The 12 CDL franchises under the names they use in the given season. */
export function cdlTeamsForGame(game: GameValue): string[] {
  const renames = CDL_TEAM_RENAMES[game] ?? {};
  return BASE_CDL_TEAMS.map((name) => renames[name] ?? name);
}

// Every CDL franchise name across all seasons - used for the season-agnostic
// "is this a CDL team" checks (points rollup, CDL banners, leaderboard
// exclusion).
export const OFFICIAL_CDL_TEAMS = new Set([
  ...BASE_CDL_TEAMS,
  ...Object.values(CDL_TEAM_RENAMES).flatMap((r) => Object.values(r ?? {})),
]);
