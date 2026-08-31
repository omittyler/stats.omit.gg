import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStatLeaderboards, STAT_CATEGORIES, type StatCategorySlug } from '@/lib/statLeaderboards';

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
  const entries = results[resultKey];

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
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>{title}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={entry.playerName}>
                <td>{i + 1}</td>
                <td>
                  <Link href={`/players/${encodeURIComponent(entry.playerName)}`}>
                    {entry.playerName}
                  </Link>
                </td>
                <td>{formatValue(entry.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
