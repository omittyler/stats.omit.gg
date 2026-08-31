'use client';

import { useState } from 'react';
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
  const [regionFilter, setRegionFilter] = useState('all');
  const regions = [...new Set(rows.map((r) => r.region || 'Other'))].sort();
  const filteredRows =
    regionFilter === 'all' ? rows : rows.filter((r) => (r.region || 'Other') === regionFilter);

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

  return (
    <div>
      {regions.length > 1 && (
        <div className="table-filter-row">
          <button className={regionFilter === 'all' ? 'active' : ''} onClick={() => setRegionFilter('all')}>
            All
          </button>
          {regions.map((r) => (
            <button key={r} className={regionFilter === r ? 'active' : ''} onClick={() => setRegionFilter(r)}>
              {r}
            </button>
          ))}
        </div>
      )}
      <SortableTable columns={columns} rows={filteredRows} initialSortKey="points" />
    </div>
  );
}
