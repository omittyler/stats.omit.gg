import Link from 'next/link';
import {
  getEnrichedPlacements,
  computeStandings,
  getPlayerEventStatsSummaries,
  getTeamLogos,
  getPlayerDetails,
} from '@/lib/standings';
import { getPlayerSeasonStats } from '@/lib/statLeaderboards';
import { getPlayerMatches } from '@/lib/matches';
import { formatPlacementOrdinal, formatUsd, findBestFinish } from '@/lib/format';
import PlayerStatsEventsTabs from '@/components/PlayerStatsEventsTabs';
import { TeamBadge } from '@/components/TeamBadge';
import { TrendChart } from '@/components/TrendChart';
import { OFFICIAL_CDL_TEAMS } from '@/lib/officialCdlTeams';
import { GAMES, parseGameSlug } from '@/lib/season';
import { GameFilterLinks } from '@/components/GameFilterLinks';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ game?: string }>;
}) {
  const { name: rawName } = await params;
  const playerName = decodeURIComponent(rawName);
  const game = parseGameSlug((await searchParams).game);
  const { playerStandings } = await computeStandings(undefined, game);
  const standing = playerStandings.find((p) => p.name === playerName);
  if (!standing) return { title: `${playerName} — stats.omit.gg` };
  return {
    title: `${playerName} — stats.omit.gg`,
    description: `${playerName} (${standing.currentTeam}) — ${standing.points.toLocaleString()} CDC points this ${game} season.`,
  };
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ game?: string }>;
}) {
  const { name: rawName } = await params;
  const playerName = decodeURIComponent(rawName);
  const { game: gameSlug } = await searchParams;
  const game = parseGameSlug(gameSlug);
  const gameInfo = GAMES.find((g) => g.value === game)!;

  const placements = await getEnrichedPlacements(game);
  const { playerStandings } = await computeStandings(undefined, game);
  const standing = playerStandings.find((p) => p.name === playerName);

  const history = placements
    .filter((p) => p.players.includes(playerName))
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));

  const statsMap = await getPlayerEventStatsSummaries(playerName);
  const statsByEvent = Object.fromEntries(statsMap);
  // getPlayerSeasonStats is sourced from the separate, still BO7-only stats
  // pipeline (lib/statLeaderboards.ts) - only fetched for the Black Ops 7
  // view, so MW4 shows the tab's existing "no stats available" fallback
  // instead of a stale/mislabeled BO7 season stats box (PROJECT.md).
  const seasonStats = game === 'Black Ops 7' ? await getPlayerSeasonStats(playerName) : null;
  const logos = await getTeamLogos();
  const details = await getPlayerDetails(playerName);
  const recentMatches = await getPlayerMatches(playerName, 10, game);

  // Player page shows the full team prize for each event the player was on,
  // not their 25% split share - confirmed by user 2026-08-31, specifically
  // for player pages (talent-showcase framing: show the full amount they
  // were part of winning, not a divided personal cut). The underlying 25%
  // split rule (PROJECT.md §3 "Prize money") still applies wherever a
  // per-player payout actually needs computing - this display is separate.
  const totalEarnings = history.reduce((sum, h) => sum + h.prizeUsd, 0);
  const bestFinish = findBestFinish(history);

  // Three switchable trend series. Points is cumulative (matches how
  // standing.points itself is built - sum of every event's points, exposed
  // as a running total). K/D and Slayer Rating are each event's raw value,
  // not cumulative - a running sum of a ratio stat wouldn't mean anything -
  // and only include events that actually have player_event_stats data
  // (partial coverage, see PROJECT.md §7), so these two series are often
  // shorter than the full event history.
  const chronological = [...history].sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''));

  let cumulative = 0;
  const pointsSeries = chronological.map((h) => {
    cumulative += h.points;
    return { label: h.eventName, value: cumulative, formatted: cumulative.toLocaleString() };
  });

  const kdSeries = chronological
    .map((h) => statsByEvent[`${h.eventName}|${h.region}`]?.overallKd.value)
    .map((v, i) => (v != null ? { label: chronological[i].eventName, value: v, formatted: v.toFixed(2) } : null))
    .filter((p): p is { label: string; value: number; formatted: string } => p !== null);

  const slayerSeries = chronological
    .map((h) => statsByEvent[`${h.eventName}|${h.region}`]?.overallSlayerRating.value)
    .map((v, i) => (v != null ? { label: chronological[i].eventName, value: v, formatted: v.toFixed(2) } : null))
    .filter((p): p is { label: string; value: number; formatted: string } => p !== null);

  // A player with no record for THIS game (e.g. a BO7 player viewed with
  // ?game=mw4) isn't necessarily nonexistent - their bio/photo/socials
  // (`details`, fetched above) are the same person either way, so the hero
  // still renders below with a placeholder in place of the season content.
  // Only a player missing from EVERY game gets the "not found" treatment.
  const existsInThisGame = Boolean(standing);
  let existsInAnyGame = existsInThisGame;
  if (!existsInThisGame) {
    const otherGame = GAMES.find((g) => g.value !== game)!;
    const otherGamePlacements = await getEnrichedPlacements(otherGame.value);
    existsInAnyGame = otherGamePlacements.some((p) => p.players.includes(playerName));
  }

  if (!existsInAnyGame) {
    return (
      <main className="container">
        <p>Player &ldquo;{playerName}&rdquo; not found.</p>
        <Link href="/players">&larr; Back to player points</Link>
      </main>
    );
  }

  const isCdlPlayer = standing ? OFFICIAL_CDL_TEAMS.has(standing.currentTeam) : false;

  return (
    <main className="container">
      <Link className="back-link" href="/players">
        &larr; Back to player points
      </Link>
      {isCdlPlayer && <div className="cdl-banner">CDL Player</div>}
      <div className="entity-hero">
        <div className="player-hero-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="player-hero-photo"
            src={`/players/${details?.photoFilename || 'DefaultPlayer.png'}`}
            alt={playerName}
            width={220}
            height={220}
          />
        </div>
        <div className="entity-hero-body">
          <h1>{playerName}</h1>
          {(details?.fullName || details?.origin) && (
            <p className="entity-hero-meta">
              {[details?.fullName, details?.origin].filter(Boolean).join(' — ')}
            </p>
          )}
          {standing && (
            <div className="entity-hero-team">
              <TeamBadge name={standing.currentTeam} logoFilename={logos[standing.currentTeam]} />
            </div>
          )}
          {(details?.twitterUrl || details?.twitchUrl) && (
            <div className="entity-hero-links">
              {details?.twitterUrl && (
                <a href={details.twitterUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/x.svg" alt="" width={16} height={16} />
                  Twitter
                </a>
              )}
              {details?.twitchUrl && (
                <a href={details.twitchUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/twitch.svg" alt="" width={16} height={16} />
                  Twitch
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <GameFilterLinks basePath={`/players/${encodeURIComponent(playerName)}`} selected={game} />

      {!existsInThisGame && (
        <div className="card">
          <p className="note">No {gameInfo.label} record for this player yet.</p>
        </div>
      )}

      {existsInThisGame && standing && (
        <>
          <div className="stat-card-row">
            <div className="stat-card">
              <div className="stat-card-label">Season Points</div>
              <div className="stat-card-value">{standing.points.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Season Earnings</div>
              <div className="stat-card-value">{formatUsd(totalEarnings)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Best Finish</div>
              {bestFinish ? (
                <>
                  <div className="stat-card-value">
                    {formatPlacementOrdinal(bestFinish.placementMin, bestFinish.placementMax)}
                  </div>
                  <div className="stat-card-sub">
                    {bestFinish.eventName} ({bestFinish.teamName})
                  </div>
                </>
              ) : (
                <div className="stat-card-value">—</div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Season Trend</h2>
            <p className="note">Hover a point for details. K/D and Slayer Rating only cover events with stats data.</p>
            <TrendChart
              series={[
                { key: 'points', label: 'CDC Points', data: pointsSeries },
                { key: 'kd', label: 'K/D', data: kdSeries },
                { key: 'slayer', label: 'Slayer Rating', data: slayerSeries },
              ]}
            />
          </div>

          <div className="card">
            <PlayerStatsEventsTabs
              seasonStats={seasonStats}
              history={history}
              statsByEvent={statsByEvent}
              logos={logos}
              recentMatches={recentMatches}
            />
          </div>
        </>
      )}
    </main>
  );
}
