'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PlayerStanding } from '@/lib/standings';
import { FlagIcon } from './FlagIcon';
import SortableTable, { type Column } from './SortableTable';
import { TeamBadge } from './TeamBadge';

type Row = PlayerStanding & {
  rank: number;
  kd: number | null;
  slayerRating: number | null;
  nonTradedKillPct: number | null;
  matchesTotal: number | null;
};

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
      render: (r) => (
        <Link href={`/players/${encodeURIComponent(r.name)}`}>
          <FlagIcon origin={origins?.[r.name.toLowerCase()]} />
          {r.name}
        </Link>
      ),
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
    {
      key: 'kd',
      label: 'K/D',
      sortValue: (r) => r.kd ?? -1,
      render: (r) => (r.kd != null ? r.kd.toFixed(2) : '—'),
      align: 'right',
    },
    {
      key: 'slayerRating',
      label: 'Slayer Rating',
      sortValue: (r) => r.slayerRating ?? -1,
      render: (r) => (r.slayerRating != null ? r.slayerRating.toFixed(2) : '—'),
      align: 'right',
    },
    {
      key: 'nonTradedKillPct',
      label: 'Non-Traded Kill %',
      sortValue: (r) => r.nonTradedKillPct ?? -1,
      render: (r) => (r.nonTradedKillPct != null ? `${r.nonTradedKillPct.toFixed(0)}%` : '—'),
      align: 'right',
    },
    {
      key: 'matchesTotal',
      label: 'Matches Played',
      sortValue: (r) => r.matchesTotal ?? -1,
      render: (r) => r.matchesTotal ?? '—',
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
