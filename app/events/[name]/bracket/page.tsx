import Link from 'next/link';
import { getEventDetail, eventHref } from '@/lib/events';
import { buildEventBracket, type BracketMatch, type Group } from '@/lib/bracket';
import { getTeamLogos } from '@/lib/standings';
import { formatEventNameForEventsList } from '@/lib/format';
import { parseGameSlug } from '@/lib/season';

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

function MatchCard({ match, logos }: { match: BracketMatch; logos: Record<string, string> }) {
  const rows = [
    { name: match.team1Name, score: match.team1Score },
    { name: match.team2Name, score: match.team2Score },
  ];
  return (
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
  );
}

function roundLabel(side: 'Upper' | 'Lower', index: number, total: number) {
  if (index === total - 1) return `${side} Final`;
  if (index === total - 2) return side === 'Upper' ? 'Upper Semifinals' : 'Lower Semifinal';
  if (side === 'Upper' && index === total - 3) return 'Upper Quarterfinals';
  return `${side} Round ${index + 1}`;
}

function BracketSide({
  title,
  side,
  rounds,
  logos,
}: {
  title: string;
  side: 'Upper' | 'Lower';
  rounds: BracketMatch[][];
  logos: Record<string, string>;
}) {
  return (
    <div className="bracket-side">
      <h3>{title}</h3>
      <div className="bracket">
        {rounds.map((round, i) => (
          <div key={i} className="bracket-round">
            <div className="bracket-round-label">{roundLabel(side, i, rounds.length)}</div>
            <div className="bracket-round-matches">
              {round.map((m) => (
                <MatchCard key={m.seriesLabel} match={m} logos={logos} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group, logos }: { group: Group; logos: Record<string, string> }) {
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
                <Link href={`/teams/${encodeURIComponent(s.teamName)}`} className="match-opponent">
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

  if (!event) {
    return (
      <main className="container">
        <p>Event not found.</p>
        <Link href="/events">&larr; All events</Link>
      </main>
    );
  }

  const { groups, playoffs } = buildEventBracket(event.eventType, event.matches);

  return (
    <main className="container container-wide">
      <p>
        <Link href={eventHref(event, game)}>&larr; Back to event</Link>
      </p>
      <div className="page-hero">
        <h1>
          {formatEventNameForEventsList(event.eventName)} Bracket
          {event.region && <span className="region-tag"> {event.region}</span>}
        </h1>
        <p className="note">Click any match for its full map-by-map stats.</p>
      </div>

      {!playoffs && <p className="note">No matches were tracked for this event, so there&apos;s no bracket to show.</p>}

      {groups.length > 0 && (
        <>
          <h2>Group Stage</h2>
          <div className="bracket-groups">
            {groups.map((g) => (
              <GroupCard key={g.name} group={g} logos={logos} />
            ))}
          </div>
        </>
      )}

      {playoffs && !playoffs.complete && (
        <div className="card">
          <p className="note" style={{ margin: 0 }}>
            The {event.matchCount} tracked {groups.length > 0 ? 'playoff ' : ''}matches for this event don&apos;t add up
            to a complete bracket (some series weren&apos;t tracked or don&apos;t line up), so it can&apos;t be drawn
            without guessing. The tracked matches are listed on the{' '}
            <Link href={eventHref(event, game)}>event page</Link>.
          </p>
        </div>
      )}

      {playoffs?.complete && (
        <>
          {groups.length > 0 && <h2>Playoffs</h2>}
          <div className="card bracket-card">
            <BracketSide title="Upper Bracket" side="Upper" rounds={playoffs.upper} logos={logos} />
            <BracketSide title="Lower Bracket" side="Lower" rounds={playoffs.lower} logos={logos} />
            <div className="bracket-side">
              <h3>Grand Final</h3>
              <div className="bracket">
                {playoffs.grandFinal.map((m, i) => (
                  <div key={m.seriesLabel} className="bracket-round">
                    <div className="bracket-round-label">{i === 0 ? 'Grand Final' : 'Bracket Reset'}</div>
                    <div className="bracket-round-matches">
                      <MatchCard match={m} logos={logos} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
