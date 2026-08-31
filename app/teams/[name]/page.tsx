import Link from 'next/link';
import { getEnrichedPlacements, computeStandings } from '@/lib/standings';
import { supabase } from '@/lib/supabase';
import { formatPlacementOrdinal, formatUsd, findBestFinish } from '@/lib/format';
import { TrendChart } from '@/components/TrendChart';

export const dynamic = 'force-dynamic';

function formatPlacement(min: number, max: number) {
  return min === max ? `${min}` : `${min}-${max}`;
}

function formatPrize(prizeUsd: number) {
  return prizeUsd > 0 ? formatUsd(prizeUsd) : '-';
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const teamName = decodeURIComponent(rawName);
  const { teamStandings } = await computeStandings();
  const standing = teamStandings.find((t) => t.name === teamName);
  if (!standing) return { title: `${teamName} — stats.omit.gg` };
  return {
    title: `${teamName} — stats.omit.gg`,
    description: `${teamName} — ${standing.points.toLocaleString()} CDC points this Black Ops 7 (BO7) season.`,
  };
}

export default async function TeamPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const teamName = decodeURIComponent(rawName);

  const placements = await getEnrichedPlacements();
  const { teamStandings, playerStandings } = await computeStandings(placements);
  const standing = teamStandings.find((t) => t.name === teamName);

  const history = placements
    .filter((p) => p.teamName === teamName)
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));

  // Rely on the already-filtered `history` (AP/LATAM and ad-hoc "Team <handle>"
  // squads excluded in getEnrichedPlacements) rather than a raw `teams` table
  // lookup - otherwise someone navigating straight to an excluded team's URL
  // would still find a DB row and see a page with an empty roster/events
  // instead of "not found".
  if (!history.length) {
    return (
      <main className="container">
        <p>Team &ldquo;{teamName}&rdquo; not found.</p>
        <Link href="/standings">&larr; Back to standings</Link>
      </main>
    );
  }

  const { data: teamRow } = await supabase
    .from('teams')
    .select('name, logo_filename')
    .eq('name', teamName)
    .maybeSingle();

  // "Current roster" starts from THIS team's own most recent event's roster -
  // not just "whoever's own most-recent event happened to be with this team"
  // (that grouping, used for the team's points total, can include a player who
  // hasn't actually played the team's latest event if their own last appearance
  // predates it - confirmed 2026-08-30). But that alone isn't enough either: if
  // this org simply hasn't submitted a roster in a while, its "latest" roster
  // can be stale - a player on it may have since moved to a genuinely newer
  // team elsewhere. So each candidate is cross-checked against their OWN
  // individually-computed current team (playerStandings, which already
  // reflects their truly most recent appearance anywhere); anyone who's moved
  // on drops into Previous Players instead. Confirmed 2026-08-31. An org whose
  // entire last roster has since moved elsewhere correctly ends up with no
  // current roster at all.
  const latestRosterCandidates = history[0]?.players ?? [];
  const currentRoster = latestRosterCandidates.filter(
    (p) => playerStandings.find((ps) => ps.name === p)?.currentTeam === teamName
  );
  const previousPlayers = [
    ...new Set([...history.slice(1).flatMap((h) => h.players), ...latestRosterCandidates]),
  ].filter((p) => !currentRoster.includes(p));

  const totalPrize = history.reduce((sum, h) => sum + h.prizeUsd, 0);
  const bestFinish = findBestFinish(history);

  // This org's own points at each of its own results, not the "sum of
  // current roster" headline stat above (those two numbers can genuinely
  // differ when the roster has changed - see the Current Roster note below).
  let cumulative = 0;
  const trendData = [...history]
    .sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''))
    .map((h) => {
      cumulative += h.points;
      return { label: h.eventName, value: cumulative };
    });

  return (
    <main className="container">
      <Link className="back-link" href="/standings">
        &larr; Back to standings
      </Link>
      <div className="entity-hero">
        <div className="team-hero-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="team-hero-logo"
            src={`/teams/${teamRow?.logo_filename ?? 'Default.png'}`}
            alt={teamName}
          />
        </div>
        <div className="entity-hero-body">
          <h1>{teamName}</h1>
          <p className="entity-hero-meta">
            Competed in {history.length} event{history.length === 1 ? '' : 's'} this season
          </p>
        </div>
      </div>

      <div className="stat-card-row">
        <div className="stat-card">
          <div className="stat-card-label">Season Points</div>
          <div className="stat-card-value">{(standing?.points ?? 0).toLocaleString()}</div>
          <div className="stat-card-sub">Sum of current roster</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Season Prize Earnings</div>
          <div className="stat-card-value">{formatUsd(totalPrize)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Best Finish</div>
          {bestFinish ? (
            <>
              <div className="stat-card-value">
                {formatPlacementOrdinal(bestFinish.placementMin, bestFinish.placementMax)}
              </div>
              <div className="stat-card-sub">{bestFinish.eventName}</div>
            </>
          ) : (
            <div className="stat-card-value">—</div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Season Trend</h2>
        <p className="note">
          Cumulative CDC points earned by this org&apos;s own results across the season (not the
          current-roster sum above). Hover a point for details.
        </p>
        <TrendChart data={trendData} />
        {trendData.length > 1 && (
          <div className="trend-summary">
            <span>{trendData[0].label}</span>
            <span>{trendData[trendData.length - 1].label}</span>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Current Roster</h2>
        {currentRoster.length ? (
          <ul>
            {currentRoster.map((p) => (
              <li key={p}>
                <Link href={`/players/${encodeURIComponent(p)}`}>{p}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="note">No current roster on record.</p>
        )}

        {previousPlayers.length > 0 && (
          <>
            <h2>Previous Players</h2>
            <ul>
              {previousPlayers.map((p) => (
                <li key={p}>
                  <Link href={`/players/${encodeURIComponent(p)}`}>{p}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Events</h2>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Placement</th>
              <th>Prize</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td>{h.eventName}</td>
                <td>{formatPlacement(h.placementMin, h.placementMax)}</td>
                <td>{formatPrize(h.prizeUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
