import { computeStandings, getTeamLogos } from '@/lib/standings';
import StandingsTable from '@/components/StandingsTable';

// Standings change whenever placings.csv/the DB changes (re-seeds, corrections).
// Without this, Next.js caches the underlying Supabase fetch and can keep
// showing stale numbers after a fix, even on a hard refresh.
export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  const [{ teamStandings }, logos] = await Promise.all([computeStandings(), getTeamLogos()]);

  // Rank is fixed to each team's actual points-based standing, computed here
  // before sorting - so it stays correct even when the table is re-sorted by
  // Team name instead of Points.
  const rows = teamStandings.map((t, i) => ({ ...t, rank: i + 1 }));

  return (
    <main className="container">
      <div className="page-hero">
        <h1>Black Ops 7 (BO7) Team Standings</h1>
      </div>
      <div className="card">
        <StandingsTable rows={rows} logos={logos} />
      </div>
    </main>
  );
}
