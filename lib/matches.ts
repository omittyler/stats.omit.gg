import { supabase } from './supabase';
import { cached } from './cache';
import { CURRENT_GAME } from './season';

// Major/Open and Champs are LAN events; Cup and Elite are online matches -
// see data/reference/match_format_rules.md (provided by the user 2026-09-02).
const LAN_EVENT_TYPES = new Set(['Major', 'Champs']);

export function isLanEvent(eventType: string): boolean {
  return LAN_EVENT_TYPES.has(eventType);
}

// Event logos supplied 2026-08-26 (public/events/) originally only covered
// the 4 Majors; a Champs logo landed 2026-09-02 (2026Champs.png), followed
// same day by logos for every Cup and Elite stage. getEventLogo returns null
// for anything not in this map so callers fall back to the plain event-name
// text, same "don't fabricate a missing asset" pattern as team/player
// fallbacks - e.g. the supplied Cup14/EliteStage5 files have no matching
// event in the DB (only Cup 1-13 and Elite Stage 1-4 exist) and are simply
// unused, not force-mapped to something.
const EVENT_LOGOS: Record<string, string> = {
  '2026 Major 1 - Dallas Open': '2026DallasMajor1.png',
  '2026 Major 2 - Birmingham Open': '2026BirminghamMajor2.png',
  '2026 Major 3 - Atlanta Open': '2026AtlantaMajor3.png',
  '2026 Major 4 - Paris Open': '2026ParisMajor4.png',
  '2026 Champs - Challengers Finals': '2026Champs.png',
};

for (let cup = 1; cup <= 13; cup++) {
  EVENT_LOGOS[`2026 Cup ${cup}`] = `Cup${cup}.png`;
}

// Elite embeds region in the event name itself (unlike Cup, which stays one
// name across regions with a separate region column - see
// scripts/seed/lib/matchSeriesRanges.js) - both region rows for a given
// stage share the same stage logo, there's no separate NA/EU artwork.
for (let stage = 1; stage <= 4; stage++) {
  EVENT_LOGOS[`2026 NA Elite Stage ${stage}`] = `EliteStage${stage}.png`;
  EVENT_LOGOS[`2026 EU Elite Stage ${stage}`] = `EliteStage${stage}.png`;
}

export function getEventLogo(eventName: string): string | null {
  return EVENT_LOGOS[eventName] ?? null;
}

// Map thumbnails supplied 2026-09-02 (public/maps/) cover the 9 maps in the
// official pool (data/reference/match_format_rules.md). "Blackheart" and
// "Plaza" appear in the seeded match_maps data but aren't in that pool and
// have no thumbnail - getMapThumbnail returns null for those, same
// no-fabricated-asset fallback as getEventLogo above.
const MAP_THUMBNAILS = new Set([
  'colossus',
  'den',
  'exposure',
  'fringe',
  'gridlock',
  'hacienda',
  'raid',
  'sake',
  'scar',
]);

export function getMapThumbnail(mapName: string): string | null {
  const key = mapName.toLowerCase();
  return MAP_THUMBNAILS.has(key) ? `${key}.webp` : null;
}

export type RecentMatch = {
  seriesLabel: string;
  eventName: string;
  eventDate: string | null;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
};

type RecentMatchRow = {
  series_label: string;
  team1_name: string;
  team2_name: string;
  events: { name: string; event_date: string | null } | null;
  match_maps: { team1_score: number; team2_score: number }[];
};

/**
 * Most recent matches sitewide, for the banner shown on every page. This is
 * fixed historical season data, not a live feed, so "most recent" means
 * latest event (by event_date) then highest series number within that event
 * - series labels are zero-padded (e.g. "SR001"/"SR573") so a plain
 * descending text sort on series_label already matches numeric order.
 */
