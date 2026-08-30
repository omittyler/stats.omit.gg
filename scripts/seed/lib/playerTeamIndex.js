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
