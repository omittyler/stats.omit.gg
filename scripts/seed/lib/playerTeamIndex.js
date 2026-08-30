/**
 * Builds an index from placings.csv rows: for each event, which team a given
 * player was on. Used to resolve bo7_stats' team codes (TBG, P7N, HUN, ...) to
 * the real team names already established in placings.csv, by looking up each
 * stats row's player name directly rather than guessing from the code.
 *
 * Player names are matched case-insensitively — bo7_stats and placings.csv use
 * inconsistent capitalization for the same handle (e.g. "2Real" vs "2ReaL",
 * "QK4B" vs "qk4b"), confirmed 2026-08-30 by cross-checking a real seed run.
 * placings.csv's spelling is treated as canonical (it's the curated, manually
 * reconciled source) and returned alongside the team, so player_event_stats
 * doesn't end up storing bo7_stats' inconsistent casing.
 *
 * Returns Map(`${event_name}|${region||''}` -> Map(lowercased player_name ->
 *   { canonicalName, teams: string[] }))
 * A player mapping to more than one team name for the same event is a genuine
 * ambiguity (same pattern as the same-event roster conflicts seen throughout
 * placings.csv) - callers must treat that as unresolved, not pick one.
 */
export function buildPlayerTeamIndex(placingsRows) {
  const index = new Map();
  for (const row of placingsRows) {
    const key = `${row.event_name}|${row.region || ''}`;
    if (!index.has(key)) index.set(key, new Map());
    const playerMap = index.get(key);
    for (const player of [row.player1, row.player2, row.player3, row.player4]) {
      if (!player) continue;
      const lowerName = player.toLowerCase();
      if (!playerMap.has(lowerName)) playerMap.set(lowerName, { canonicalName: player, teams: [] });
      const entry = playerMap.get(lowerName);
      if (!entry.teams.includes(row.team_name)) entry.teams.push(row.team_name);
    }
  }
  return index;
}

/** Returns { teamName, canonicalName } for a player in an event, or null if unresolved (missing/ambiguous). */
export function resolvePlayerTeam(playerTeamIndex, eventKey, playerName) {
  const entry = playerTeamIndex.get(eventKey)?.get(playerName.toLowerCase());
  if (!entry || entry.teams.length !== 1) return null;
  return { teamName: entry.teams[0], canonicalName: entry.canonicalName };
}

/**
 * Fallback for exact-match misses caused by real truncation/shortening between
 * the two data sources (confirmed 2026-08-30: e.g. bo7_stats "D3" vs placings.csv
 * "D3L1V3R"; the shortening can go either direction). Finds roster names for this
 * event where one name is a prefix of the other, case-insensitively, and only
 * among names that are themselves unambiguous (one team) in this event.
 *
 * Returns an array of { teamName, canonicalName } candidates — the caller must
 * only trust this when exactly one candidate comes back, and should still treat
 * it as a suggestion to confirm, not an established match, since a short prefix
 * (like "DC") could plausibly match more than one real name in a large roster.
 */
export function findPrefixCandidates(playerTeamIndex, eventKey, playerName) {
  const playerMap = playerTeamIndex.get(eventKey);
  if (!playerMap) return [];
  const lowerName = playerName.toLowerCase();
  const candidates = [];
  for (const [candidateLower, entry] of playerMap) {
    if (entry.teams.length !== 1) continue; // don't surface an already-ambiguous name as a candidate
    if (candidateLower === lowerName) continue; // would have exact-matched already
    if (candidateLower.startsWith(lowerName) || lowerName.startsWith(candidateLower)) {
      candidates.push({ teamName: entry.teams[0], canonicalName: entry.canonicalName });
    }
  }
  return candidates;
}
