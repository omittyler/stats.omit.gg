import { supabase } from '@/lib/supabase';

type PointsScaleRow = {
  event_type: string;
  placement_min: number;
  placement_max: number;
  cdc_points: number;
};

type PlacementRow = {
  placement_min: number;
  placement_max: number;
  team_id: number;
  teams: { name: string; logo_filename: string } | null;
  events: { type: string; season: number } | null;
};

export default async function StandingsPage() {
  const [{ data: placements, error: placementsError }, { data: scale, error: scaleError }] =
    await Promise.all([
      supabase
        .from('event_placements')
        .select('placement_min, placement_max, team_id, teams(name, logo_filename), events(type, season)'),
      supabase.from('points_scale').select('event_type, placement_min, placement_max, cdc_points'),
    ]);

  if (placementsError || scaleError) {
    return (
      <main style={{ padding: 32 }}>
        <p>Error loading standings: {placementsError?.message ?? scaleError?.message}</p>
      </main>
    );
  }

  const scaleRows = (scale ?? []) as PointsScaleRow[];
  const rows = (placements ?? []) as unknown as PlacementRow[];

  function lookupPoints(eventType: string, min: number, max: number) {
    const exact = scaleRows.find(
      (s) => s.event_type === eventType && s.placement_min === min && s.placement_max === max
    );
    return exact ? exact.cdc_points : 0;
  }

  const totals = new Map<number, { name: string; points: number }>();

  for (const row of rows) {
    if (!row.teams || !row.events) continue;
    const points = lookupPoints(row.events.type, row.placement_min, row.placement_max);
    const existing = totals.get(row.team_id);
    if (existing) {
      existing.points += points;
    } else {
      totals.set(row.team_id, { name: row.teams.name, points });
    }
  }

  const standings = [...totals.values()].sort((a, b) => b.points - a.points);

  return (
    <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <h1>2026 Season Standings</h1>
      <p style={{ color: '#9aa0ac', fontSize: '0.9rem' }}>
        Aggregated CDC points across all 2026 events. A handful of Major 3 (Atlanta Open) placements
        use non-standard bracket tiers not yet mapped to the points scale, so a few teams may show 0
        points there specifically — see PROJECT.md §7.
      </p>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, i) => (
            <tr key={team.name}>
              <td>{i + 1}</td>
              <td>{team.name}</td>
              <td>{team.points.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
