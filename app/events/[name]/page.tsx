import Link from 'next/link';
import { getEventDetail } from '@/lib/events';
import { getEventLogo } from '@/lib/matches';
import { getTeamLogos } from '@/lib/standings';
import { formatEventNameForEventsList, formatFullDate, formatPlacementOrdinal, formatUsd } from '@/lib/format';
import { parseGameSlug } from '@/lib/season';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ game?: string; region?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const eventName = decodeURIComponent((await params).name);
  const { region } = await searchParams;
  const label = formatEventNameForEventsList(eventName);
  return {
    title: `${label}${region ? ` ${region}` : ''} — stats.omit.gg`,
    description: `Full results and matches for ${label}${region ? ` (${region})` : ''}.`,
  };
}

function TeamLink({ name, logo }: { name: string; logo: string }) {
  return (
    <Link href={`/teams/${encodeURIComponent(name)}`} className="match-opponent">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/teams/${logo}`} alt="" width={20} height={20} />
      {name}
    </Link>
  );
}

export default async function EventPage({ params, searchParams }: Props) {
  const eventName = decodeURIComponent((await params).name);
  const { game: slug, region = '' } = await searchParams;
  const game = parseGameSlug(slug);

  const [event, logos] = await Promise.all([getEventDetail(eventName, region, game), getTeamLogos()]);

  if (!event) {
    return (
      <main className="container">
        <p>Event not found.</p>
        <Link href="/events">&larr; All events</Link>
      </main>
    );
  }

  const eventLogo = getEventLogo(event.eventName);
  const logoFor = (team: string) => logos[team] ?? 'Default.png';
  const matches = [...event.matches].sort((a, b) => a.seriesLabel.localeCompare(b.seriesLabel));

  return (
    <main className="container container-wide">
      <p>
        <Link href={slug ? `/events?game=${encodeURIComponent(slug)}` : '/events'}>&larr; All events</Link>
      </p>
      <div className="page-hero event-hero">
        {eventLogo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="event-hero-logo" src={`/events/${eventLogo}`} alt="" />
        )}
        <div>
          <h1>
            {formatEventNameForEventsList(event.eventName)}
            {event.region && <span className="region-tag">{event.region}</span>}
          </h1>
          <p className="note">
            {event.eventType} · {event.eventDate ? formatFullDate(event.eventDate) : 'Date unknown'}
          </p>
        </div>
      </div>

      <div className="stat-card-row stat-card-row-4">
        <div className="stat-card">
          <div className="stat-card-label">Winner</div>
          <div className="stat-card-value">{event.winner ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Teams</div>
          <div className="stat-card-value">{event.teamCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Matches Tracked</div>
          <div className="stat-card-value">{event.matchCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Prize Money Tracked</div>
          <div className="stat-card-value">{formatUsd(event.totalPrize)}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Results</h2>
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Place</th>
              <th>Team</th>
              <th>Roster</th>
              <th style={{ textAlign: 'right' }}>Points</th>
              <th style={{ textAlign: 'right' }}>Prize</th>
            </tr>
          </thead>
          <tbody>
            {event.placements.map((p) => (
              <tr key={`${p.teamName}|${p.placementMin}`}>
                <td>{formatPlacementOrdinal(p.placementMin, p.placementMax)}</td>
                <td>
                  <TeamLink name={p.teamName} logo={logoFor(p.teamName)} />
                </td>
                <td>
                  {p.players.map((player, i) => (
                    <span key={player}>
                      {i > 0 && ', '}
                      <Link href={`/players/${encodeURIComponent(player)}`}>{player}</Link>
                    </span>
                  ))}
                </td>
                <td style={{ textAlign: 'right' }}>{p.points.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>{p.prizeUsd > 0 ? formatUsd(p.prizeUsd) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {matches.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Matches</h2>
          <table className="event-matches-table">
            <tbody>
              {matches.map((m) => {
                const team1Won = m.team1Score > m.team2Score;
                const team2Won = m.team2Score > m.team1Score;
                return (
                  <tr key={m.seriesLabel}>
                    <td className={team1Won ? 'event-match-winner' : ''}>
                      <TeamLink name={m.team1Name} logo={logoFor(m.team1Name)} />
                    </td>
                    <td className="event-match-score">
                      <Link href={`/matches/${encodeURIComponent(m.seriesLabel)}`}>
                        {m.team1Score} - {m.team2Score}
                      </Link>
                    </td>
                    <td className={team2Won ? 'event-match-winner' : ''} style={{ textAlign: 'right' }}>
                      <TeamLink name={m.team2Name} logo={logoFor(m.team2Name)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
