import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { supabase } from './supabase';
import { EXCLUDED_TEAM_NAMES } from './excludedTeams';
import { OFFICIAL_CDL_TEAMS } from './officialCdlTeams';

type PointsScaleRow = {
  event_type: string;
  placement_min: number;
  placement_max: number;
  cdc_points: number;
  prize_usd: number | null;
  prize_usd_ap_la: number | null;
};

type PlacementRow = {
  placement_min: number;
  placement_max: number;
  player1: string | null;
  player2: string | null;
  player3: string | null;
  player4: string | null;
  team_id: number;
  teams: { name: string } | null;
  events: { name: string; type: string; event_date: string | null; region: string } | null;
};

export type EnrichedPlacement = {
  eventName: string;
  eventType: string;
  eventDate: string | null;
  region: string;
  placementMin: number;
  placementMax: number;
  teamName: string;
  points: number;
  prizeUsd: number;
  players: string[];
};

export type PlayerStanding = {
  name: string;
  points: number;
  currentTeam: string;
  region: string;
  /**
   * True when `currentTeam` is stale: it's this player's own most recent
   * event/roster-move, but that team has since played a LATER event without
   * them (see the `teamLatestEventDate` note in computeStandings). Excluded
   * from that team's current roster/points rollup, but the player's own page
   * still shows `currentTeam` as their last known team - it's the best
   * information on record, just not "current" from the team's side.
   */
  rosterStale: boolean;
};
export type TeamStanding = { name: string; points: number; players: string[]; region: string };

/**
 * Fetches every placement, joined with its team/event, and the CDC points it's
 * worth (exact placement-tier lookup against points_scale). This is the one
 * shared query behind /standings, /players, and the team/player detail pages -
 * each just filters/rolls this up differently.
 */
export async function getEnrichedPlacements(): Promise<EnrichedPlacement[]> {
  const [{ data: placements, error: placementsError }, { data: scale, error: scaleError }] =
    await Promise.all([
      supabase
        .from('event_placements')
        .select(
          'placement_min, placement_max, player1, player2, player3, player4, team_id, teams(name), events(name, type, event_date, region)'
        ),
      supabase
        .from('points_scale')
        .select('event_type, placement_min, placement_max, cdc_points, prize_usd, prize_usd_ap_la'),
    ]);

  if (placementsError) throw placementsError;
  if (scaleError) throw scaleError;

  const scaleRows = (scale ?? []) as PointsScaleRow[];
  const rows = (placements ?? []) as unknown as PlacementRow[];

  function lookupScale(eventType: string, min: number, max: number) {
    return scaleRows.find(
      (s) => s.event_type === eventType && s.placement_min === min && s.placement_max === max
    );
  }

  // Prize money is tracked at the TEAM level (unlike points, which are per-player,
  // see computeStandings below) - Cup is the only event type where AP/LATAM prize
  // differs from NA/EU even though CDC points don't (data/reference/cdc_points_and_prizing.md).
  function lookupPrize(eventType: string, region: string, min: number, max: number) {
    const scale = lookupScale(eventType, min, max);
    if (!scale) return 0;
    if (eventType === 'Cup' && (region === 'AP' || region === 'LATAM')) {
      return scale.prize_usd_ap_la ?? 0;
    }
    return scale.prize_usd ?? 0;
  }

  return rows
    .filter((row) => row.events && row.teams)
    .filter((row) => row.events!.region !== 'AP' && row.events!.region !== 'LATAM') // AP/LATAM scoped out of the site, per user 2026-08-31
    .filter((row) => !EXCLUDED_TEAM_NAMES.has(row.teams!.name)) // ad-hoc "Team <handle>" pickup squads, per user 2026-08-31
    .map((row) => {
      const eventType = row.events!.type;
      const region = row.events!.region;
      return {
        eventName: row.events!.name,
        eventType,
        eventDate: row.events!.event_date,
        region,
        placementMin: row.placement_min,
        placementMax: row.placement_max,
        teamName: row.teams!.name,
        points: lookupScale(eventType, row.placement_min, row.placement_max)?.cdc_points ?? 0,
        prizeUsd: lookupPrize(eventType, region, row.placement_min, row.placement_max),
        players: [row.player1, row.player2, row.player3, row.player4].filter(
          (p): p is string => p !== null
        ),
      };
    });
}

export type RosterMove = { date: string; player: string; newTeam: string; note?: string };

