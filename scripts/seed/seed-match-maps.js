import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readCsvRows, readCsvObjects, toNumber } from './lib/csv.js';
import { buildPlayerTeamIndex, resolvePlayerTeam } from './lib/playerTeamIndex.js';
import { parseSeriesNumber, eventCandidatesForSeries } from './lib/matchSeriesRanges.js';
import { chunk } from './lib/teams.js';
import { supabase } from './lib/supabaseClient.js';

const MATCH_STATS_DIR = 'data/incoming/bo7_match_stats';

// Series whose source rows have every map's W/L and scores flipped between
// the two teams, confirmed against the official bracket the user supplied
// 2026-09-29. SR352 (EU Elite Stage 2, Losers Round 2): the source says For
// Fun EU won 3-1, but Orgless won 3-1 officially - Orgless played on
// (SR355, SR360) and placed 3rd while For Fun EU placed 5th-6th.
const FLIPPED_SERIES = new Set(['SR352']);

/**
 * confirmed-aliases.json is keyed per (file, bo7_stats_name) elsewhere in the
 * seed pipeline (seed-player-event-stats.js), but the first real run against
 * this data (2026-09-02) showed the exact same names - DC, D7oomx, Johnny,
 * Fire, Vik, Depa, D3, etc. - already confirmed for OTHER bo7_stats files,
 * unresolved here simply because these 3 match-map files were never in that
 * per-file keyspace. Rather than duplicate dozens of entries under new file
 * names, this folds every entry in globally by name (same fix already
 * proven for lib/statLeaderboards.ts's buildCanonicalNameMap, PROJECT.md
 * §8z) - the canonical_name is a fixed identity fact true regardless of
 * file, but team_name is NOT - several of the most common names here (Vik,
 * DC, Johnny, D3, Depa...) legitimately played for different teams across
 * different events, which is exactly why confirmed-aliases.json already
 * carries multiple entries for them. So this keeps every distinct team_name
 * ever confirmed for a name (`teamNames`), not just one - the caller can
 * check for an exact match against a series' already-known team(s) when it
 * has that context, and only fall back to the single most common team
 * (`bestTeamName`) as a guess when it doesn't (confirmed 2026-09-02: picking
 * one team globally up front caused real per-event mismatches to be
 * rejected as unresolved even though the SAME name/canonical identity was
 * correct - just attributed to the wrong one of that player's several teams).
 */
