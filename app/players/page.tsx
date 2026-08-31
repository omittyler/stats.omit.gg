import Link from 'next/link';
import { computeStandings, getTeamLogos, type PlayerStanding } from '@/lib/standings';
import { TeamBadge } from '@/components/TeamBadge';
import SortableTable, { type Column } from '@/components/SortableTable';

// See app/standings/page.tsx - same reason: avoid Next.js caching this fetch
// and showing stale numbers after the underlying data changes.
export const dynamic = 'force-dynamic';

type Row = PlayerStanding & { rank: number };

export default async function PlayersPage() {
  const [{ playerStandings }, logos] = await Promise.all([computeStandings(), getTeamLogos()]);

  const rows: Row[] = playerStandings.map((p, i) => ({ ...p, rank: i + 1 }));

  const columns: Column<Row>[] = [
    { key: 'rank', label: 'Rank', render: (r) => r.rank, align: 'right' },
    {
      key: 'player',
      label: 'Player',
      sortValue: (r) => r.name,
      render: (r) => <Link href={`/players/${encodeURIComponent(r.name)}`}>{r.name}</Link>,
    },
    {
      key: 'currentTeam',
      label: 'Current Team',
      sortValue: (r) => r.currentTeam,
      render: (r) => <TeamBadge name={r.currentTeam} logoFilename={logos[r.currentTeam]} />,
    },
    { key: 'points', label: 'Points', sortValue: (r) => r.points, render: (r) => r.points.toLocaleString(), align: 'right' },
  ];

  return (
    <main className="container">
      <h1>Black Ops 7 (BO7) Player Points</h1>
      <p className="note">
        Sum of CDC points earned across every Black Ops 7 (BO7) event, attributed to the player (full placement
        points each roster player, not split). &ldquo;Current Team&rdquo; is that player&apos;s most
        recent event by date. See <Link href="/standings">team standings</Link>, which are built from
        these totals.
      </p>
      <div className="card">
        <SortableTable columns={columns} rows={rows} initialSortKey="points" />
      </div>
    </main>
  );
}