async function getRecentMatchesUncached(limit: number): Promise<RecentMatch[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('series_label, team1_name, team2_name, events(name, event_date), match_maps(team1_score, team2_score)')
    .order('event_date', { referencedTable: 'events', ascending: false })
    .order('series_label', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as unknown as RecentMatchRow[];

  return rows.map((m) => ({
    seriesLabel: m.series_label,
    eventName: m.events?.name ?? '',
    eventDate: m.events?.event_date ?? null,
    team1Name: m.team1_name,
    team2Name: m.team2_name,
    team1Score: m.match_maps.filter((mm) => mm.team1_score > mm.team2_score).length,
    team2Score: m.match_maps.filter((mm) => mm.team2_score > mm.team1_score).length,
  }));
}

export type MatchListEntry = RecentMatch & { game: string; region: string };

type MatchListRow = {
  series_label: string;
  team1_name: string;
  team2_name: string;
  events: { name: string; event_date: string | null; game: string; region: string } | null;
  match_maps: { team1_score: number; team2_score: number }[];
};

/**
 * Every match sitewide (not capped, unlike getRecentMatches above), for the
 * full /matches list page - newest event first, then highest series number
 * within it, same convention as getRecentMatches. Includes `game` so the
 * page can filter by season (Black Ops 7 today; Modern Warfare 4 has no
 * data yet - PROJECT.md §2 - so filtering to it correctly shows nothing
 * rather than needing separate handling). Includes `region` because
 * `eventName` alone is NOT a unique event key: Cup events share one name
 * across regions with region as a separate column (unlike Elite, which
 * embeds region in the name itself) - callers must group by
 * `eventName + region` together, same pattern already used in
 * PlayerEventsTable.tsx's `${eventName}|${region}` stats lookup key.
 */
async function getAllMatchesUncached(): Promise<MatchListEntry[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'series_label, team1_name, team2_name, events(name, event_date, game, region), match_maps(team1_score, team2_score)'
    )
    .order('event_date', { referencedTable: 'events', ascending: false })
    .order('series_label', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as MatchListRow[];

  return rows.map((m) => ({
    seriesLabel: m.series_label,
    eventName: m.events?.name ?? '',
    eventDate: m.events?.event_date ?? null,
    game: m.events?.game ?? 'Black Ops 7',
    region: m.events?.region ?? '',
    team1Name: m.team1_name,
    team2Name: m.team2_name,
    team1Score: m.match_maps.filter((mm) => mm.team1_score > mm.team2_score).length,
    team2Score: m.match_maps.filter((mm) => mm.team2_score > mm.team1_score).length,
  }));
}

export type TeamMatchSummary = {
  seriesLabel: string;
  eventName: string;
  eventDate: string | null;
  opponent: string;
  mapsWon: number;
  mapsLost: number;
};

type TeamMatchRow = {
  series_label: string;
  team1_name: string;
  team2_name: string;
  events: { name: string; event_date: string | null; game: string } | null;
  match_maps: { team1_score: number; team2_score: number }[];
};

/**
 * Every match a team has played THIS SEASON (defaults to the site's current
 * game, lib/season.ts), grouped by event on the team page (matching the
 * reference layout the user provided 2026-09-02) - each with the maps-won
 * series score (e.g. 3-1), not the raw in-map points/rounds those individual
 * match_maps rows store. Sorted newest-event-first, then by series number
 * within an event (series labels are already sequential, see
 * scripts/seed/lib/matchSeriesRanges.js).
 */
async function getTeamMatchesUncached(teamName: string, game: string = CURRENT_GAME): Promise<TeamMatchSummary[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('series_label, team1_name, team2_name, events(name, event_date, game), match_maps(team1_score, team2_score)')
    .or(`team1_name.eq.${teamName},team2_name.eq.${teamName}`);
  if (error) throw error;

  const rows = (data ?? []) as unknown as TeamMatchRow[];

  return rows
    .filter((m) => m.events?.game === game)
    .map((m) => {
      const isTeam1 = m.team1_name === teamName;
      const mapsWon = m.match_maps.filter((mm) =>
        isTeam1 ? mm.team1_score > mm.team2_score : mm.team2_score > mm.team1_score
      ).length;
      const mapsLost = m.match_maps.filter((mm) =>
        isTeam1 ? mm.team2_score > mm.team1_score : mm.team1_score > mm.team2_score
      ).length;
      return {
        seriesLabel: m.series_label,
        eventName: m.events?.name ?? '',
        eventDate: m.events?.event_date ?? null,
        opponent: isTeam1 ? m.team2_name : m.team1_name,
        mapsWon,
        mapsLost,
      };
    })
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? '') || b.seriesLabel.localeCompare(a.seriesLabel));
}

type PlayerMatchMapRow = {
  team_name: string;
  match_maps: {
    match_id: number;
    team1_score: number;
    team2_score: number;
    matches: {
      series_label: string;
      team1_name: string;
      team2_name: string;
      events: { name: string; event_date: string | null; game: string } | null;
    } | null;
  } | null;
};

/**
 * A single player's most recent matches THIS SEASON (defaults to the site's
 * current game, lib/season.ts), for the "Latest Matches" tab on their player
 * page (PROJECT.md §9 - deliberately not built with the rest of the Match
 * page since matches are a team-vs-team concept; built now on request).
 * Driven from match_map_player_stats rather than `matches` (unlike
 * getTeamMatches above) since that's the only table that knows which
 * specific matches THIS player appears in - one row per map they played, so
 * grouping those by match_id also gives an accurate per-series maps-won
 * count without a second query. Same newest-event-then-highest-series
 * ordering convention as getRecentMatches.
 */