/**
 * Off-season (or otherwise event-less) team changes, from a small manually-
 * maintained log - NOT a Supabase table, since it isn't tied to any event
 * and there's nothing to join it against; read straight off disk like the
 * bo7_stats Full Season CSVs in lib/statLeaderboards.ts. Returns [] if the
 * file doesn't exist or is empty (e.g. no moves logged yet) rather than
 * throwing - this is optional, additive data. See PROJECT.md §8r and
 * data/incoming/README.md for the format and why a real event date can't
 * substitute for this.
 */
function getRosterMoves(): RosterMove[] {
  let raw: string;
  try {
    raw = readFileSync('data/incoming/roster_moves.csv', 'utf8');
  } catch {
    return [];
  }
  const rows: Record<string, string>[] = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  return rows
    .filter((r) => r.date && r.player && r.new_team)
    .map((r) => ({ date: r.date, player: r.player, newTeam: r.new_team, note: r.note || undefined }));
}

/**
 * CDC points are earned by, and travel with, the PLAYER - not the team
 * (confirmed 2026-08-30). A team's standing is the sum of its CURRENT
 * roster's individual point totals, so this computes player totals first
 * (every event a name appears in, full placement points each - not split),
 * tracks each player's most recent event by real date to find their current
 * team, then rolls that up into team totals.
 *
 * Known limitation: player identity here is just the name string. A few
 * handles are already confirmed (PROJECT.md §7) to belong to two different
 * real people who were never given distinct spellings ("Apollo", "Law") -
 * those specific names' totals incorrectly merge two people until that's
 * fixed at the source.
 */
export async function computeStandings(placements?: EnrichedPlacement[]) {
  const rows = placements ?? (await getEnrichedPlacements());

  // A team's own most recent event date, independent of any one player's
  // roster - used below to catch a player whose personal last event predates
  // a LATER event their old team went on to play without them (e.g. OMiT
  // Brooklyn fielded Wrecks/Standy through Cup 13, then Diamondcon/Gwinn at
  // the later Champs Finals - Wrecks/Standy's own last appearance is real,
  // but stale, since their old team has since moved on without them).
  // Confirmed 2026-09-01 after this exact case was reported.
  const teamLatestEventDate = new Map<string, string>();
  for (const row of rows) {
    const date = row.eventDate ?? '';
    if (date > (teamLatestEventDate.get(row.teamName) ?? '')) {
      teamLatestEventDate.set(row.teamName, date);
    }
  }

  const players = new Map<
    string,
    { total: number; lastDate: string; lastTeam: string; lastRegionDate: string; region: string }
  >();

  for (const row of rows) {
    const date = row.eventDate ?? '';
    for (const name of row.players) {
      const existing = players.get(name);
      if (existing) {
        existing.total += row.points;
        if (date > existing.lastDate) {
          existing.lastDate = date;
          existing.lastTeam = row.teamName;
        }
        // Region tracked separately from "current team" - Major/Champs events
        // carry no region at all, so a player whose most recent event was a
        // Major would otherwise lose their real NA/EU tag. Uses their most
        // recent event that DOES have a region instead.
        if (row.region && date > existing.lastRegionDate) {
          existing.lastRegionDate = date;
          existing.region = row.region;
        }
      } else {
        players.set(name, {
          total: row.points,
          lastDate: date,
          lastTeam: row.teamName,
          lastRegionDate: row.region ? date : '',
          region: row.region || '',
        });
      }
    }
  }

  // Off-season/event-less roster moves override "current team" if they're
  // more recent than the player's last real event - same "most recent by
  // date" rule as events themselves, just from a different source. Doesn't
  // touch `region` (a move has no Cup/Elite region of its own) or `total`
  // (no points are earned by being signed). A move for a player with no
  // prior event at all (a brand new signing) still creates an entry, so they
  // show up on their new team's roster immediately.
  for (const move of getRosterMoves()) {
    const existing = players.get(move.player);
    if (existing) {
      if (move.date > existing.lastDate) {
        existing.lastDate = move.date;
        existing.lastTeam = move.newTeam;
      }
    } else {
      players.set(move.player, { total: 0, lastDate: move.date, lastTeam: move.newTeam, lastRegionDate: '', region: '' });
    }
  }

  const playerStandings: PlayerStanding[] = [...players.entries()]
    .map(([name, agg]) => ({
      name,
      points: agg.total,
      currentTeam: agg.lastTeam,
      region: agg.region,
      rosterStale: agg.lastDate < (teamLatestEventDate.get(agg.lastTeam) ?? ''),
    }))
    .sort((a, b) => b.points - a.points);

  const teamTotals = new Map<string, { points: number; players: string[]; regionCounts: Map<string, number> }>();
  for (const { name, points, currentTeam, region, rosterStale } of playerStandings) {
    if (rosterStale) continue; // not part of this team's current roster/points - see PlayerStanding.rosterStale
    // CDL runs its own separate points system - a player's Challengers CDC
    // points don't roll into an official CDL team's standing while that's
    // their current team (confirmed 2026-09-01, PROJECT.md §8x). Points stay
    // frozen at 0 rather than removing the team from teamStandings entirely -
    // it still needs to exist (searchable, listed on /teams) since it's a
    // real, viewable team, just with no CDC points contribution. If a player
    // moves back to a real Challengers org later this season, the normal
    // most-recent-event-wins logic above already re-attributes their points
    // there - nothing extra needed for that case. The player's own point
    // total (on their own page) is untouched either way; only this
    // team-level rollup is skipped.
    const contributesPoints = !OFFICIAL_CDL_TEAMS.has(currentTeam);
    const existing = teamTotals.get(currentTeam);
    if (existing) {
      if (contributesPoints) existing.points += points;
      existing.players.push(name);
      if (region) existing.regionCounts.set(region, (existing.regionCounts.get(region) ?? 0) + 1);
    } else {
      const regionCounts = new Map<string, number>();
      if (region) regionCounts.set(region, 1);
      teamTotals.set(currentTeam, { points: contributesPoints ? points : 0, players: [name], regionCounts });
    }
  }

  // A team's region is whichever region most of its current roster's players
  // are tagged with (a roster should be regionally homogeneous in practice).
  const teamStandings: TeamStanding[] = [...teamTotals.entries()]
    .map(([name, v]) => {
      let region = '';
      let best = 0;
      for (const [r, count] of v.regionCounts) {
        if (count > best) {
          best = count;
          region = r;
        }
      }
      return { name, points: v.points, players: v.players, region };
    })
    .sort((a, b) => b.points - a.points);

  return { playerStandings, teamStandings };
}

