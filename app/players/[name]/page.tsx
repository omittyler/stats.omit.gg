import Link from 'next/link';
import {
  getEnrichedPlacements,
  computeStandings,
  getPlayerEventStatsSummaries,
  getTeamLogos,
  getPlayerDetails,
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
  const details = await getPlayerDetails(playerName);

  // Player page shows the full team prize for each event the player was on,
  // not their 25% split share - confirmed by user 2026-08-31, specifically
  // for player pages (talent-showcase framing: show the full amount they
  // were part of winning, not a divided personal cut). The underlying 25%
  // split rule (PROJECT.md §3 "Prize money") still applies wherever a
  // per-player payout actually needs computing - this display is separate.
  const totalEarnings = history.reduce((sum, h) => sum + h.prizeUsd, 0);
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
      <div className="player-hero">
        <div className="player-hero-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="player-hero-photo"
            src={`/players/${details?.photoFilename || 'DefaultPlayer.png'}`}
            alt={playerName}
            width={148}
            height={148}
          />
        </div>
        <div className="player-hero-body">
          <h1>{playerName}</h1>
          {(details?.fullName || details?.origin) && (
            <p className="player-hero-meta">
              {[details?.fullName, details?.origin].filter(Boolean).join(' — ')}
            </p>
          )}
          <div className="player-hero-team">
            <TeamBadge name={standing.currentTeam} logoFilename={logos[standing.currentTeam]} />
          </div>
          {(details?.twitterUrl || details?.twitchUrl) && (
            <div className="player-hero-links">
              {details?.twitterUrl && (
                <a href={details.twitterUrl} target="_blank" rel="noopener noreferrer">
                  𝕏 Twitter
                </a>
              )}
              {details?.twitchUrl && (
                <a href={details.twitchUrl} target="_blank" rel="noopener noreferrer">
                  ▶ Twitch
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="player-stat-row">
        <div className="player-stat-card">
          <div className="player-stat-label">Season Points</div>
          <div className="player-stat-value">{standing.points.toLocaleString()}</div>
        </div>
        <div className="player-stat-card">
          <div className="player-stat-label">Season Earnings</div>
          <div className="player-stat-value">{formatUsd(totalEarnings)}</div>
        </div>
        <div className="player-stat-card">
          <div className="player-stat-label">Best Finish</div>
          {bestFinish ? (
            <>
              <div className="player-stat-value">
                {formatPlacementOrdinal(bestFinish.placementMin, bestFinish.placementMax)}
              </div>
              <div className="player-stat-sub">
                {bestFinish.eventName} ({bestFinish.teamName})
              </div>
            </>
          ) : (
            <div className="player-stat-value">—</div>
          )}
        </div>
      </div>

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
