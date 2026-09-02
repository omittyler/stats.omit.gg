import { supabase } from './supabase';

// Major/Open and Champs are LAN events; Cup and Elite are online matches -
// see data/reference/match_format_rules.md (provided by the user 2026-09-02).
const LAN_EVENT_TYPES = new Set(['Major', 'Champs']);

export function isLanEvent(eventType: string): boolean {
  return LAN_EVENT_TYPES.has(eventType);
}

// Event logos supplied 2026-08-26 (public/events/) only ever covered the 4
// Majors - no Cup/Elite/Champs logos exist. getEventLogo returns null for
// anything else so callers can fall back to the plain event-name text,
// same "don't fabricate a missing asset" pattern as team/player fallbacks.
const EVENT_LOGOS: Record<string, string> = {
  '2026 Major 1 - Dallas Open': '2026DallasMajor1.png',
  '2026 Major 2 - Birmingham Open': '2026BirminghamMajor2.png',
  '2026 Major 3 - Atlanta Open': '2026AtlantaMajor3.png',
  '2026 Major 4 - Paris Open': '2026ParisMajor4.png',
};

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
  events: { name: string; event_date: string | null } | null;
  match_maps: { team1_score: number; team2_score: number }[];
};

/**
 * Every match a team has played, grouped by event on the team page (matching
 * the reference layout the user provided 2026-09-02) - each with the maps-won
 * series score (e.g. 3-1), not the raw in-map points/rounds those individual
 * match_maps rows store. Sorted newest-event-first, then by series number
 * within an event (series labels are already sequential, see
 * scripts/seed/lib/matchSeriesRanges.js).
 */
export async function getTeamMatches(teamName: string): Promise<TeamMatchSummary[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('series_label, team1_name, team2_name, events(name, event_date), match_maps(team1_score, team2_score)')
    .or(`team1_name.eq.${teamName},team2_name.eq.${teamName}`);
  if (error) throw error;

  const rows = (data ?? []) as unknown as TeamMatchRow[];

  return rows
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
export async function getMatchDetail(seriesLabel: string): Promise<MatchDetail | null> {
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
