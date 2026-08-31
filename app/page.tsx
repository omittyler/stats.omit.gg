import Link from 'next/link';
import {
  getStatLeaderboards,
  STAT_CATEGORIES,
  type StatCategorySlug,
  type StatLeaderboardEntry,
} from '@/lib/statLeaderboards';

export const dynamic = 'force-dynamic';

function StatBox({
  slug,
  title,
  entries,
  formatValue,
}: {
  slug: StatCategorySlug;
  title: string;
  entries: StatLeaderboardEntry[];
  formatValue: (value: number) => string;
}) {
  return (
    <div className="card stat-box">
      <h3>{title}</h3>
      {entries.length ? (
        <ol>
          {entries.map((entry) => (
            <li key={entry.playerName}>
              <Link href={`/players/${encodeURIComponent(entry.playerName)}`}>
                {entry.playerName}
              </Link>
              <span className="stat-value">{formatValue(entry.value)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="note">Not enough data yet.</p>
      )}
      <Link href={`/leaderboards/${slug}`} className="stat-box-link">
        View Full Leaderboard &rarr;
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const results = await getStatLeaderboards(5);

  return (
    <main className="container">
      <h1>stats.omit.gg</h1>
      <p className="note">Call of Duty Challengers stats hub — early build.</p>
      <p>
        <Link href="/standings">View Black Ops 7 (BO7) Team Standings &rarr;</Link>
        {' · '}
        <Link href="/players">View Black Ops 7 (BO7) Player Points &rarr;</Link>
        {' · '}
        <Link href="/teams">Browse Teams &rarr;</Link>
      </p>

      <h2>Top 5 — Black Ops 7 (BO7)</h2>
      <p className="note">
        Sourced directly from the stats provider&apos;s own full-season totals per player (not summed
        by us from individual events). K/D and Slayer Rating require at least 2 matches played to
        appear here, so one great match can&apos;t top the list on its own.
      </p>
      <div className="stat-grid">
        {(Object.entries(STAT_CATEGORIES) as [StatCategorySlug, (typeof STAT_CATEGORIES)[StatCategorySlug]][]).map(
          ([slug, { title, resultKey, formatValue }]) => (
            <StatBox
              key={slug}
              slug={slug}
              title={title}
              entries={results[resultKey]}
              formatValue={formatValue}
            />
          )
        )}
      </div>
    </main>
  );
}
