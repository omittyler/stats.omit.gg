import Link from 'next/link';
import { getStatLeaderboards, type StatLeaderboardEntry } from '@/lib/statLeaderboards';

export const dynamic = 'force-dynamic';

function StatBox({
  title,
  entries,
  formatValue,
}: {
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
    </div>
  );
}

export default async function HomePage() {
  const { kd, slayerRating, damage, hpKd, sndKd, ovlKd } = await getStatLeaderboards();

  return (
    <main className="container">
      <h1>stats.omit.gg</h1>
      <p className="note">Call of Duty Challengers stats hub — early build.</p>
      <p>
        <Link href="/standings">View 2026 Season Team Standings &rarr;</Link>
        {' · '}
        <Link href="/players">View 2026 Season Player Points &rarr;</Link>
        {' · '}
        <Link href="/teams">Browse Teams &rarr;</Link>
      </p>

      <h2>Top 5 — 2026 Season</h2>
      <p className="note">
        Sourced directly from the stats provider&apos;s own full-season totals per player (not summed
        by us from individual events). K/D and Slayer Rating require at least 2 matches played to
        appear here, so one great match can&apos;t top the list on its own.
      </p>
      <div className="stat-grid">
        <StatBox title="K/D Ratio" entries={kd} formatValue={(v) => v.toFixed(2)} />
        <StatBox title="Slayer Rating" entries={slayerRating} formatValue={(v) => v.toFixed(2)} />
        <StatBox title="Damage" entries={damage} formatValue={(v) => v.toLocaleString()} />
        <StatBox title="Hardpoint K/D" entries={hpKd} formatValue={(v) => v.toFixed(2)} />
        <StatBox title="Search & Destroy K/D" entries={sndKd} formatValue={(v) => v.toFixed(2)} />
        <StatBox title="Overload K/D" entries={ovlKd} formatValue={(v) => v.toFixed(2)} />
      </div>
    </main>
  );
}
