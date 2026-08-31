'use client';

import type { TeamStanding } from '@/lib/standings';
import SortableTable, { type Column } from './SortableTable';
import { TeamBadge } from './TeamBadge';

type Row = TeamStanding & { rank: number };

export default function StandingsTable({
  rows,
  logos,
}: {
  rows: Row[];
  logos: Record<string, string>;
}) {
  const columns: Column<Row>[] = [
    { key: 'rank', label: 'Rank', render: (r) => r.rank, align: 'right' },
    {
      key: 'team',
      label: 'Team',
      sortValue: (r) => r.name,
      render: (r) => <TeamBadge name={r.name} logoFilename={logos[r.name]} />,
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