export type RankedStat = { value: number | null; rank: number | null };

export type EventStatsSummary = {
  matchesTotal: number | null;
  matchesW: number | null;
  matchesL: number | null;
  mapsTotal: number | null;
  mapsW: number | null;
  mapsL: number | null;

  overallKd: RankedStat;
  overallKad: RankedStat;
  overallSlayerRating: RankedStat;
  overallDamageRating: RankedStat;

  hpMaps: number | null;
  hpKd: RankedStat;
  hpHillTimePer10: RankedStat;
  hpKPer10: RankedStat;
  hpDmgPer10: RankedStat;

  sndMaps: number | null;
  sndKd: RankedStat;
  sndOpeningDuelWinPct: RankedStat;
  sndKPerR: RankedStat;
  sndDmgPerR: RankedStat;

  ovlMaps: number | null;
  ovlKd: RankedStat;
  ovlGoalsPer10: RankedStat;
  ovlKPer10: RankedStat;
  ovlDmgPer10: RankedStat;
};

// The stat fields ranked against every other player at the same event (see
// getPlayerEventStatsSummaries) - all treated as higher-is-better.
const RANKED_FIELDS = [
  'overall_kd',
  'overall_kad',
  'overall_slayer_rating',
  'overall_damage_rating',
  'hp_kd',
  'hp_hill_time_per_10',
  'hp_k_per_10',
  'hp_dmg_per_10',
  'snd_kd',
  'snd_opening_duel_win_pct',
  'snd_k_per_r',
  'snd_dmg_per_r',
  'ovl_kd',
  'ovl_goals_per_10',
  'ovl_k_per_10',
  'ovl_dmg_per_10',
] as const;

type RankedField = (typeof RANKED_FIELDS)[number];

type FullPlayerEventStatsRow = { player_name: string; events: { name: string; region: string } | null } & Record<
  RankedField,
  number | null
> & {
    matches_total: number | null;
    matches_w: number | null;
    matches_l: number | null;
    maps_total: number | null;
    maps_w: number | null;
    maps_l: number | null;
    hp_maps: number | null;
    snd_maps: number | null;
    ovl_maps: number | null;
  };

