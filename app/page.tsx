import Link from 'next/link';
import {
  getStatLeaderboards,
  STAT_CATEGORIES,
  type StatCategorySlug,
  type StatLeaderboardEntry,
} from '@/lib/statLeaderboards';
import { getRecentEvents, getAllPlayerDetails } from '@/lib/standings';
import { formatPlacementOrdinal } from '@/lib/format';
import { flagForOrigin } from '@/lib/countryFlags';

export const dynamic = 'force-dynamic';

function StatBox({
  slug,
  title,
  entries,
  formatValue,
  origins,
}: {
  slug: StatCategorySlug;
  title: string;
  entries: StatLeaderboardEntry[];
  formatValue: (value: number) => string;
  origins: Record<string, string>;
}) {
  return (
    <div className="card stat-box">
      <h3>{title}</h3>
      {entries.length ? (
        <ol>
          {entries.map((entry) => {
            const flag = flagForOrigin(origins[entry.playerName.toLowerCase()]);
            return (
              <li key={entry.playerName}>
                <Link href={`/players/${encodeURIComponent(entry.playerName)}`}>
                  {flag && <span style={{ marginRight: 6 }}>{flag}</span>}
                  {entry.playerName}
                </Link>
                <span className="stat-value">{formatValue(entry.value)}</span>
              </li>
            );
          })}
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
  const recentEvents = await getRecentEvents();
  const playerDetails = await getAllPlayerDetails();
  const origins = Object.fromEntries([...playerDetails].map(([name, d]) => [name, d.origin ?? '']));

  return (
    <main className="container">
      <div className="page-hero">
        <h1>stats.omit.gg</h1>
        <p className="note">Call of Duty Challengers stats hub — early build.</p>
        <div className="page-hero-links">
          <Link href="/standings">Team Standings &rarr;</Link>
          <Link href="/players">Player Points &rarr;</Link>
          <Link href="/teams">Browse Teams &rarr;</Link>
        </div>
      </div>

      {recentEvents.length > 0 && (
        <>
          <h2>Recent Results</h2>
          <div className="recent-events-grid">
            {recentEvents.map((group) => (
              <div className="recent-event-card" key={`${group.eventName}|${group.region}`}>
                <h3>{group.eventName}</h3>
                {group.region && <span className="region-tag">{group.region}</span>}
                <ol>
                  {group.topPlacements.map((p, i) => (
                    <li key={i}>
                      <span className="placement">
                        {formatPlacementOrdinal(p.placementMin, p.placementMax)}
                      </span>
                      <Link href={`/teams/${encodeURIComponent(p.teamName)}`}>{p.teamName}</Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Top 5 — Black Ops 7 (BO7)</h2>
      <p className="note">
        Sourced directly from the stats provider&apos;s own full-season totals per player (not summed
        by us from individual events). Players must have at least 15 matches played to be eligible
        for any leaderboard here.
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
              origins={origins}
            />
          )
        )}
      </div>
    </main>
  );
}
