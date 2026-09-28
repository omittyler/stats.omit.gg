import Link from 'next/link';
import { getEventDetail, eventHref } from '@/lib/events';
import { buildEventBracket, type BracketMatch, type Group } from '@/lib/bracket';
import { getTeamLogos } from '@/lib/standings';
import { getEventLogo } from '@/lib/matches';
import { formatEventNameForEventsList } from '@/lib/format';
import { parseGameSlug } from '@/lib/season';
import { BracketConnectors } from '@/components/BracketConnectors';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ game?: string; region?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const eventName = decodeURIComponent((await params).name);
  const { region } = await searchParams;
  return { title: `${formatEventNameForEventsList(eventName)}${region ? ` ${region}` : ''} Bracket — stats.omit.gg` };
}

type Logos = Record<string, string>;

function MatchCard({ match, logos }: { match: BracketMatch; logos: Logos }) {
  const rows = [
    { name: match.team1Name, score: match.team1Score },
    { name: match.team2Name, score: match.team2Score },
  ];
  return (
    <div className="bracket-slot" data-series={match.seriesLabel}>
      <Link href={`/matches/${encodeURIComponent(match.seriesLabel)}`} className="bracket-match">
        {rows.map((r) => (
          <div key={r.name} className={`bracket-team${match.winner === r.name ? ' bracket-team-win' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/teams/${logos[r.name] ?? 'Default.png'}`} alt="" width={18} height={18} />
            <span className="bracket-team-name">{r.name}</span>
            <span className="bracket-team-score">{r.score}</span>
          </div>
        ))}
      </Link>
    </div>
  );
}

function Column({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bracket-round">
      <div className="bracket-round-label">{label}</div>
      <div className="bracket-round-matches">{children}</div>
    </div>
  );
}

function roundLabel(side: 'Winners' | 'Losers', index: number, total: number) {
  return index === total - 1 ? `${side} Final` : `${side} Round ${index + 1}`;
}

function GroupCard({ group, logos }: { group: Group; logos: Logos }) {
  return (
    <div className="card bracket-group">
      <h3>{group.name}</h3>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th style={{ textAlign: 'right' }}>Series</th>
            <th style={{ textAlign: 'right' }}>Maps</th>
          </tr>
        </thead>
        <tbody>
          {group.standings.map((s) => (
            <tr key={s.teamName}>
              <td>
                <Link href={`/teams/${encodeURIComponent(s.teamName)}`} className="match-opponent" title={s.teamName}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/teams/${logos[s.teamName] ?? 'Default.png'}`} alt="" width={18} height={18} />
                  {s.teamName}
                </Link>
              </td>
              <td style={{ textAlign: 'right' }}>
                {s.seriesWon}-{s.seriesLost}
              </td>
              <td style={{ textAlign: 'right' }}>
                {s.mapsWon}-{s.mapsLost}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function EventBracketPage({ params, searchParams }: Props) {
  const eventName = decodeURIComponent((await params).name);
  const { game: slug, region = '' } = await searchParams;
  const game = parseGameSlug(slug);

  const [event, logos] = await Promise.all([getEventDetail(eventName, region, game), getTeamLogos()]);
  const bracket = event ? buildEventBracket(event, event.matches) : null;

  if (!event || !bracket) {
    return (
      <main className="container">
        <p>No bracket is available for this event.</p>
        <Link href={event ? eventHref(event, game) : '/events'}>&larr; Back</Link>
      </main>
    );
  }

  const { groups, playoffs } = bracket;
  const eventLogo = getEventLogo(event.eventName);

  // One grid like the official bracket: winners rounds on top, losers rounds
  // below, the Winners Final in the same column as the Losers Final, and the
  // Grand Final alone in the last column on the right.
  const lowerCols = Math.max(playoffs.lower.length, playoffs.upper.length);
  const upperCol = (i: number) => (i === playoffs.upper.length - 1 ? lowerCols : i + 1);

  return (
    <main className="container container-wide">
      <p>
        <Link href={eventHref(event, game)}>&larr; Back to event</Link>
      </p>
      <div className="page-hero event-hero">
        {eventLogo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="event-hero-logo" src={`/events/${eventLogo}`} alt="" />
        )}
        <div>
          <h1>
            {formatEventNameForEventsList(event.eventName)} Bracket
            {event.region && <span className="region-tag">{event.region}</span>}
          </h1>
          <p className="note">Click any match for its full map-by-map stats.</p>
        </div>
      </div>

      {groups.length > 0 && (
        <>
          <h2>Group Stage</h2>
          <div className="bracket-groups" style={{ '--group-count': groups.length } as React.CSSProperties}>
            {groups.map((g) => (
              <GroupCard key={g.name} group={g} logos={logos} />
            ))}
          </div>
          <h2>Bracket Stage</h2>
        </>
      )}

      <div className="card bracket-card">
        <div className="bracket-grid" style={{ '--bracket-cols': lowerCols + playoffs.grandFinal.length } as React.CSSProperties}>
          <BracketConnectors edges={playoffs.edges} />
          {playoffs.upper.map((round, i) => (
            <div key={`u${i}`} className="bracket-cell" style={{ gridColumn: upperCol(i), gridRow: 1 }}>
              <Column label={roundLabel('Winners', i, playoffs.upper.length)}>
                {round.map((m) => (
                  <MatchCard key={m.seriesLabel} match={m} logos={logos} />
                ))}
              </Column>
            </div>
          ))}
          {playoffs.lower.map((round, i) => (
            <div key={`l${i}`} className="bracket-cell" style={{ gridColumn: i + 1, gridRow: 2 }}>
              <Column label={roundLabel('Losers', i, playoffs.lower.length)}>
                {round.map((m) => (
                  <MatchCard key={m.seriesLabel} match={m} logos={logos} />
                ))}
              </Column>
            </div>
          ))}
          {playoffs.grandFinal.map((m, i) => (
            <div
              key={m.seriesLabel}
              className="bracket-cell bracket-cell-final"
              style={{ gridColumn: lowerCols + i + 1, gridRow: '1 / span 2' }}
            >
              <Column label={i === 0 ? 'Grand Final' : 'Bracket Reset'}>
                <MatchCard match={m} logos={logos} />
              </Column>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
