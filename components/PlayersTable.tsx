'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PlayerStanding } from '@/lib/standings';
import { flagForOrigin } from '@/lib/countryFlags';
import SortableTable, { type Column } from './SortableTable';
import { TeamBadge } from './TeamBadge';

type Row = PlayerStanding & { rank: number };

export default function PlayersTable({
  rows,
  logos,
  origins,
}: {
  rows: Row[];
  logos: Record<string, string>;
  origins?: Record<string, string>;
}) {
  const [regionFilter, setRegionFilter] = useState('all');
  const regions = [...new Set(rows.map((r) => r.region || 'Other'))].sort();
  const filteredRows =
    regionFilter === 'all' ? rows : rows.filter((r) => (r.region || 'Other') === regionFilter);

  const columns: Column<Row>[] = [
    { key: 'rank', label: 'Rank', render: (r) => r.rank, align: 'right' },
    {
      key: 'player',
      label: 'Player',
      sortValue: (r) => r.name,
      render: (r) => {
        const flag = flagForOrigin(origins?.[r.name.toLowerCase()]);
        return (
          <Link href={`/players/${encodeURIComponent(r.name)}`}>
            {flag && <span style={{ marginRight: 6 }}>{flag}</span>}
            {r.name}
          </Link>
        );
      },
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
