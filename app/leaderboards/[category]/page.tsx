import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStatLeaderboards, STAT_CATEGORIES, type StatCategorySlug } from '@/lib/statLeaderboards';
import LeaderboardTable from '@/components/LeaderboardTable';

export const dynamic = 'force-dynamic';

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
  // formatValue is called here (server-side) rather than passed down, since
  // functions can't cross the Server->Client boundary into LeaderboardTable.
  const rows = results[resultKey].map((e, i) => ({ ...e, rank: i + 1, formattedValue: formatValue(e.value) }));

  return (
    <main className="container">
      <Link className="back-link" href="/">
        &larr; Back to home
      </Link>
      <div className="page-hero">
        <h1>{title} — Full Leaderboard</h1>
        <p className="note">
          Sourced from the stats provider&apos;s full-season totals per player. Players must have at
          least 15 matches played to be eligible.
        </p>
      </div>
      <div className="card">
        <LeaderboardTable rows={rows} valueLabel={title} />
      </div>
    </main>
  );
}