/**
 * Per-event stat breakdowns for one player, from player_event_stats - only
 * covers events with bo7_stats data (9 of ~18 tracked events, see PROJECT.md
 * §7), and only where that specific player was resolvable in the seed
 * script. Callers should expect gaps and show a clear "no stats" message
 * rather than treating a miss as an error.
 *
 * Each ranked stat (RANKED_FIELDS) is ranked against every OTHER player who
 * has a row for that same event - i.e. "how this player did at this specific
 * event compared to everyone else who played it," not a season-wide rank.
 */
export async function getPlayerEventStatsSummaries(
  playerName: string
): Promise<Map<string, EventStatsSummary>> {
  const { data, error } = await supabase
    .from('player_event_stats')
    .select(
      `player_name, matches_total, matches_w, matches_l, maps_total, maps_w, maps_l, hp_maps, snd_maps, ovl_maps, ${RANKED_FIELDS.join(', ')}, events(name, region)`
    );

  if (error) throw error;

  const rows = (data ?? []) as unknown as FullPlayerEventStatsRow[];

  const byEvent = new Map<string, FullPlayerEventStatsRow[]>();
  for (const row of rows) {
    if (!row.events) continue;
    const key = `${row.events.name}|${row.events.region}`;
    if (!byEvent.has(key)) byEvent.set(key, []);
    byEvent.get(key)!.push(row);
  }

  const result = new Map<string, EventStatsSummary>();

  for (const [key, eventRows] of byEvent) {
    const target = eventRows.find((r) => r.player_name === playerName);
    if (!target) continue;

    function rankOf(field: RankedField): RankedStat {
      const value = target![field];
      if (value === null) return { value: null, rank: null };
      const sorted = eventRows
        .map((r) => r[field])
        .filter((v): v is number => v !== null)
        .sort((a, b) => b - a);
      return { value, rank: sorted.indexOf(value) + 1 };
    }

    result.set(key, {
      matchesTotal: target.matches_total,
      matchesW: target.matches_w,
      matchesL: target.matches_l,
      mapsTotal: target.maps_total,
      mapsW: target.maps_w,
      mapsL: target.maps_l,

      overallKd: rankOf('overall_kd'),
      overallKad: rankOf('overall_kad'),
      overallSlayerRating: rankOf('overall_slayer_rating'),
      overallDamageRating: rankOf('overall_damage_rating'),

      hpMaps: target.hp_maps,
      hpKd: rankOf('hp_kd'),
      hpHillTimePer10: rankOf('hp_hill_time_per_10'),
      hpKPer10: rankOf('hp_k_per_10'),
      hpDmgPer10: rankOf('hp_dmg_per_10'),

      sndMaps: target.snd_maps,
      sndKd: rankOf('snd_kd'),
      sndOpeningDuelWinPct: rankOf('snd_opening_duel_win_pct'),
      sndKPerR: rankOf('snd_k_per_r'),
      sndDmgPerR: rankOf('snd_dmg_per_r'),

      ovlMaps: target.ovl_maps,
      ovlKd: rankOf('ovl_kd'),
      ovlGoalsPer10: rankOf('ovl_goals_per_10'),
      ovlKPer10: rankOf('ovl_k_per_10'),
      ovlDmgPer10: rankOf('ovl_dmg_per_10'),
    });
  }

  return result;
}

export type RecentEventGroup = {
  eventName: string;
  region: string;
  eventDate: string | null;
  topPlacements: { teamName: string; placementMin: number; placementMax: number }[];
};

/**
 * The most recent event date on record, split into one group per (event,
 * region) pair that shares that date - e.g. a Cup's NA and EU brackets run
 * the same day but are two separate groups here, each with its own top 3.
 * Powers the home page's "Recent Results" spotlight.
 */
export async function getRecentEvents(placements?: EnrichedPlacement[]): Promise<RecentEventGroup[]> {
  const rows = placements ?? (await getEnrichedPlacements());
  const dated = rows.filter((r): r is EnrichedPlacement & { eventDate: string } => Boolean(r.eventDate));
  if (!dated.length) return [];

  const maxDate = dated.reduce((max, r) => (r.eventDate > max ? r.eventDate : max), dated[0].eventDate);
  const latestRows = dated.filter((r) => r.eventDate === maxDate);

  const groups = new Map<string, RecentEventGroup>();
  for (const row of latestRows) {
    const key = `${row.eventName}|${row.region}`;
    if (!groups.has(key)) {
      groups.set(key, { eventName: row.eventName, region: row.region, eventDate: row.eventDate, topPlacements: [] });
    }
    groups.get(key)!.topPlacements.push({
      teamName: row.teamName,
      placementMin: row.placementMin,
      placementMax: row.placementMax,
    });
  }

  return [...groups.values()]
    .map((g) => ({ ...g, topPlacements: g.topPlacements.sort((a, b) => a.placementMin - b.placementMin).slice(0, 3) }))
    .sort((a, b) => a.eventName.localeCompare(b.eventName));
}

