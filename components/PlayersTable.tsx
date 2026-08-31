'use client';

import Link from 'next/link';
import type { PlayerStanding } from '@/lib/standings';
import SortableTable, { type Column } from './SortableTable';
import { TeamBadge } from './TeamBadge';

type Row = PlayerStanding & { rank: number };

export default function PlayersTable({
  rows,
  logos,
}: {
  rows: Row[];
  logos: Record<string, string>;
}) {
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
    {
      key: 'points',
      label: 'Points',
      sortValue: (r) => r.points,
      render: (r) => r.points.toLocaleString(),
      align: 'right',
    },
  ];

  return <SortableTable columns={columns} rows={rows} initialSortKey="points" />;
}
