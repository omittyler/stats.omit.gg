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

type Logos = Record<string, string>;

function MatchCard({ match, logos, label }: { match: BracketMatch; logos: Logos; label?: string }) {
  const rows = [
    { name: match.team1Name, score: match.team1Score },
    { name: match.team2Name, score: match.team2Score },
  ];
  return (
    <div className="bracket-slot">
      {label && <div className="bracket-match-label">{label}</div>}
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

// A 4-team double-elim group, laid out like the official one: round 1 (the
// two openers, then the losers' match) and round 2 (the winners' match and
// the decider - both "Qualification Match").
function GroupBracket({ group, logos }: { group: Group; logos: Logos }) {
  const { upper, lower } = group.bracket;
  return (
    <div className="card bracket-group">
      <h3>{group.name}</h3>
      <div className="bracket">
        <Column label="Round 1">
          {(upper[0] ?? []).map((m) => (
            <MatchCard key={m.seriesLabel} match={m} logos={logos} />
          ))}
          {(lower[0] ?? []).map((m) => (
            <MatchCard key={m.seriesLabel} match={m} logos={logos} label="Losers' Bracket" />
          ))}
        </Column>
        <Column label="Round 2">
          {[...(upper[1] ?? []), ...(lower[1] ?? [])].map((m) => (
            <MatchCard key={m.seriesLabel} match={m} logos={logos} label="Qualification Match" />
          ))}
        </Column>
      </div>
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

      {groups.length > 0 && (
        <>
          <h2>Group Stage</h2>
          <div className="bracket-groups">
            {groups.map((g) => (
              <GroupBracket key={g.name} group={g} logos={logos} />
            ))}
          </div>
          <h2>Bracket Stage</h2>
        </>
      )}

      <div className="card bracket-card">
        <div className="bracket-side">
          <h3>Winners Bracket</h3>
          <div className="bracket">
            {playoffs.upper.map((round, i) => (
              <Column key={i} label={roundLabel('Winners', i, playoffs.upper.length)}>
                {round.map((m) => (
                  <MatchCard key={m.seriesLabel} match={m} logos={logos} />
                ))}
              </Column>
            ))}
            {playoffs.grandFinal.map((m, i) => (
              <Column key={m.seriesLabel} label={i === 0 ? 'Grand Final' : 'Bracket Reset'}>
                <MatchCard match={m} logos={logos} />
              </Column>
            ))}
          </div>
        </div>
        <div className="bracket-side">
          <h3>Losers Bracket</h3>
          <div className="bracket">
            {playoffs.lower.map((round, i) => (
              <Column key={i} label={roundLabel('Losers', i, playoffs.lower.length)}>
                {round.map((m) => (
                  <MatchCard key={m.seriesLabel} match={m} logos={logos} />
                ))}
              </Column>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
