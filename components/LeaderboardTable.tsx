'use client';

import Link from 'next/link';
import type { StatLeaderboardEntry } from '@/lib/statLeaderboards';
import SortableTable, { type Column } from './SortableTable';

// formattedValue is computed server-side (STAT_CATEGORIES.formatValue can't
// cross the Server->Client boundary as a function prop) - sortValue still
// sorts on the raw numeric `value`, render just displays the pre-formatted string.
type Row = StatLeaderboardEntry & { rank: number; formattedValue: string };

export default function LeaderboardTable({ rows, valueLabel }: { rows: Row[]; valueLabel: string }) {
  const columns: Column<Row>[] = [
    { key: 'rank', label: 'Rank', render: (r) => r.rank, align: 'right' },
    {
      key: 'player',
      label: 'Player',
      sortValue: (r) => r.playerName,
      render: (r) => <Link href={`/players/${encodeURIComponent(r.playerName)}`}>{r.playerName}</Link>,
    },
    {
      key: 'value',
      label: valueLabel,
      sortValue: (r) => r.value,
      render: (r) => r.formattedValue,
      align: 'right',
    },
  ];

  return <SortableTable columns={columns} rows={rows} initialSortKey="value" />;
}
