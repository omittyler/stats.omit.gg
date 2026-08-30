import { supabase } from './supabase';

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

export type PlayerStanding = { name: string; points: number; currentTeam: string };
export type TeamStanding = { name: string; points: number; players: string[] };

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

  const players = new Map<string, { total: number; lastDate: string; lastTeam: string }>();

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
      } else {
        players.set(name, { total: row.points, lastDate: date, lastTeam: row.teamName });
      }
    }
  }

  const playerStandings: PlayerStanding[] = [...players.entries()]
    .map(([name, agg]) => ({ name, points: agg.total, currentTeam: agg.lastTeam }))
    .sort((a, b) => b.points - a.points);

  const teamTotals = new Map<string, { points: number; players: string[] }>();
  for (const { name, points, currentTeam } of playerStandings) {
    const existing = teamTotals.get(currentTeam);
    if (existing) {
      existing.points += points;
      existing.players.push(name);
    } else {
      teamTotals.set(currentTeam, { points, players: [name] });
    }
  }

  const teamStandings: TeamStanding[] = [...teamTotals.entries()]
    .map(([name, v]) => ({ name, points: v.points, players: v.players }))
    .sort((a, b) => b.points - a.points);

  return { playerStandings, teamStandings };
}
