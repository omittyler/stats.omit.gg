import { supabase } from './supabase';

type PointsScaleRow = {
  event_type: string;
  placement_min: number;
  placement_max: number;
  cdc_points: number;
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
  events: { type: string; event_date: string | null } | null;
};

export type PlayerStanding = { name: string; points: number; currentTeam: string };
export type TeamStanding = { name: string; points: number; players: string[] };

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
export async function computeStandings() {
  const [{ data: placements, error: placementsError }, { data: scale, error: scaleError }] =
    await Promise.all([
      supabase
        .from('event_placements')
        .select(
          'placement_min, placement_max, player1, player2, player3, player4, team_id, teams(name), events(type, event_date)'
        ),
      supabase.from('points_scale').select('event_type, placement_min, placement_max, cdc_points'),
    ]);

  if (placementsError) throw placementsError;
  if (scaleError) throw scaleError;

  const scaleRows = (scale ?? []) as PointsScaleRow[];
  const rows = (placements ?? []) as unknown as PlacementRow[];

  function lookupPoints(eventType: string, min: number, max: number) {
    const exact = scaleRows.find(
      (s) => s.event_type === eventType && s.placement_min === min && s.placement_max === max
    );
    return exact ? exact.cdc_points : 0;
  }

  const players = new Map<string, { total: number; lastDate: string; lastTeam: string }>();

  for (const row of rows) {
    if (!row.events || !row.teams) continue;
    const points = lookupPoints(row.events.type, row.placement_min, row.placement_max);
    const date = row.events.event_date ?? '';
    const teamName = row.teams.name;

    for (const name of [row.player1, row.player2, row.player3, row.player4]) {
      if (!name) continue;
      const existing = players.get(name);
      if (existing) {
        existing.total += points;
        if (date > existing.lastDate) {
          existing.lastDate = date;
          existing.lastTeam = teamName;
        }
      } else {
        players.set(name, { total: points, lastDate: date, lastTeam: teamName });
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
