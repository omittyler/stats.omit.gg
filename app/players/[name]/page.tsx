import Link from 'next/link';
import {
  getEnrichedPlacements,
  computeStandings,
  getPlayerEventStatsSummaries,
  getTeamLogos,
} from '@/lib/standings';
import { getPlayerSeasonStats } from '@/lib/statLeaderboards';
import { formatPlacementOrdinal, formatUsd, findBestFinish } from '@/lib/format';
import PlayerEventsTable from '@/components/PlayerEventsTable';
import { StatDetail } from '@/components/StatDetail';
import { TeamBadge } from '@/components/TeamBadge';

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
  const logos = await getTeamLogos();

  // Personal share of team prize money is always a fixed quarter of the
  // team's prize for that placement (PROJECT.md §3 "Prize money"), regardless
  // of how many of the 4 roster slots actually have a name recorded - not
  // 1/(number of names present), which would overstate each player's share
  // whenever a roster is incompletely recorded.
  const totalEarnings = history.reduce((sum, h) => sum + h.prizeUsd / 4, 0);
  const bestFinish = findBestFinish(history);

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
      <p className="note" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        Current team: <TeamBadge name={standing.currentTeam} logoFilename={logos[standing.currentTeam]} />
        {' — '}Season points:{' '}
        <strong style={{ color: 'var(--text)' }}>{standing.points.toLocaleString()}</strong>
        {' — '}Season earnings (25% share of team prize):{' '}
        <strong style={{ color: 'var(--text)' }}>{formatUsd(totalEarnings)}</strong>
      </p>
      {bestFinish && (
        <p className="note">
          Best finish: <strong style={{ color: 'var(--text)' }}>{formatPlacementOrdinal(bestFinish.placementMin, bestFinish.placementMax)}</strong>{' '}
          at {bestFinish.eventName} ({bestFinish.teamName})
        </p>
      )}

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
        <PlayerEventsTable history={history} statsByEvent={statsByEvent} logos={logos} />
      </div>
    </main>
  );
}
