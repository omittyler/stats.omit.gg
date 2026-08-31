import Link from 'next/link';
import { computeStandings, getTeamLogos, type TeamStanding } from '@/lib/standings';
import { TeamBadge } from '@/components/TeamBadge';
import SortableTable, { type Column } from '@/components/SortableTable';

// Standings change whenever placings.csv/the DB changes (re-seeds, corrections).
// Without this, Next.js caches the underlying Supabase fetch and can keep
// showing stale numbers after a fix, even on a hard refresh.
export const dynamic = 'force-dynamic';

type Row = TeamStanding & { rank: number };

export default async function StandingsPage() {
  const [{ teamStandings }, logos] = await Promise.all([computeStandings(), getTeamLogos()]);

  // Rank is fixed to each team's actual points-based standing, computed here
  // before sorting - so it stays correct even when the table is re-sorted by
  // Team name instead of Points.
  const rows: Row[] = teamStandings.map((t, i) => ({ ...t, rank: i + 1 }));

  const columns: Column<Row>[] = [
    { key: 'rank', label: 'Rank', render: (r) => r.rank, align: 'right' },
    {
      key: 'team',
      label: 'Team',
      sortValue: (r) => r.name,
      render: (r) => <TeamBadge name={r.name} logoFilename={logos[r.name]} />,
    },
    { key: 'points', label: 'Points', sortValue: (r) => r.points, render: (r) => r.points.toLocaleString(), align: 'right' },
  ];

  return (
    <main className="container">
      <h1>Black Ops 7 (BO7) Team Standings</h1>
      <p className="note">
        A team&apos;s points are the sum of its <strong>current roster&apos;s</strong> individual point
        totals — CDC points are earned by, and travel with, the player, not the team. &ldquo;Current
        team&rdquo; is derived from each player&apos;s most recent event by date. See{' '}
        <Link href="/players">the player leaderboard</Link> for individual totals, and PROJECT.md §8d
        for a couple of known name-collision caveats.
      </p>
      <div className="card">
        <SortableTable columns={columns} rows={rows} initialSortKey="points" />
      </div>
    </main>
  );
}
