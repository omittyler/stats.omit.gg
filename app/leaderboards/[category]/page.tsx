import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getStatLeaderboards,
  STAT_CATEGORIES,
  type StatCategorySlug,
  type StatLeaderboardEntry,
} from '@/lib/statLeaderboards';
import SortableTable, { type Column } from '@/components/SortableTable';

export const dynamic = 'force-dynamic';

type Row = StatLeaderboardEntry & { rank: number };

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  if (!(category in STAT_CATEGORIES)) {
    notFound();
  }
  const slug = category as StatCategorySlug;
  const { title, resultKey, formatValue } = STAT_CATEGORIES[slug];

  const results = await getStatLeaderboards();
  const rows: Row[] = results[resultKey].map((e, i) => ({ ...e, rank: i + 1 }));

  const columns: Column<Row>[] = [
    { key: 'rank', label: 'Rank', render: (r) => r.rank, align: 'right' },
    {
      key: 'player',
      label: 'Player',
      sortValue: (r) => r.playerName,
      render: (r) => <Link href={`/players/${encodeURIComponent(r.playerName)}`}>{r.playerName}</Link>,
    },
    { key: 'value', label: title, sortValue: (r) => r.value, render: (r) => formatValue(r.value), align: 'right' },
  ];

  return (
    <main className="container">
      <Link className="back-link" href="/">
        &larr; Back to home
      </Link>
      <h1>{title} — Full Leaderboard</h1>
      <p className="note">
        Sourced from the stats provider&apos;s full-season totals per player. Players must have at
        least 15 matches played to be eligible.
      </p>
      <div className="card">
        <SortableTable columns={columns} rows={rows} initialSortKey="value" />
      </div>
    </main>
  );
}