async function getPlayerMatchesUncached(
  playerName: string,
  limit: number,
  game: string = CURRENT_GAME
): Promise<TeamMatchSummary[]> {
  const { data, error } = await supabase
    .from('match_map_player_stats')
    .select(
      'team_name, match_maps(match_id, team1_score, team2_score, matches(series_label, team1_name, team2_name, events(name, event_date, game)))'
    )
    .eq('player_name', playerName);
  if (error) throw error;

  const rows = (data ?? []) as unknown as PlayerMatchMapRow[];

  const byMatch = new Map<
    number,
    { seriesLabel: string; eventName: string; eventDate: string | null; opponent: string; mapsWon: number; mapsLost: number }
  >();

  for (const row of rows) {
    const mm = row.match_maps;
    const match = mm?.matches;
    if (!mm || !match || match.events?.game !== game) continue;

    const isTeam1 = row.team_name === match.team1_name;
    const won = isTeam1 ? mm.team1_score > mm.team2_score : mm.team2_score > mm.team1_score;
    const lost = isTeam1 ? mm.team2_score > mm.team1_score : mm.team1_score > mm.team2_score;

    const existing = byMatch.get(mm.match_id);
    if (existing) {
      existing.mapsWon += won ? 1 : 0;
      existing.mapsLost += lost ? 1 : 0;
    } else {
      byMatch.set(mm.match_id, {
        seriesLabel: match.series_label,
        eventName: match.events?.name ?? '',
        eventDate: match.events?.event_date ?? null,
        opponent: isTeam1 ? match.team2_name : match.team1_name,
        mapsWon: won ? 1 : 0,
        mapsLost: lost ? 1 : 0,
      });
    }
  }

  return [...byMatch.values()]
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? '') || b.seriesLabel.localeCompare(a.seriesLabel))
    .slice(0, limit);
}

export type MatchMapPlayerStat = {
  playerName: string;
  teamName: string;
  k: number | null;
  d: number | null;
  a: number | null;
  nonTradedKills: number | null;
  headshots: number | null;
  damage: number | null;
  hillTime: number | null;
  objectiveKills: number | null;
  contest: number | null;
  plants: number | null;
  defuses: number | null;
  firstBloods: number | null;
  firstDeaths: number | null;
  rounds: number | null;
  goals: number | null;
  time: number | null;
};

export type MatchMapDetail = {
  mode: string;
  mapName: string;
  mapNumber: number;
  team1Score: number;
  team2Score: number;
  players: MatchMapPlayerStat[];
};

export type MatchDetail = {
  seriesLabel: string;
  eventName: string;
  eventDate: string | null;
  eventType: string;
  team1Name: string;
  team2Name: string;
  maps: MatchMapDetail[];
};

type MatchDetailRow = {
  series_label: string;
  team1_name: string;
  team2_name: string;
  events: { name: string; event_date: string | null; type: string } | null;
  match_maps: {
    mode: string;
    map_name: string;
    map_number: number;
    team1_score: number;
    team2_score: number;
    match_map_player_stats: {
      player_name: string;
      team_name: string;
      k: number | null;
      d: number | null;
      a: number | null;
      non_traded_kills: number | null;
      headshots: number | null;
      damage: number | null;
      hill_time: number | null;
      objective_kills: number | null;
      contest: number | null;
      plants: number | null;
      defuses: number | null;
      first_bloods: number | null;
      first_deaths: number | null;
      rounds: number | null;
      goals: number | null;
      time: number | null;
    }[];
  }[];
};

/** Full detail for one match (series), map-by-map with every player's stats per map. */
async function getMatchDetailUncached(seriesLabel: string): Promise<MatchDetail | null> {
  const { data, error } = await supabase
    .from('matches')
    .select(
      `series_label, team1_name, team2_name, events(name, event_date, type),
       match_maps(mode, map_name, map_number, team1_score, team2_score,
         match_map_player_stats(player_name, team_name, k, d, a, non_traded_kills, headshots, damage,
           hill_time, objective_kills, contest, plants, defuses, first_bloods, first_deaths, rounds, goals, time))`
    )
    .eq('series_label', seriesLabel)
    .maybeSingle();
  if (error) throw error;
  const row = data as unknown as MatchDetailRow | null;
  if (!row) return null;

  return {
    seriesLabel: row.series_label,
    eventName: row.events?.name ?? '',
    eventDate: row.events?.event_date ?? null,
    eventType: row.events?.type ?? '',
    team1Name: row.team1_name,
    team2Name: row.team2_name,
    maps: [...row.match_maps]
      .sort((a, b) => a.map_number - b.map_number)
      .map((mm) => ({
        mode: mm.mode,
        mapName: mm.map_name,
        mapNumber: mm.map_number,
        team1Score: mm.team1_score,
        team2Score: mm.team2_score,
        players: mm.match_map_player_stats.map((p) => ({
          playerName: p.player_name,
          teamName: p.team_name,
          k: p.k,
          d: p.d,
          a: p.a,
          nonTradedKills: p.non_traded_kills,
          headshots: p.headshots,
          damage: p.damage,
          hillTime: p.hill_time,
          objectiveKills: p.objective_kills,
          contest: p.contest,
          plants: p.plants,
          defuses: p.defuses,
          firstBloods: p.first_bloods,
          firstDeaths: p.first_deaths,
          rounds: p.rounds,
          goals: p.goals,
          time: p.time,
        })),
      })),
  };
}
export const getRecentMatches = cached('getRecentMatches', getRecentMatchesUncached);
export const getAllMatches = cached('getAllMatches', getAllMatchesUncached);
export const getTeamMatches = cached('getTeamMatches', getTeamMatchesUncached);
export const getPlayerMatches = cached('getPlayerMatches', getPlayerMatchesUncached);
export const getMatchDetail = cached('getMatchDetail', getMatchDetailUncached);
