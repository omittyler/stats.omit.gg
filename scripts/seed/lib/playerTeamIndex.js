/**
 * Builds an index from placings.csv rows: for each event, which team a given
 * player was on. Used to resolve bo7_stats' team codes (TBG, P7N, HUN, ...) to
 * the real team names already established in placings.csv, by looking up each
 * stats row's player name directly rather than guessing from the code.
 *
 * Returns Map(`${event_name}|${region||''}` -> Map(player_name -> string[] of team names))
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
      if (!playerMap.has(player)) playerMap.set(player, []);
      const teams = playerMap.get(player);
      if (!teams.includes(row.team_name)) teams.push(row.team_name);
    }
  }
  return index;
}

/** Returns the resolved team name for a player in an event, or null if unresolved (missing/ambiguous). */
export function resolvePlayerTeam(playerTeamIndex, eventKey, playerName) {
  const teams = playerTeamIndex.get(eventKey)?.get(playerName);
  if (!teams || teams.length !== 1) return null;
  return teams[0];
}
