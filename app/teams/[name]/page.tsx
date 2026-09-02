import Link from 'next/link';
import { getEnrichedPlacements, computeStandings, getAllPlayerDetails, getTeamLogos } from '@/lib/standings';
import { supabase } from '@/lib/supabase';
import { formatPlacementOrdinal, formatUsd, findBestFinish } from '@/lib/format';
import { FlagIcon } from '@/components/FlagIcon';
import { TrendChart } from '@/components/TrendChart';
import { OFFICIAL_CDL_TEAMS } from '@/lib/officialCdlTeams';
import { getTeamMatches, getEventLogo } from '@/lib/matches';

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

  // "Current roster" is every player whose OWN individually-computed current
  // team (playerStandings - most recent event OR roster move, see §8r) is
  // this team, full stop - not anchored to this team's own last event
  // roster. That anchor used to be necessary to catch stale rosters (an org
  // that stopped submitting while its players moved on), but it also had a
  // blind spot: a player signed here purely via an off-season roster move
  // (no shared event yet) would never appear, since they were never on any
  // roster this team's own history recorded. Filtering playerStandings
  // directly handles both cases at once. previousPlayers stays anchored to
  // this team's real event history, since "previously on this roster" is
  // inherently about events that actually happened.
  // rosterStale excludes a player whose own last event/roster-move predates a
  // LATER event this team went on to play without them - see PlayerStanding.
  // rosterStale and the computeStandings note it points to (added 2026-09-01
  // after OMiT Brooklyn kept showing Wrecks/Standy as current despite Champs'
  // later roster being Diamondcon/Gwinn instead).
  const currentRoster = playerStandings
    .filter((ps) => ps.currentTeam === teamName && !ps.rosterStale)
    .map((ps) => ps.name);
  const previousPlayers = [...new Set(history.flatMap((h) => h.players))].filter(
    (p) => !currentRoster.includes(p)
  );

  const totalPrize = history.reduce((sum, h) => sum + h.prizeUsd, 0);
  const bestFinish = findBestFinish(history);
  const playerDetails = await getAllPlayerDetails();
  const teamLogos = await getTeamLogos();

  // Grouped by event, newest event first, matching the reference layout the
  // user provided 2026-09-02 - only events with real match-map data show up
  // here at all (a strict subset of `history` above, see PROJECT.md §8ag for
  // why coverage is partial).
  const matches = await getTeamMatches(teamName);
  const matchesByEvent = new Map<string, typeof matches>();
  for (const m of matches) {
    if (!matchesByEvent.has(m.eventName)) matchesByEvent.set(m.eventName, []);
    matchesByEvent.get(m.eventName)!.push(m);
  }

  // Placement per event, chronological - NOT cumulative (a placement isn't
  // something that accumulates). TrendChart always plots higher value as
  // higher on the chart, but a lower placement number is the better result,
  // so this inverts against the worst placement actually seen (1st place
  // becomes the highest plotted value, worst becomes 1) - the real placement
  // text (e.g. "5th-6th") still shows via `formatted`, this inverted number
  // is display-only.
  const chronologicalHistory = [...history].sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''));
  const worstPlacement = Math.max(...chronologicalHistory.map((h) => h.placementMin), 1);
  const placementSeries = chronologicalHistory.map((h) => ({
    label: h.eventName,
    value: worstPlacement + 1 - h.placementMin,
    formatted: formatPlacementOrdinal(h.placementMin, h.placementMax),
  }));

  return (
    <main className="container">
      <Link className="back-link" href="/standings">
        &larr; Back to standings
      </Link>
      {OFFICIAL_CDL_TEAMS.has(teamName) && <div className="cdl-banner">CDL Team</div>}
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
        <p className="note">This org&apos;s placement at each event this season. Hover a point for details.</p>
        <TrendChart series={[{ key: 'placement', label: 'Placement', data: placementSeries }]} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Current Roster</h2>
        {currentRoster.length ? (
          <div className="roster-grid">
            {currentRoster.map((p) => {
              const d = playerDetails.get(p.toLowerCase());
              return (
                <div key={p} className="roster-card">
                  <Link href={`/players/${encodeURIComponent(p)}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/players/${d?.photoFilename || 'DefaultPlayer.png'}`}
                      alt={p}
                      width={72}
                      height={72}
                      className="roster-card-photo"
                    />
                    <div className="roster-card-gamertag">{p}</div>
                  </Link>
                  {d?.fullName && <div className="roster-card-name">{d.fullName}</div>}
                  {d?.origin && (
                    <div className="roster-card-origin">
                      <FlagIcon origin={d.origin} />
                      {d.origin}
                    </div>
                  )}
                  {(d?.twitterUrl || d?.twitchUrl) && (
                    <div className="roster-card-links">
                      {d?.twitterUrl && (
                        <a href={d.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter/X">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/icons/x.svg" alt="" width={18} height={18} />
                        </a>
                      )}
                      {d?.twitchUrl && (
                        <a href={d.twitchUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitch">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/icons/twitch.svg" alt="" width={18} height={18} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

      {matchesByEvent.size > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Matches</h2>
          {[...matchesByEvent.entries()].map(([eventName, eventMatches]) => {
            const eventLogo = getEventLogo(eventName);
            return (
            <div key={eventName} className="match-event-group">
              <h3 className="match-event-group-title">
                {eventLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="event-logo" src={`/events/${eventLogo}`} alt={eventName} />
                ) : (
                  eventName
                )}
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {eventMatches.map((m) => (
                    <tr key={m.seriesLabel}>
                      <td>
                        <Link href={`/teams/${encodeURIComponent(m.opponent)}`} className="match-opponent">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/teams/${teamLogos[m.opponent] ?? 'Default.png'}`} alt="" width={20} height={20} />
                          {m.opponent}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/matches/${encodeURIComponent(m.seriesLabel)}`} className={m.mapsWon > m.mapsLost ? 'match-result-win' : 'match-result-loss'}>
                          {m.mapsWon > m.mapsLost ? 'W' : 'L'} {m.mapsWon} - {m.mapsLost}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
