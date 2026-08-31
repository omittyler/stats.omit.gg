import Link from 'next/link';
import { getEnrichedPlacements, computeStandings, getPlayerEventStatsSummaries } from '@/lib/standings';
import { getPlayerSeasonStats } from '@/lib/statLeaderboards';
import PlayerEventsTable from '@/components/PlayerEventsTable';
import { StatDetail } from '@/components/StatDetail';

export const dynamic = 'force-dynamic';

export default async function PlayerPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const playerName = decodeURIComponent(rawName);

  const placements = await getEnrichedPlacements();
  const { playerStandings } = await computeStandings(placements);
  const standing = playerStandings.find((p) => p.name === playerName);

  const history = placements
    .filter((p) => p.players.includes(playerName))
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));

  const statsMap = await getPlayerEventStatsSummaries(playerName);
  const statsByEvent = Object.fromEntries(statsMap);
  const seasonStats = await getPlayerSeasonStats(playerName);

  if (!standing) {
    return (
      <main className="container">
        <p>Player &ldquo;{playerName}&rdquo; not found.</p>
        <Link href="/players">&larr; Back to player points</Link>
      </main>
    );
  }

  return (
    <main className="container">
      <Link className="back-link" href="/players">
        &larr; Back to player points
      </Link>
      <h1>{playerName}</h1>
      <p className="note">
        Current team:{' '}
        <Link href={`/teams/${encodeURIComponent(standing.currentTeam)}`}>{standing.currentTeam}</Link>
        {' — '}Season points:{' '}
        <strong style={{ color: 'var(--text)' }}>{standing.points.toLocaleString()}</strong>
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Season Stats</h2>
        <p className="note">
          Ranked against every other player&apos;s Black Ops 7 (BO7) full-season totals.
        </p>
        {seasonStats ? (
          <StatDetail stats={seasonStats} />
        ) : (
          <p className="note">Currently no player statistics available.</p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Events</h2>
        <p className="note">Click an event to see this player&apos;s stats from it, if available.</p>
        <PlayerEventsTable history={history} statsByEvent={statsByEvent} />
      </div>
    </main>
  );
}