function loadGlobalAliasMap() {
  const raw = readFileSync('scripts/seed/confirmed-aliases.json', 'utf8');
  const entries = JSON.parse(raw);
  const byName = new Map(); // lowercased bo7_stats_name -> Map<team_name, count>
  const canonicalByName = new Map();
  for (const { bo7_stats_name, canonical_name, team_name } of entries) {
    const key = bo7_stats_name.toLowerCase();
    canonicalByName.set(key, canonical_name);
    if (!byName.has(key)) byName.set(key, new Map());
    const teamCounts = byName.get(key);
    teamCounts.set(team_name, (teamCounts.get(team_name) ?? 0) + 1);
  }

  const result = new Map();
  for (const [key, teamCounts] of byName) {
    const teamNames = [...teamCounts.keys()];
    const bestTeamName = [...teamCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    result.set(key, { teamNames, bestTeamName, canonicalName: canonicalByName.get(key) });
  }
  return result;
}

// Column indices (0-based) for each mode's file. Everything past these is
// either a redundant repeat of columns 0-9 or the not-needed named-block
// section - see PROJECT.md §8ag for how these were confirmed with the user.
const MODE_FILES = [
  {
    file: 'BO7 Season - HP Match Map Data.csv',
    mode: 'Hardpoint',
    parseStats: (c) => ({
      k: toNumber(c[10]), d: toNumber(c[11]), a: toNumber(c[12]), non_traded_kills: toNumber(c[13]),
      headshots: toNumber(c[14]), damage: toNumber(c[15]),
      hill_time: toNumber(c[16]), objective_kills: toNumber(c[17]), contest: toNumber(c[18]), time: toNumber(c[19]),
    }),
  },
  {
    file: 'BO7 Season - Search and Destroy Match Map Data.csv',
    mode: 'Search and Destroy',
    parseStats: (c) => ({
      k: toNumber(c[10]), d: toNumber(c[11]), a: toNumber(c[12]), non_traded_kills: toNumber(c[13]),
      headshots: toNumber(c[14]), damage: toNumber(c[15]),
      plants: toNumber(c[16]), defuses: toNumber(c[17]), first_bloods: toNumber(c[18]),
      first_deaths: toNumber(c[19]), rounds: toNumber(c[20]),
    }),
  },
  {
    file: 'BO7 Season - Overload Match Map Data.csv',
    mode: 'Overload',
    parseStats: (c) => ({
      k: toNumber(c[10]), d: toNumber(c[11]), a: toNumber(c[12]), non_traded_kills: toNumber(c[13]),
      headshots: toNumber(c[14]), damage: toNumber(c[15]),
      goals: toNumber(c[16]), objective_kills: toNumber(c[17]), time: toNumber(c[18]),
    }),
  },
];

function eventKey(name, region) {
  return `${name}|${region || ''}`;
}

// Supabase/PostgREST caps a plain .select() at 1000 rows by default - both
// `matches` (610 rows) and especially `match_maps` (2300+ rows) can exceed
// that, which silently truncated the id lookup built from it and sent
// `undefined`/null match_map_id into match_map_player_stats (confirmed
// 2026-09-02 against a real failing row). Pages through with .range() until
// a page comes back short.
async function fetchAllRows(table, select) {
  const PAGE_SIZE = 1000;
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

/**
 * Parses one mode's file into "games" - one per unique (Series, Map #) pair,
 * each with every player row that shares it. NOT grouped by the mode-specific
 * match-id column (e.g. "HP001") despite that looking like the obvious key -
 * confirmed 2026-09-02 that column is only populated for the first ~200 of
 * 12640 rows in the HP file and blank for the rest, which silently collapsed
 * nearly the whole file into a handful of buckets on the first attempt.
 * Series + Map # are always present and, since Map # is the series' own
 * position-in-set counter, unique per game within one series.
 */
function parseModeFile({ file, mode, parseStats }) {
  const rows = readCsvRows(path.join(MATCH_STATS_DIR, file));
  const dataRows = rows.slice(1); // single header row - not the usual bo7_stats double-header

  const games = new Map(); // `${series}|${mapNumber}` -> game
  for (const c of dataRows) {
    if (!c[0]) continue; // blank trailing row
    const series = c[3];
    const mapNumber = Number(c[6]);
    const key = `${series}|${mapNumber}`;
    if (!games.has(key)) {
      games.set(key, {
        series,
        mode,
        map: c[5],
        mapNumber,
        players: [],
      });
    }
    games.get(key).players.push({
      player: c[0],
      teamCode: c[1],
      scoreFor: toNumber(c[8]),
      stats: parseStats(c),
    });
  }
  return [...games.values()];
}

export async function seedMatchMaps() {
  const placingsRows = readCsvObjects('data/incoming/placings.csv');
  const playerTeamIndex = buildPlayerTeamIndex(placingsRows);
  const globalAliasMap = loadGlobalAliasMap();

  const { data: eventRows, error: eventsFetchError } = await supabase.from('events').select('id,name,region');
  if (eventsFetchError) throw eventsFetchError;
  const eventCache = new Map(eventRows.map((e) => [eventKey(e.name, e.region), e.id]));

  const games = MODE_FILES.flatMap(parseModeFile);

  const gamesBySeries = new Map();
  for (const game of games) {
    if (!gamesBySeries.has(game.series)) gamesBySeries.set(game.series, []);
    gamesBySeries.get(game.series).push(game);
  }

  const skippedGaps = [];
  const unresolvedSeries = [];
  const unresolvedPlayers = [];
  const scorelessMaps = [];

  const matchPayload = []; // { series_label, event_id, team1_name, team2_name }
  const seriesResolution = new Map(); // series -> { eventId, team1Name, team2Name, playerTeamMap }

  for (const [series, seriesGames] of gamesBySeries) {
    const seriesNumber = parseSeriesNumber(series);
    const candidates = seriesNumber === null ? [] : eventCandidatesForSeries(seriesNumber);
    if (!candidates.length) {
      skippedGaps.push(series);
      continue;
    }

    const distinctPlayers = [...new Set(seriesGames.flatMap((g) => g.players.map((p) => p.player)))];

    // Try every {name, region} candidate for this series' event; pick
    // whichever one actually resolves the most of this series' real players
    // against that event's placings.csv roster. Deliberately NOT using the
    // alias fallback here (unlike the final resolution pass below) - a
    // global alias hit doesn't care which region it's being checked against,
    // so counting it here would inflate NA and EU candidates equally and
    // corrupt the very thing this comparison exists to disambiguate.
    // Confirmed 2026-09-02: doing so dropped resolved series from 610 to 529.
    let best = null;
    for (const candidate of candidates) {
      const key = eventKey(candidate.name, candidate.region);
      let resolvedCount = 0;
      for (const player of distinctPlayers) {
        if (resolvePlayerTeam(playerTeamIndex, key, player)) resolvedCount++;
      }
      if (!best || resolvedCount > best.resolvedCount) {
        best = { candidate, resolvedCount };
      }
    }

    if (!best || best.resolvedCount < distinctPlayers.length / 2) {
      unresolvedSeries.push({ series, distinctPlayers, bestResolvedCount: best?.resolvedCount ?? 0 });
      continue;
    }

    const key = eventKey(best.candidate.name, best.candidate.region);
    const eventId = eventCache.get(key);
    if (!eventId) {
      unresolvedSeries.push({ series, reason: `No event row for ${key}` });
      continue;
    }

    // Two passes: strict placings.csv resolution first, establishing which
    // real team name(s) this series actually involves; only THEN do
    // unresolved players get a global-alias fallback, and only when that
    // alias's team_name is consistent with what strict resolution already
    // found (or strict resolution hasn't pinned down both teams yet). A
    // confirmed alias is a real fact about that player, but not proof they
    // played in THIS series - accepting one whose team doesn't match either
    // side already in evidence would introduce a false 3rd team and fail
    // the exactly-2-teams check below. Confirmed 2026-09-02: applying the
    // alias fallback in one undifferentiated pass did exactly that, driving
    // resolved series from 610 down to ~528 instead of up.
    const playerTeamMap = new Map(); // lowercased player -> { teamName, canonicalName }
    const stillUnresolved = [];
    for (const player of distinctPlayers) {
      const resolved = resolvePlayerTeam(playerTeamIndex, key, player);
      if (resolved) playerTeamMap.set(player.toLowerCase(), resolved);
      else stillUnresolved.push(player);
    }

    const knownTeams = new Set([...playerTeamMap.values()].map((r) => r.teamName));
    for (const player of stillUnresolved) {
      const alias = globalAliasMap.get(player.toLowerCase());
      if (!alias) {
        unresolvedPlayers.push({ series, player, event: key });
        continue;
      }
      // With both teams already known, pick whichever of this name's several
      // confirmed teams actually matches one of them - an exact fact, not a
      // guess. Otherwise (not enough context yet) fall back to their single
      // most common team as a best-effort guess.
      const matchingTeam = alias.teamNames.find((t) => knownTeams.has(t));
      if (knownTeams.size >= 2 && !matchingTeam) {
        unresolvedPlayers.push({ series, player, event: key });
        continue;
      }
      const teamName = matchingTeam ?? alias.bestTeamName;
      playerTeamMap.set(player.toLowerCase(), { teamName, canonicalName: alias.canonicalName });
      knownTeams.add(teamName);
    }

    const distinctTeamNames = [...new Set([...playerTeamMap.values()].map((r) => r.teamName))].sort();
    if (distinctTeamNames.length !== 2) {
      unresolvedSeries.push({ series, reason: `Resolved ${distinctTeamNames.length} teams, expected 2`, distinctTeamNames });
      continue;
    }

    const [team1Name, team2Name] = distinctTeamNames;
    seriesResolution.set(series, { eventId, team1Name, team2Name, playerTeamMap });
    matchPayload.push({ series_label: series, event_id: eventId, team1_name: team1Name, team2_name: team2Name });
  }

  for (const batch of chunk(matchPayload, 500)) {
    const { error } = await supabase.from('matches').upsert(batch, { onConflict: 'series_label' });
    if (error) throw error;
  }
  console.log(`matches: upserted ${matchPayload.length} rows`);

  const matchRows = await fetchAllRows('matches', 'id, series_label');
  const matchIdBySeries = new Map(matchRows.map((r) => [r.series_label, r.id]));

  const matchMapPayload = []; // one per game, plus a synthetic key to re-find its id after upsert
  for (const [series, resolution] of seriesResolution) {
    const matchId = matchIdBySeries.get(series);
    for (const game of gamesBySeries.get(series)) {
      // Only records a NON-NULL score per team - toNumber() can return null
      // for a genuinely blank/malformed source cell, and if the first player
      // row seen for a team happened to be that blank one, a teammate's
      // still-valid row should get the chance to fill it in instead of
      // locking in a null that would later violate match_maps' not-null
      // constraint (confirmed 2026-09-02 against a real failing row).
      const scoreByTeam = new Map();
      for (const p of game.players) {
        const resolved = resolution.playerTeamMap.get(p.player.toLowerCase());
        if (resolved && p.scoreFor != null && !scoreByTeam.has(resolved.teamName)) {
          scoreByTeam.set(resolved.teamName, p.scoreFor);
        }
      }
      const flipped = FLIPPED_SERIES.has(series);
      const team1Score = scoreByTeam.get(flipped ? resolution.team2Name : resolution.team1Name);
      const team2Score = scoreByTeam.get(flipped ? resolution.team1Name : resolution.team2Name);
      if (team1Score === undefined || team2Score === undefined) {
        scorelessMaps.push({ series, mode: game.mode, map: game.map, mapNumber: game.mapNumber });
        continue;
      }
      matchMapPayload.push({
        match_id: matchId,
        mode: game.mode,
        map_name: game.map,
        map_number: game.mapNumber,
        team1_score: team1Score,
        team2_score: team2Score,
        _game: game, // carried through for the player-stats pass below, stripped before insert
      });
    }
  }

  for (const batch of chunk(matchMapPayload, 500)) {
    const rows = batch.map(({ _game, ...row }) => row);
    const { error } = await supabase.from('match_maps').upsert(rows, { onConflict: 'match_id,map_number' });
    if (error) throw error;
  }
  console.log(`match_maps: upserted ${matchMapPayload.length} rows`);

  const matchMapRows = await fetchAllRows('match_maps', 'id, match_id, map_number');
  const matchMapIdByKey = new Map(matchMapRows.map((r) => [`${r.match_id}|${r.map_number}`, r.id]));

  const playerStatsPayload = [];
  for (const { match_id, map_number, _game } of matchMapPayload) {
    const matchMapId = matchMapIdByKey.get(`${match_id}|${map_number}`);
    const resolution = seriesResolution.get(_game.series);
    for (const p of _game.players) {
      const resolved = resolution.playerTeamMap.get(p.player.toLowerCase());
      if (!resolved) continue; // already recorded in unresolvedPlayers above
      playerStatsPayload.push({
        match_map_id: matchMapId,
        player_name: resolved.canonicalName,
        team_name: resolved.teamName,
        ...p.stats,
      });
    }
  }

  for (const batch of chunk(playerStatsPayload, 500)) {
    const { error } = await supabase
      .from('match_map_player_stats')
      .upsert(batch, { onConflict: 'match_map_id,player_name' });
    if (error) throw error;
  }
  console.log(`match_map_player_stats: upserted ${playerStatsPayload.length} rows`);

  if (skippedGaps.length) {
    console.warn(`match-maps: ${skippedGaps.length} series skipped - no known event range covers them (gaps, not errors).`);
  }
  if (unresolvedSeries.length) {
    await writeFile('scripts/seed/unresolved-match-series.json', JSON.stringify(unresolvedSeries, null, 2));
    console.warn(`match-maps: ${unresolvedSeries.length} series couldn't be confidently resolved to an event/region - see scripts/seed/unresolved-match-series.json.`);
  }
  if (unresolvedPlayers.length) {
    await writeFile('scripts/seed/unresolved-match-players.json', JSON.stringify(unresolvedPlayers, null, 2));
    console.warn(`match-maps: ${unresolvedPlayers.length} individual player rows couldn't be matched to a roster - see scripts/seed/unresolved-match-players.json.`);
  }
  if (scorelessMaps.length) {
    await writeFile('scripts/seed/scoreless-match-maps.json', JSON.stringify(scorelessMaps, null, 2));
    console.warn(`match-maps: ${scorelessMaps.length} maps skipped - couldn't determine both teams' scores - see scripts/seed/scoreless-match-maps.json.`);
  }
}