export type LanResultGroup = {
  eventName: string;
  eventDate: string | null;
  topPlacements: { teamName: string; placementMin: number; placementMax: number }[];
};

/**
 * Top 3 for every LAN this season - the four Major/Opens (Dallas/Birmingham/
 * Atlanta/Paris) plus Champs Finals - one group per event, most recent first
 * (Champs, Major 4, Major 3, Major 2, Major 1 - confirmed 2026-09-01; Champs'
 * real event date is later than Paris/Major 4, so this is also just
 * chronological-descending, not a special-cased order). Unlike
 * getRecentEvents above, this isn't scoped to the single latest date; it's a
 * season-long recap. Powers the home page's "LAN Results" box.
 */
export async function getLanResults(placements?: EnrichedPlacement[]): Promise<LanResultGroup[]> {
  const rows = placements ?? (await getEnrichedPlacements());
  const majors = rows.filter((r) => r.eventType === 'Major' || r.eventType === 'Champs');

  const groups = new Map<string, LanResultGroup>();
  for (const row of majors) {
    if (!groups.has(row.eventName)) {
      groups.set(row.eventName, { eventName: row.eventName, eventDate: row.eventDate, topPlacements: [] });
    }
    groups.get(row.eventName)!.topPlacements.push({
      teamName: row.teamName,
      placementMin: row.placementMin,
      placementMax: row.placementMax,
    });
  }

  return [...groups.values()]
    .map((g) => ({ ...g, topPlacements: g.topPlacements.sort((a, b) => a.placementMin - b.placementMin).slice(0, 3) }))
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));
}

/** Team name -> logo filename, for rendering a small badge next to a team name in a table. */
export async function getTeamLogos(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('teams').select('name, logo_filename');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((t) => [t.name, t.logo_filename]));
}

export type PlayerDetails = {
  fullName: string | null;
  origin: string | null;
  birthday: string | null;
  photoFilename: string | null;
  twitterUrl: string | null;
  twitchUrl: string | null;
  cdlPlayer: boolean;
};

/**
 * Every player's bio/photo details, keyed by lowercased gamertag for
 * case-insensitive lookup (a handful of gamertags differ in case from their
 * placings.csv spelling, e.g. "Knox" vs "KnoX" - see PROJECT.md §8j). The
 * `players` table is small (~150 rows) so this is fetched in full - shared by
 * every page that needs to look up more than one player's details (team
 * rosters, flags on a leaderboard) instead of each doing its own filtered
 * query.
 */
export async function getAllPlayerDetails(): Promise<Map<string, PlayerDetails>> {
  const { data, error } = await supabase
    .from('players')
    .select('gamertag, full_name, origin, birthday, photo_filename, twitter_url, twitch_url, cdl_player');
  if (error) throw error;
  const map = new Map<string, PlayerDetails>();
  for (const row of data ?? []) {
    map.set(row.gamertag.toLowerCase(), {
      fullName: row.full_name,
      origin: row.origin,
      birthday: row.birthday,
      photoFilename: row.photo_filename,
      twitterUrl: row.twitter_url,
      twitchUrl: row.twitch_url,
      cdlPlayer: row.cdl_player ?? false,
    });
  }
  return map;
}

/** Single-player convenience wrapper around getAllPlayerDetails() - see there for lookup details. */
export async function getPlayerDetails(playerName: string): Promise<PlayerDetails | null> {
  const all = await getAllPlayerDetails();
  return all.get(playerName.toLowerCase()) ?? null;
}

/**
 * Every team/player name currently shown on the site (i.e. already scoped by
 * getEnrichedPlacements' AP/LATAM and ad-hoc-squad filters), for the header
 * search box. Small dataset (a few hundred entries at most) - fetched once
 * per page load and filtered client-side rather than querying per keystroke.
 */
export async function getSearchIndex(): Promise<{ teams: string[]; players: string[] }> {
  const { teamStandings, playerStandings } = await computeStandings();
  return {
    teams: teamStandings.map((t) => t.name),
    players: playerStandings.map((p) => p.name),
  };
}
